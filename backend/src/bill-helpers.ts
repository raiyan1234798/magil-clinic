import type { PrismaClient } from '@prisma/client';

export type BillItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  medicineId?: string;
  medicineStock?: number;
};

export type CreateBillInput = {
  patientId?: string | null;
  walkInName?: string | null;
  walkInPhone?: string | null;
  isAnonymous?: boolean;
  type: string;
  items: BillItemInput[];
  paymentMethod?: string;
  gstEnabled?: boolean;
  gstRate?: number;
  discountPercent?: number;
};

export function calculateBillAmounts(
  items: { quantity: number; unitPrice: number }[],
  discountPercent = 0,
  gstEnabled = false,
  gstRate = 0,
) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxable = subtotal - discountAmount;
  const gstAmount = gstEnabled ? taxable * (gstRate / 100) : 0;
  const total = taxable + gstAmount;
  return { subtotal, discountPercent, discountAmount, gstAmount, total };
}

export async function createBill(
  prisma: PrismaClient,
  input: CreateBillInput,
  settings: { gstEnabled: boolean; gstRate: number; clinicName?: string },
) {
  const {
    patientId,
    walkInName,
    walkInPhone,
    isAnonymous,
    type,
    items,
    paymentMethod,
    gstEnabled,
    gstRate,
    discountPercent,
  } = input;

  if (!items.length) throw new Error('At least one line item is required');

  const anonymous = Boolean(isAnonymous);
  if (!anonymous && !patientId && !walkInName?.trim()) {
    throw new Error('Patient or walk-in name is required');
  }

  const enabled = gstEnabled !== undefined ? Boolean(gstEnabled) : settings.gstEnabled;
  const rate = gstRate !== undefined ? parseFloat(String(gstRate)) : settings.gstRate;
  const discount = discountPercent !== undefined ? parseFloat(String(discountPercent)) : 0;

  const processedItems: BillItemInput[] = [];
  for (const item of items) {
    const quantity = parseInt(String(item.quantity), 10);
    const unitPrice = parseFloat(String(item.unitPrice));
    if (!quantity || quantity < 1) throw new Error('Invalid item quantity');
    if (isNaN(unitPrice) || unitPrice < 0) throw new Error('Invalid item price');

    let description = item.description?.trim() || '';
    let medicineId = item.medicineId;

    if (type === 'PHARMACY') {
      if (!medicineId) throw new Error('Medicine is required for pharmacy line items');
      const medicine = await prisma.medicine.findUnique({ where: { id: medicineId } });
      if (!medicine) throw new Error('Medicine not found');
      if (medicine.stock < quantity) throw new Error(`Insufficient stock for ${medicine.name}`);
      description = medicine.name;
      processedItems.push({
        description,
        quantity,
        unitPrice: unitPrice || medicine.price,
        medicineId,
        medicineStock: medicine.stock,
      });
    } else {
      if (!description) throw new Error('Description is required');
      processedItems.push({ description, quantity, unitPrice, medicineId });
    }
  }

  const amounts = calculateBillAmounts(processedItems, discount, enabled, rate);
  const count = await prisma.bill.count();
  const billNumber = `INV-2026-${(count + 1).toString().padStart(3, '0')}`;

  const billData = {
    billNumber,
    patientId: patientId || null,
    walkInName: walkInName?.trim() || null,
    walkInPhone: walkInPhone?.trim() || null,
    isAnonymous: anonymous,
    type,
    subtotal: amounts.subtotal,
    discountPercent: discount,
    discountAmount: amounts.discountAmount,
    gstEnabled: enabled,
    gstRate: rate,
    gstAmount: amounts.gstAmount,
    total: amounts.total,
    paidAmount: amounts.total,
    paymentStatus: 'PAID',
    paymentMethod,
    items: {
      create: processedItems.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.unitPrice * i.quantity,
        medicineId: i.medicineId || null,
      })),
    },
  };

  // Sequential writes — D1 does not support Prisma transactions (interactive or batch).
  const created = await prisma.bill.create({
    data: billData,
    include: { patient: true, items: { include: { medicine: true } } },
  });

  try {
    if (type === 'PHARMACY') {
      for (const item of processedItems) {
        if (!item.medicineId || item.medicineStock === undefined) continue;
        await prisma.medicine.update({
          where: { id: item.medicineId },
          data: { stock: Math.max(0, item.medicineStock - item.quantity) },
        });
        await prisma.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            type: 'STOCK_OUT',
            quantity: item.quantity,
            notes: `Bill ${billNumber}`,
          },
        });
      }
    }

    await prisma.income.create({
      data: { source: type, description: `Bill ${billNumber}`, amount: amounts.total },
    });
  } catch (err) {
    await prisma.bill.delete({ where: { id: created.id } }).catch(() => {});
    throw err;
  }

  const bill = created;

  return {
    ...bill,
    clinic: {
      name: settings.clinicName || 'Magil Clinic',
      address: 'Magil Clinic Management System',
      phone: '+91 9876543210',
      gstin: 'GSTIN-MAGIL-2026',
    },
  };
}
