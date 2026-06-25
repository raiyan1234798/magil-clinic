import type { PrismaClient } from '@prisma/client';

export type BillItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  medicineId?: string;
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
      processedItems.push({ description, quantity, unitPrice: unitPrice || medicine.price, medicineId });
    } else {
      if (!description) throw new Error('Description is required');
      processedItems.push({ description, quantity, unitPrice, medicineId });
    }
  }

  const amounts = calculateBillAmounts(processedItems, discount, enabled, rate);
  const count = await prisma.bill.count();
  const billNumber = `INV-2026-${(count + 1).toString().padStart(3, '0')}`;

  const bill = await prisma.$transaction(async (tx) => {
    const created = await tx.bill.create({
      data: {
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
      },
      include: { patient: true, items: { include: { medicine: true } } },
    });

    if (type === 'PHARMACY') {
      for (const item of processedItems) {
        if (!item.medicineId) continue;
        const medicine = await tx.medicine.findUnique({ where: { id: item.medicineId } });
        if (!medicine) continue;
        await tx.medicine.update({
          where: { id: item.medicineId },
          data: { stock: Math.max(0, medicine.stock - item.quantity) },
        });
        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            type: 'STOCK_OUT',
            quantity: item.quantity,
            notes: `Bill ${billNumber}`,
          },
        });
      }
    }

    await tx.income.create({
      data: { source: type, description: `Bill ${billNumber}`, amount: amounts.total },
    });

    return created;
  });

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
