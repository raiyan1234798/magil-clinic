const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.billItem.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.pharmacySale.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorLeave.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.patientDocument.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const password = await bcrypt.hash('admin123', 10);

  const departments = await Promise.all([
    prisma.department.create({ data: { name: 'Administration', description: 'Clinic administration' } }),
    prisma.department.create({ data: { name: 'Medical', description: 'Doctors and nurses' } }),
    prisma.department.create({ data: { name: 'Pharmacy', description: 'Pharmacy staff' } }),
    prisma.department.create({ data: { name: 'Finance', description: 'Finance and billing' } }),
  ]);

  await prisma.user.createMany({
    data: [
      { email: 'admin@magilclinic.com', password, name: 'Dr. Admin', role: 'DOCTOR_ADMIN', phone: '+91 9876543210', departmentId: departments[0].id, salary: 150000 },
      { email: 'nurse@magilclinic.com', password, name: 'Priya Sharma', role: 'NURSE_RECEPTIONIST', phone: '+91 9876543211', departmentId: departments[1].id, salary: 45000 },
      { email: 'pharmacist@magilclinic.com', password, name: 'Raj Kumar', role: 'PHARMACIST', phone: '+91 9876543212', departmentId: departments[2].id, salary: 50000 },
      { email: 'finance@magilclinic.com', password, name: 'Anita Desai', role: 'FINANCE_MANAGER', phone: '+91 9876543213', departmentId: departments[3].id, salary: 60000 },
    ],
  });

  const doctors = await Promise.all([
    prisma.doctor.create({ data: { doctorId: 'DOC-001', name: 'Dr. Ramesh Patel', specialization: 'General Physician', phone: '+91 9000000001', email: 'ramesh@magilclinic.com', consultationFee: 500, availability: 'AVAILABLE' } }),
    prisma.doctor.create({ data: { doctorId: 'DOC-002', name: 'Dr. Sunita Verma', specialization: 'Pediatrics', phone: '+91 9000000002', email: 'sunita@magilclinic.com', consultationFee: 600, availability: 'AVAILABLE' } }),
    prisma.doctor.create({ data: { doctorId: 'DOC-003', name: 'Dr. Arjun Mehta', specialization: 'Cardiology', phone: '+91 9000000003', email: 'arjun@magilclinic.com', consultationFee: 800, availability: 'BUSY' } }),
  ]);

  const patients = await Promise.all([
    prisma.patient.create({ data: { patientId: 'MAG-0001', name: 'Amit Singh', gender: 'male', age: 35, phoneNumber: '+91 9111111111', email: 'amit@email.com', bloodGroup: 'B+', address: '12 MG Road, Mumbai', emergencyContact: 'Sunita Singh - +91 9111111112', medicalNotes: 'No known allergies' } }),
    prisma.patient.create({ data: { patientId: 'MAG-0002', name: 'Neha Gupta', gender: 'female', age: 28, phoneNumber: '+91 9222222222', email: 'neha@email.com', bloodGroup: 'O+', address: '45 Park Street, Delhi', emergencyContact: 'Ravi Gupta - +91 9222222223' } }),
    prisma.patient.create({ data: { patientId: 'MAG-0003', name: 'Vikram Rao', gender: 'male', age: 52, phoneNumber: '+91 9333333333', bloodGroup: 'A+', address: '78 Brigade Road, Bangalore', medicalNotes: 'Hypertension, on medication' } }),
    prisma.patient.create({ data: { patientId: 'MAG-0004', name: 'Kavita Nair', gender: 'female', age: 41, phoneNumber: '+91 9444444444', email: 'kavita@email.com', bloodGroup: 'AB+', address: '23 Marine Drive, Kochi' } }),
    prisma.patient.create({ data: { patientId: 'MAG-0005', name: 'Rahul Joshi', gender: 'male', age: 19, phoneNumber: '+91 9555555555', bloodGroup: 'O-', address: '56 FC Road, Pune' } }),
  ]);

  const today = new Date();
  today.setHours(10, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  await prisma.appointment.createMany({
    data: [
      { patientId: patients[0].id, doctorId: doctors[0].id, appointmentDate: today, status: 'SCHEDULED', reason: 'General checkup', tokenNumber: 1, tokenLabel: 'Token 1' },
      { patientId: patients[1].id, doctorId: doctors[1].id, appointmentDate: new Date(today.getTime() + 3600000), status: 'SCHEDULED', reason: 'Child vaccination', tokenNumber: 2, tokenLabel: 'Token 2' },
      { patientId: patients[2].id, doctorId: doctors[2].id, appointmentDate: new Date(today.getTime() + 7200000), status: 'SCHEDULED', reason: 'Cardiac review', tokenNumber: 3, tokenLabel: 'Token 3' },
      { patientId: patients[3].id, doctorId: doctors[0].id, appointmentDate: today, status: 'SCHEDULED', reason: 'Fever', tokenNumber: 4, tokenLabel: 'Walk-in 1', appointmentType: 'WALK_IN', isWalkIn: true },
      { patientId: patients[4].id, doctorId: doctors[1].id, appointmentDate: tomorrow, status: 'SCHEDULED', reason: 'Follow-up', tokenNumber: 5, tokenLabel: 'Token 5' },
    ],
  });

  const medicines = await Promise.all([
    prisma.medicine.create({ data: { medicineId: 'MED-001', name: 'Paracetamol 500mg', category: 'Analgesic', manufacturer: 'Cipla', price: 25, stock: 5, minStock: 20, expiryDate: new Date('2027-06-01') } }),
    prisma.medicine.create({ data: { medicineId: 'MED-002', name: 'Amoxicillin 250mg', category: 'Antibiotic', manufacturer: 'Sun Pharma', price: 80, stock: 8, minStock: 15, expiryDate: new Date('2026-12-01') } }),
    prisma.medicine.create({ data: { medicineId: 'MED-003', name: 'Cetirizine 10mg', category: 'Antihistamine', manufacturer: 'Dr. Reddy', price: 15, stock: 3, minStock: 10, expiryDate: new Date('2027-03-01') } }),
    prisma.medicine.create({ data: { medicineId: 'MED-004', name: 'Omeprazole 20mg', category: 'Antacid', manufacturer: 'Torrent', price: 45, stock: 50, minStock: 10, expiryDate: new Date('2027-08-01') } }),
    prisma.medicine.create({ data: { medicineId: 'MED-005', name: 'Metformin 500mg', category: 'Antidiabetic', manufacturer: 'USV', price: 30, stock: 100, minStock: 20, expiryDate: new Date('2027-01-01') } }),
  ]);

  const supplier = await prisma.supplier.create({ data: { name: 'MedSupply India', phone: '+91 8000000001', email: 'orders@medsupply.in', address: 'Industrial Area, Mumbai' } });
  await prisma.purchase.create({ data: { supplierId: supplier.id, medicineId: medicines[0].id, quantity: 100, totalCost: 2000, notes: 'Monthly restock' } });

  await Promise.all([
    prisma.bill.create({
      data: {
        billNumber: 'INV-2026-001', patientId: patients[0].id, type: 'CONSULTATION', subtotal: 500, gstAmount: 90, total: 590, paidAmount: 590, paymentStatus: 'PAID', paymentMethod: 'CASH',
        items: { create: [{ description: 'General consultation', quantity: 1, unitPrice: 500, total: 500 }] },
      },
    }),
    prisma.bill.create({
      data: {
        billNumber: 'INV-2026-002', patientId: patients[1].id, type: 'PHARMACY', subtotal: 320, gstAmount: 57.6, total: 377.6, paidAmount: 377.6, paymentStatus: 'PAID', paymentMethod: 'UPI',
        items: { create: [{ description: 'Medicine dispensed', quantity: 2, unitPrice: 160, total: 320 }] },
      },
    }),
    prisma.bill.create({
      data: {
        billNumber: 'INV-2026-003', patientId: patients[2].id, type: 'CONSULTATION', subtotal: 800, gstAmount: 144, total: 944, paidAmount: 500, paymentStatus: 'PARTIAL', paymentMethod: 'CARD',
        items: { create: [{ description: 'Cardiology consultation', quantity: 1, unitPrice: 800, total: 800 }] },
      },
    }),
  ]);

  await prisma.expense.createMany({
    data: [
      { category: 'Utilities', description: 'Electricity bill - March', amount: 15000, date: new Date() },
      { category: 'Supplies', description: 'Medical supplies', amount: 8500, date: new Date() },
      { category: 'Maintenance', description: 'AC servicing', amount: 3000, date: new Date() },
    ],
  });

  await prisma.income.createMany({
    data: [
      { source: 'Consultations', description: 'Daily consultation fees', amount: 25000, date: new Date() },
      { source: 'Pharmacy', description: 'Medicine sales', amount: 12000, date: new Date() },
    ],
  });

  const users = await prisma.user.findMany();
  await prisma.attendance.createMany({
    data: users.map((u) => ({
      userId: u.id,
      checkIn: new Date(new Date().setHours(9, 0, 0, 0)),
      checkOut: new Date(new Date().setHours(18, 0, 0, 0)),
      status: 'PRESENT',
    })),
  });

  const now = new Date();
  await prisma.payroll.createMany({
    data: users.map((u) => ({
      userId: u.id,
      month: 'June',
      year: 2026,
      baseSalary: u.salary || 40000,
      deductions: 2000,
      bonuses: 1000,
      netSalary: (u.salary || 40000) - 1000,
      status: 'PROCESSED',
      processedAt: now,
    })),
  });

  await prisma.followUp.createMany({
    data: [
      { patientId: patients[0].id, type: 'APPOINTMENT', scheduledAt: tomorrow, status: 'PENDING', notes: 'Blood test follow-up' },
      { patientId: patients[2].id, type: 'MEDICINE', scheduledAt: new Date(today.getTime() + 86400000 * 7), status: 'PENDING', notes: 'Medicine refill reminder' },
      { patientId: patients[3].id, type: 'GENERAL', scheduledAt: new Date(today.getTime() + 86400000 * 3), status: 'PENDING', notes: 'Post-treatment check' },
    ],
  });

  await prisma.reminder.createMany({
    data: [
      { patientId: patients[0].id, type: 'APPOINTMENT', channel: 'SMS', message: 'Reminder: Your appointment is tomorrow at 10 AM', sendAt: tomorrow, status: 'SCHEDULED' },
      { patientId: patients[1].id, type: 'FOLLOW_UP', channel: 'WHATSAPP', message: 'Follow-up reminder for vaccination', sendAt: tomorrow, status: 'SCHEDULED' },
      { patientId: patients[2].id, type: 'MEDICINE', channel: 'EMAIL', message: 'Time to refill your blood pressure medication', sendAt: new Date(today.getTime() + 86400000 * 5), status: 'SCHEDULED' },
    ],
  });

  await prisma.patientDocument.createMany({
    data: [
      { patientId: patients[0].id, name: 'Blood Test Report', type: 'LAB_REPORT', notes: 'CBC - Normal' },
      { patientId: patients[2].id, name: 'ECG Scan', type: 'SCAN', notes: 'Routine cardiac scan' },
    ],
  });

  const appointments = await prisma.appointment.findMany();
  const consultation1 = await prisma.consultation.create({
    data: {
      patientId: patients[0].id,
      doctorId: doctors[0].id,
      appointmentId: appointments[0].id,
      diagnosis: 'Viral fever',
      treatment: 'Rest, fluids, Paracetamol 500mg TDS for 3 days',
      notes: 'Patient responded well to initial treatment',
      fee: 500,
      status: 'COMPLETED',
    },
  });
  const consultation2 = await prisma.consultation.create({
    data: {
      patientId: patients[2].id,
      doctorId: doctors[2].id,
      diagnosis: 'Hypertension - Stage 1',
      treatment: 'Continue Metformin, lifestyle modifications',
      notes: 'BP: 140/90. Advised low-salt diet.',
      fee: 800,
      followUpDate: new Date(today.getTime() + 86400000 * 30),
      status: 'COMPLETED',
    },
  });

  const prescription1 = await prisma.prescription.create({
    data: {
      consultationId: consultation1.id,
      patientId: patients[0].id,
      notes: 'Take after meals',
      items: {
        create: [
          { medicineId: medicines[0].id, dosage: '500mg', duration: '3 days', quantity: 9 },
          { medicineId: medicines[3].id, dosage: '20mg', duration: '5 days', quantity: 5 },
        ],
      },
    },
  });
  await prisma.prescription.create({
    data: {
      consultationId: consultation2.id,
      patientId: patients[2].id,
      items: {
        create: [
          { medicineId: medicines[4].id, dosage: '500mg', duration: '30 days', quantity: 60 },
        ],
      },
    },
  });

  console.log('Seed completed successfully!');
  console.log('Login: admin@magilclinic.com / admin123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
