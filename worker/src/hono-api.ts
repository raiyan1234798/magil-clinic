import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  DEFAULT_AUTOMATION,
  DEFAULT_INTEGRATIONS,
  MONTH_NAMES,
  calculatePayrollFromAttendance,
  combineDateAndTime,
  countAttendanceStatuses,
  formatConsultHoursLabel,
  getSlotTimes,
  maxTokensPerDay,
  monthDateRange,
  parseAttendanceDate,
  parseSettingsJson,
  sendWhatsAppReminder,
  buildAppointmentWhatsAppMessage,
  type WhatsAppTemplate,
} from '../../backend/src/utils';

type AppEnv = {
  Variables: {
    prisma: PrismaClient;
    jwtSecret: string;
  };
};

function todayRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
}

async function ensureClinicSettings(prisma: PrismaClient) {
  let settings = await prisma.clinicSettings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    settings = await prisma.clinicSettings.create({
      data: {
        id: 'default',
        clinicName: 'Magil Clinic',
        consultStartHour: 17,
        consultEndHour: 21,
        slotMinutes: 15,
        integrations: JSON.stringify(DEFAULT_INTEGRATIONS),
        automation: JSON.stringify(DEFAULT_AUTOMATION),
      },
    });
  }
  return settings;
}

function serializeSettings(settings: Awaited<ReturnType<typeof ensureClinicSettings>>) {
  const hours = {
    consultStartHour: settings.consultStartHour,
    consultEndHour: settings.consultEndHour,
    slotMinutes: settings.slotMinutes,
  };
  return {
    ...settings,
    integrations: parseSettingsJson(settings.integrations, DEFAULT_INTEGRATIONS),
    automation: parseSettingsJson(settings.automation, DEFAULT_AUTOMATION),
    consultHoursLabel: formatConsultHoursLabel(settings.consultStartHour, settings.consultEndHour),
    maxTokens: maxTokensPerDay(hours),
  };
}

function isAllowedOrigin(origin: string | undefined, corsOrigin?: string) {
  if (!origin) return true;
  const allowed = (corsOrigin || 'http://localhost:3000,https://magil-clinic.pages.dev')
    .split(',')
    .map((o) => o.trim());
  return allowed.includes(origin) || origin.endsWith('.pages.dev');
}

export function buildHonoApi(
  prisma: PrismaClient,
  options: { jwtSecret?: string; corsOrigin?: string; whatsappApiKey?: string } = {}
) {
  const app = new Hono<AppEnv>();
  const jwtSecret = options.jwtSecret || 'magil-clinic-secret-key';

  app.use('*', cors({
    origin: (origin) => (isAllowedOrigin(origin, options.corsOrigin) ? origin || '*' : 'https://magil-clinic.pages.dev'),
    credentials: true,
  }));

  app.use('*', async (c, next) => {
    c.set('prisma', prisma);
    c.set('jwtSecret', jwtSecret);
    await next();
  });

  app.get('/', (c) =>
    c.json({
      service: 'Magil Clinic API',
      status: 'ok',
      version: '1.0',
      docs: {
        health: '/api/health',
        frontend: 'https://magil-clinic.pages.dev',
      },
    }),
  );

  app.get('/api/health', (c) => c.json({ ok: true, service: 'magil-clinic-api' }));

  app.get('/api/dashboard', async (c) => {
    const { today, tomorrow } = todayRange();
    const [todayAppointments, walkIns, lowStock, bills, recentAppointments, lowStockMeds, followUps, doctors] = await Promise.all([
      prisma.appointment.count({ where: { appointmentDate: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } } }),
      prisma.appointment.count({ where: { isWalkIn: true, appointmentDate: { gte: today, lt: tomorrow } } }),
      prisma.medicine.count({ where: { stock: { lte: 10 } } }),
      prisma.bill.findMany({ where: { createdAt: { gte: today } } }),
      prisma.appointment.findMany({
        where: { appointmentDate: { gte: today, lt: tomorrow } },
        include: { patient: true, doctor: true },
        orderBy: { appointmentDate: 'asc' },
        take: 5,
      }),
      prisma.medicine.findMany({ where: { stock: { lte: 10 } }, orderBy: { stock: 'asc' }, take: 5 }),
      prisma.followUp.count({ where: { status: 'PENDING' } }),
      prisma.doctor.findMany({ select: { id: true, name: true, specialization: true, availability: true } }),
    ]);
    const revenue = bills.reduce((sum, b) => sum + b.paidAmount, 0);
    return c.json({ todayAppointments, walkIns, lowStock, revenue, recentAppointments, lowStockMeds, pendingFollowUps: followUps, doctors });
  });

  app.get('/api/notifications', async (c) => {
    const { today, tomorrow } = todayRange();
    const [appointments, doctors, reminders] = await Promise.all([
      prisma.appointment.findMany({
        where: { appointmentDate: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } },
        include: { patient: true, doctor: true },
        orderBy: { appointmentDate: 'asc' },
      }),
      prisma.doctor.findMany({ orderBy: { name: 'asc' } }),
      prisma.reminder.findMany({
        where: { type: { in: ['APPOINTMENT', 'APPOINTMENT_DOCTOR'] }, sendAt: { gte: today, lt: tomorrow } },
        include: { patient: true },
        orderBy: { sendAt: 'asc' },
      }),
    ]);
    const doctorSchedules = doctors.map((doc) => ({
      doctor: { id: doc.id, name: doc.name, specialization: doc.specialization, availability: doc.availability },
      appointments: appointments
        .filter((a) => a.doctorId === doc.id)
        .map((a) => ({
          id: a.id,
          tokenNumber: a.tokenNumber,
          tokenLabel: a.tokenLabel,
          appointmentType: a.appointmentType,
          appointmentDate: a.appointmentDate,
          reason: a.reason,
          status: a.status,
          isWalkIn: a.isWalkIn,
          patient: {
            id: a.patient.id,
            name: a.patient.name,
            patientId: a.patient.patientId,
            phoneNumber: a.patient.phoneNumber,
            age: a.patient.age,
            gender: a.patient.gender,
          },
        })),
    })).filter((s) => s.appointments.length > 0);

    return c.json({
      totalToday: appointments.length,
      doctorSchedules,
      todayAppointments: appointments,
      appointmentReminders: reminders,
    });
  });

  app.get('/api/patients', async (c) => {
    const search = c.req.query('search');
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { patientId: { contains: search } },
            { phoneNumber: { contains: search } },
          ],
        }
      : {};
    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { appointments: true, consultations: true } } },
    });
    return c.json(patients);
  });

  app.get('/api/patients/:id', async (c) => {
    const id = c.req.param('id');
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: { include: { doctor: true }, orderBy: { appointmentDate: 'desc' } },
        consultations: { include: { doctor: true, prescription: { include: { items: { include: { medicine: true } } } } }, orderBy: { createdAt: 'desc' } },
        bills: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        followUps: { orderBy: { scheduledAt: 'desc' } },
        prescriptions: { include: { items: { include: { medicine: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!patient) return c.json({ error: 'Patient not found' }, 404);

    const totalBilled = patient.bills.reduce((s, b) => s + b.total, 0);
    const totalPaid = patient.bills.reduce((s, b) => s + b.paidAmount, 0);
    const visitCount = patient.appointments.length;
    const lastVisit = patient.appointments[0]?.appointmentDate || patient.createdAt;

    const medications = patient.prescriptions.flatMap((rx) =>
      rx.items.map((item) => ({
        medicine: item.medicine.name,
        dosage: item.dosage,
        duration: item.duration,
        quantity: item.quantity,
        date: rx.createdAt,
        source: 'PRESCRIPTION',
      }))
    );

    const pharmacySales = await prisma.pharmacySale.findMany({
      where: { patientId: id },
      include: { medicine: true },
      orderBy: { createdAt: 'desc' },
    });

    const pharmacyMeds = pharmacySales.map((s) => ({
      medicine: s.medicine.name,
      dosage: '—',
      duration: '—',
      quantity: s.quantity,
      date: s.createdAt,
      source: 'PHARMACY',
    }));

    const allMedications = [...medications, ...pharmacyMeds].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const timeline = [
      ...patient.appointments.map((a) => ({
        type: 'APPOINTMENT',
        date: a.appointmentDate,
        title: a.isWalkIn ? 'Walk-in Visit' : 'Appointment',
        detail: `${a.doctor?.name || 'Unassigned'} — ${a.reason || 'Consultation'}`,
        status: a.status,
      })),
      ...patient.consultations.map((c) => ({
        type: 'CONSULTATION',
        date: c.createdAt,
        title: 'Consultation',
        detail: `${c.doctor?.name} — ${c.diagnosis || 'Diagnosis recorded'}`,
        status: c.status,
      })),
      ...patient.bills.map((b) => ({
        type: 'BILL',
        date: b.createdAt,
        title: `Invoice ${b.billNumber}`,
        detail: `${b.type} — ${b.paymentStatus} — ${b.total}`,
        status: b.paymentStatus,
      })),
      {
        type: 'REGISTRATION',
        date: patient.createdAt,
        title: 'Patient Registered',
        detail: `Registered as ${patient.patientId}`,
        status: 'COMPLETED',
      },
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return c.json({
      ...patient,
      stats: { totalBilled, totalPaid, visitCount, lastVisit, medicationCount: allMedications.length, billCount: patient.bills.length },
      medications: allMedications,
      pharmacySales,
      timeline,
    });
  });

  app.post('/api/patients', async (c) => {
    const body = await c.req.json();
    const { fullName, gender, age, dob, phone, email, bloodGroup, emergencyContact, address, medicalNotes } = body;
    const count = await prisma.patient.count();
    const patientId = `MAG-${(count + 1).toString().padStart(4, '0')}`;
    const patient = await prisma.patient.create({
      data: {
        patientId,
        name: fullName,
        gender,
        age: parseInt(age),
        dateOfBirth: dob ? new Date(dob) : null,
        phoneNumber: phone,
        email,
        bloodGroup,
        emergencyContact,
        address,
        medicalNotes,
      },
    });
    return c.json(patient);
  });

  app.put('/api/patients/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { fullName, gender, age, dob, phone, email, bloodGroup, emergencyContact, address, medicalNotes } = body;
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        name: fullName,
        gender,
        age: parseInt(age),
        dateOfBirth: dob ? new Date(dob) : null,
        phoneNumber: phone,
        email,
        bloodGroup,
        emergencyContact,
        address,
        medicalNotes,
      },
    });
    return c.json(patient);
  });

  app.patch('/api/patients/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { fullName, gender, age, dob, phone, email, bloodGroup, emergencyContact, address, medicalNotes } = body;
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        name: fullName,
        gender,
        age: parseInt(age),
        dateOfBirth: dob ? new Date(dob) : null,
        phoneNumber: phone,
        email,
        bloodGroup,
        emergencyContact,
        address,
        medicalNotes,
      },
    });
    return c.json(patient);
  });

  app.get('/api/settings', async (c) => c.json(serializeSettings(await ensureClinicSettings(prisma))));

  app.put('/api/settings', async (c) => {
    const body = await c.req.json();
    const existing = await ensureClinicSettings(prisma);
    const settings = await prisma.clinicSettings.update({
      where: { id: 'default' },
      data: {
        clinicName: body.clinicName ?? existing.clinicName,
        primaryColor: body.primaryColor ?? existing.primaryColor,
        secondaryColor: body.secondaryColor ?? existing.secondaryColor,
        fontFamily: body.fontFamily ?? existing.fontFamily,
        consultStartHour: body.consultStartHour !== undefined ? parseInt(body.consultStartHour) : existing.consultStartHour,
        consultEndHour: body.consultEndHour !== undefined ? parseInt(body.consultEndHour) : existing.consultEndHour,
        slotMinutes: body.slotMinutes !== undefined ? parseInt(body.slotMinutes) : existing.slotMinutes,
        gstEnabled: body.gstEnabled !== undefined ? Boolean(body.gstEnabled) : existing.gstEnabled,
        gstRate: body.gstRate !== undefined ? parseFloat(body.gstRate) : existing.gstRate,
        integrations: body.integrations ? JSON.stringify(body.integrations) : existing.integrations,
        automation: body.automation ? JSON.stringify(body.automation) : existing.automation,
      },
    });
    return c.json(serializeSettings(settings));
  });

  app.patch('/api/settings', async (c) => {
    const body = await c.req.json();
    const existing = await ensureClinicSettings(prisma);
    const settings = await prisma.clinicSettings.update({
      where: { id: 'default' },
      data: {
        clinicName: body.clinicName ?? existing.clinicName,
        primaryColor: body.primaryColor ?? existing.primaryColor,
        secondaryColor: body.secondaryColor ?? existing.secondaryColor,
        fontFamily: body.fontFamily ?? existing.fontFamily,
        consultStartHour: body.consultStartHour !== undefined ? parseInt(body.consultStartHour) : existing.consultStartHour,
        consultEndHour: body.consultEndHour !== undefined ? parseInt(body.consultEndHour) : existing.consultEndHour,
        slotMinutes: body.slotMinutes !== undefined ? parseInt(body.slotMinutes) : existing.slotMinutes,
        gstEnabled: body.gstEnabled !== undefined ? Boolean(body.gstEnabled) : existing.gstEnabled,
        gstRate: body.gstRate !== undefined ? parseFloat(body.gstRate) : existing.gstRate,
        integrations: body.integrations ? JSON.stringify(body.integrations) : existing.integrations,
        automation: body.automation ? JSON.stringify(body.automation) : existing.automation,
      },
    });
    return c.json(serializeSettings(settings));
  });

  app.get('/api/bills', async (c) => {
    const bills = await prisma.bill.findMany({ include: { patient: true, items: true }, orderBy: { createdAt: 'desc' } });
    return c.json(bills);
  });

  app.get('/api/bills/:id', async (c) => {
    const bill = await prisma.bill.findUnique({
      where: { id: c.req.param('id') },
      include: { patient: true, items: { include: { medicine: true } } },
    });
    if (!bill) return c.json({ error: 'Bill not found' }, 404);
    const settings = await ensureClinicSettings(prisma);
    return c.json({
      ...bill,
      clinic: {
        name: settings.clinicName || 'Magil Clinic',
        address: 'Magil Clinic Management System',
        phone: '+91 9876543210',
        gstin: 'GSTIN-MAGIL-2026',
      },
    });
  });

  app.post('/api/bills', async (c) => {
    try {
      const body = await c.req.json();
      const settings = await ensureClinicSettings(prisma);
      const { createBill } = await import('../../backend/src/bill-helpers');
      const bill = await createBill(prisma, body, {
        gstEnabled: settings.gstEnabled,
        gstRate: settings.gstRate,
        clinicName: settings.clinicName,
      });
      return c.json(bill);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create bill';
      const status = msg.includes('required') || msg.includes('Insufficient') || msg.includes('Invalid') || msg.includes('not found') ? 400 : 500;
      return c.json({ error: msg }, status);
    }
  });

  app.get('/api/finance', async (c) => {
    const [incomes, expenses, bills] = await Promise.all([
      prisma.income.findMany({ orderBy: { date: 'desc' } }),
      prisma.expense.findMany({ orderBy: { date: 'desc' } }),
      prisma.bill.findMany(),
    ]);
    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0) + bills.reduce((s, b) => s + b.paidAmount, 0);
    const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
    return c.json({ incomes, expenses, totalIncome, totalExpense, profit: totalIncome - totalExpense });
  });

  app.post('/api/expenses', async (c) => c.json(await prisma.expense.create({ data: await c.req.json() })));

  app.get('/api/reminders', async (c) => {
    const reminders = await prisma.reminder.findMany({ include: { patient: true }, orderBy: { sendAt: 'asc' } });
    return c.json(reminders);
  });

  app.post('/api/reminders', async (c) => {
    const body = await c.req.json();
    const reminder = await prisma.reminder.create({
      data: { ...body, sendAt: new Date(body.sendAt) },
      include: { patient: true },
    });
    return c.json(reminder);
  });

  app.get('/api/appointments', async (c) => {
    const date = c.req.query('date');
    const status = c.req.query('status');
    const where: Record<string, unknown> = {};
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.appointmentDate = { gte: d, lt: next };
    }
    if (status) where.status = status;
    const appointments = await prisma.appointment.findMany({
      where,
      include: { patient: true, doctor: true },
      orderBy: { appointmentDate: 'asc' },
    });
    return c.json(appointments);
  });

  app.get('/api/appointments/today', async (c) => {
    const { today, tomorrow } = todayRange();
    const appointments = await prisma.appointment.findMany({
      where: { appointmentDate: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } },
      include: { patient: true, doctor: true },
      orderBy: { appointmentDate: 'asc' },
    });
    return c.json(appointments);
  });

  app.post('/api/appointments', async (c) => {
    const body = await c.req.json();
    const { patientId, doctorId, appointmentDate, reason, appointmentType, bookedById } = body;
    const isWalkIn = appointmentType === 'WALK_IN';
    const aptDay = appointmentDate ? new Date(appointmentDate) : new Date();
    aptDay.setHours(0, 0, 0, 0);
    const nextDay = new Date(aptDay);
    nextDay.setDate(nextDay.getDate() + 1);
    const existingCount = await prisma.appointment.count({
      where: { appointmentDate: { gte: aptDay, lt: nextDay }, doctorId, status: { not: 'CANCELLED' } },
    });
    const settings = await ensureClinicSettings(prisma);
    const hours = { consultStartHour: settings.consultStartHour, consultEndHour: settings.consultEndHour, slotMinutes: settings.slotMinutes };
    const tokenNum = existingCount + 1;
    if (tokenNum > maxTokensPerDay(hours)) {
      return c.json({ error: `No slots available. Consulting hours are ${formatConsultHoursLabel(hours.consultStartHour, hours.consultEndHour)} (${maxTokensPerDay(hours)} tokens max).` }, 400);
    }
    const slot = getSlotTimes(tokenNum, aptDay, hours);
    if (!slot) return c.json({ error: 'Invalid token slot' }, 400);
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        appointmentDate: slot.scheduledSlotStart,
        appointmentType: isWalkIn ? 'WALK_IN' : 'PHONE',
        isWalkIn,
        reason,
        tokenNumber: tokenNum,
        tokenLabel: slot.tokenLabel,
        scheduledSlotStart: slot.scheduledSlotStart,
        scheduledSlotEnd: slot.scheduledSlotEnd,
        bookedById: bookedById || null,
        status: 'SCHEDULED',
      },
      include: { patient: true, doctor: true },
    });
    return c.json(appointment);
  });

  app.post('/api/appointments/:id/send-whatsapp', async (c) => {
    try {
      const body = await c.req.json<{ template?: WhatsAppTemplate; message?: string }>();
      const settings = await ensureClinicSettings(prisma);
      const integrations = parseSettingsJson(settings.integrations, DEFAULT_INTEGRATIONS);
      if (!integrations.whatsapp) {
        return c.json({ error: 'Enable WhatsApp in Settings to send messages' }, 400);
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id: c.req.param('id') },
        include: { patient: true, doctor: true },
      });
      if (!appointment) return c.json({ error: 'Appointment not found' }, 404);
      if (!appointment.patient?.phoneNumber?.trim()) {
        return c.json({ error: 'Patient has no phone number' }, 400);
      }

      const tpl = body.template || 'BOOKING_CONFIRMED';
      const msg = buildAppointmentWhatsAppMessage(appointment, tpl, body.message);
      const { status: waStatus, simulated } = await sendWhatsAppReminder(
        appointment.patient.phoneNumber,
        msg,
        options.whatsappApiKey
      );

      await prisma.reminder.create({
        data: {
          patientId: appointment.patientId,
          type: 'APPOINTMENT',
          channel: 'WHATSAPP',
          message: msg,
          sendAt: new Date(),
          status: waStatus,
        },
      });

      return c.json({ success: true, sent: waStatus === 'SENT', message: msg, template: tpl, simulated });
    } catch (e) {
      console.error(e);
      return c.json({ error: 'Failed to send WhatsApp message' }, 500);
    }
  });

  app.post('/api/appointments/:id/start', async (c) => {
    const apt = await prisma.appointment.update({
      where: { id: c.req.param('id') },
      data: { status: 'IN_PROGRESS', actualStartTime: new Date() },
      include: { patient: true, doctor: true },
    });
    return c.json(apt);
  });

  app.post('/api/appointments/:id/complete', async (c) => {
    const apt = await prisma.appointment.update({
      where: { id: c.req.param('id') },
      data: { status: 'COMPLETED', actualEndTime: new Date() },
      include: { patient: true, doctor: true },
    });
    return c.json(apt);
  });

  app.get('/api/doctors', async (c) => {
    const doctors = await prisma.doctor.findMany({
      include: { leaves: true, _count: { select: { appointments: true } } },
      orderBy: { name: 'asc' },
    });
    return c.json(doctors);
  });

  app.get('/api/followups', async (c) => {
    const followUps = await prisma.followUp.findMany({ include: { patient: true }, orderBy: { scheduledAt: 'asc' } });
    return c.json(followUps);
  });

  app.post('/api/followups', async (c) => {
    const body = await c.req.json();
    const followUp = await prisma.followUp.create({
      data: { ...body, scheduledAt: new Date(body.scheduledAt) },
      include: { patient: true },
    });
    return c.json(followUp);
  });

  app.put('/api/followups/:id', async (c) => {
    const followUp = await prisma.followUp.update({
      where: { id: c.req.param('id') },
      data: await c.req.json(),
      include: { patient: true },
    });
    return c.json(followUp);
  });

  app.get('/api/medicines', async (c) => {
    const lowStock = c.req.query('lowStock');
    const where = lowStock === 'true' ? { stock: { lte: 10 } } : {};
    return c.json(await prisma.medicine.findMany({ where, orderBy: { name: 'asc' } }));
  });

  app.get('/api/tasks', async (c) => {
    const email = c.req.query('email');
    const role = c.req.query('role');
    const assigneeEmail = c.req.query('assigneeEmail');
    const isSuperAdmin = role === 'DOCTOR_ADMIN';
    const where: { OR?: Array<{ assigneeEmail?: string; assigneeId?: string }> } = {};
    if (!isSuperAdmin) {
      const userEmail = email || '';
      const user = userEmail ? await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } }) : null;
      where.OR = [
        ...(userEmail ? [{ assigneeEmail: userEmail }] : []),
        ...(user ? [{ assigneeId: user.id }] : []),
      ];
      if (!where.OR?.length) return c.json([]);
    } else if (assigneeEmail) {
      where.OR = [{ assigneeEmail }];
    }
    const tasks = await prisma.task.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return c.json(tasks);
  });

  app.get('/api/employees', async (c) => {
    const employees = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, phone: true, salary: true, department: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    return c.json(employees);
  });

  const attendanceInclude = { user: { select: { id: true, name: true, role: true } } };

  async function upsertAttendance(data: {
    userId: string;
    date: Date;
    status: string;
    notes?: string | null;
    checkIn?: Date | null;
    checkOut?: Date | null;
  }) {
    const { userId, date, status, notes, checkIn, checkOut } = data;
    const existing = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
    if (existing) {
      return prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          notes: notes ?? existing.notes,
          checkIn: checkIn !== undefined ? checkIn : existing.checkIn,
          checkOut: checkOut !== undefined ? checkOut : existing.checkOut,
        },
        include: attendanceInclude,
      });
    }
    return prisma.attendance.create({
      data: {
        userId,
        date,
        status,
        notes: notes ?? null,
        checkIn: checkIn ?? (status === 'PRESENT' || status === 'LATE' || status === 'HALF_DAY' ? new Date() : null),
        checkOut: checkOut ?? null,
      },
      include: attendanceInclude,
    });
  }

  app.get('/api/attendance', async (c) => {
    const date = parseAttendanceDate(c.req.query('date'));
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + 1);

    const [employees, records] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } }),
      prisma.attendance.findMany({
        where: { date: { gte: date, lt: next } },
        include: attendanceInclude,
      }),
    ]);

    const byUser = new Map(records.map((r) => [r.userId, r]));
    const merged = employees.map((emp) => {
      const record = byUser.get(emp.id);
      if (record) return record;
      return {
        id: null,
        userId: emp.id,
        user: emp,
        date,
        checkIn: null,
        checkOut: null,
        status: null,
        notes: null,
      };
    });
    return c.json(merged);
  });

  app.post('/api/attendance', async (c) => {
    const body = await c.req.json();
    const { userId, date: dateStr, status, notes, checkInTime, checkOutTime } = body;
    if (!userId || !status) return c.json({ error: 'userId and status are required' }, 400);
    const date = parseAttendanceDate(dateStr);
    const checkIn = combineDateAndTime(date, checkInTime);
    const checkOut = combineDateAndTime(date, checkOutTime);
    const record = await upsertAttendance({ userId, date, status, notes, checkIn, checkOut });
    return c.json(record);
  });

  app.post('/api/attendance/mark', async (c) => {
    const body = await c.req.json();
    const { employeeId, userId, date: dateStr, status, notes, checkInTime, checkOutTime } = body;
    const uid = employeeId || userId;
    if (!uid || !status) return c.json({ error: 'employeeId and status are required' }, 400);
    const date = parseAttendanceDate(dateStr);
    const checkIn = combineDateAndTime(date, checkInTime);
    const checkOut = combineDateAndTime(date, checkOutTime);
    const record = await upsertAttendance({ userId: uid, date, status, notes, checkIn, checkOut });
    return c.json(record);
  });

  app.patch('/api/attendance/:id', async (c) => {
    const { status, notes, checkInTime, checkOutTime } = await c.req.json();
    const existing = await prisma.attendance.findUnique({ where: { id: c.req.param('id') } });
    if (!existing) return c.json({ error: 'Attendance record not found' }, 404);

    const data: Record<string, unknown> = {};
    if (status) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (checkInTime !== undefined) data.checkIn = combineDateAndTime(existing.date, checkInTime);
    if (checkOutTime !== undefined) data.checkOut = combineDateAndTime(existing.date, checkOutTime);

    const record = await prisma.attendance.update({
      where: { id: c.req.param('id') },
      data,
      include: attendanceInclude,
    });
    return c.json(record);
  });

  app.post('/api/attendance/checkin', async (c) => {
    const { userId } = await c.req.json();
    const date = parseAttendanceDate();
    const now = new Date();
    const record = await upsertAttendance({ userId, date, status: 'PRESENT', checkIn: now, checkOut: null });
    return c.json(record);
  });

  app.post('/api/attendance/:id/checkout', async (c) => {
    const record = await prisma.attendance.update({
      where: { id: c.req.param('id') },
      data: { checkOut: new Date() },
      include: attendanceInclude,
    });
    return c.json(record);
  });

  app.get('/api/payroll', async (c) => {
    const month = c.req.query('month');
    const year = c.req.query('year');
    const where: { month?: string; year?: number } = {};
    if (month) where.month = String(month);
    if (year) where.year = parseInt(String(year));
    const payrolls = await prisma.payroll.findMany({
      where,
      include: { user: { select: { name: true, role: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return c.json(payrolls);
  });

  app.post('/api/payroll/process', async (c) => {
    const body = await c.req.json();
    const now = new Date();
    const month = body.month || MONTH_NAMES[now.getMonth()];
    const year = parseInt(body.year) || now.getFullYear();
    const { start, end } = monthDateRange(month, year);

    const users = await prisma.user.findMany();
    const payrolls = await Promise.all(users.map(async (u) => {
      const base = u.salary || 40000;
      const records = await prisma.attendance.findMany({
        where: { userId: u.id, date: { gte: start, lt: end } },
      });
      const counts = countAttendanceStatuses(records);
      const { deductions, netSalary } = calculatePayrollFromAttendance(base, counts, 0);

      const existing = await prisma.payroll.findFirst({ where: { userId: u.id, month, year } });
      const data = {
        userId: u.id,
        month,
        year,
        baseSalary: base,
        daysPresent: counts.daysPresent,
        halfDays: counts.halfDays,
        absentDays: counts.absentDays,
        deductions,
        bonuses: 0,
        netSalary,
        status: 'PROCESSED',
        processedAt: new Date(),
      };

      if (existing) {
        return prisma.payroll.update({
          where: { id: existing.id },
          data,
          include: { user: { select: { name: true } } },
        });
      }
      return prisma.payroll.create({
        data,
        include: { user: { select: { name: true } } },
      });
    }));
    return c.json(payrolls);
  });

  app.get('/api/setup/status', async (c) => {
    const userCount = await prisma.user.count();
    return c.json({ needsSetup: userCount === 0 });
  });

  app.post('/api/auth/login', async (c) => {
    const { email, password } = await c.req.json();
    const user = await prisma.user.findUnique({ where: { email }, include: { department: true } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, jwtSecret, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    return c.json({ token, user: userWithoutPassword });
  });

  app.notFound((c) => c.json({ error: 'Not found' }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: err.message || 'Internal server error' }, 500);
  });

  return app;
}
