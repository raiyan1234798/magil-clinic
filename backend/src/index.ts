import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { migrateLegacyAppointmentTokens } from './migrate-legacy-data';
import { getSlotTimes, maxTokensPerDay, formatTime12, sendWhatsAppReminder, DEFAULT_INTEGRATIONS, DEFAULT_AUTOMATION, parseSettingsJson, formatConsultHoursLabel, type ClinicHoursConfig } from './utils';

/** Retry Prisma appointment reads after converting legacy string tokenNumber values. */
async function withAppointmentMigration<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const migrated = migrateLegacyAppointmentTokens();
    if (migrated > 0) return await fn();
    throw e;
  }
}

const app = express();
const port = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'magil-clinic-secret-key';
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3000,https://magil-clinic.pages.dev').split(',').map((o) => o.trim());
const routeId = (req: express.Request) => String(req.params.id);

app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
async function ensureClinicSettings() {
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
  const hours: ClinicHoursConfig = {
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

async function getClinicHoursConfig(): Promise<ClinicHoursConfig> {
  const settings = await ensureClinicSettings();
  return {
    consultStartHour: settings.consultStartHour,
    consultEndHour: settings.consultEndHour,
    slotMinutes: settings.slotMinutes,
  };
}

app.use(express.json({ limit: '10mb' }));

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  try {
    (req as any).user = jwt.verify(token, JWT_SECRET);
  } catch { /* optional auth */ }
  next();
};
app.use(authMiddleware);

// ─── AUTH ───────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email }, include: { department: true } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch { res.status(500).json({ error: 'Login failed' }); }
});

// ─── SETUP (no seed required) ─────────────────────────────────────────────────
app.get('/api/setup/status', async (_req, res) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ needsSetup: userCount === 0 });
  } catch { res.status(500).json({ error: 'Setup check failed' }); }
});

app.post('/api/setup', async (req, res) => {
  try {
    const count = await prisma.user.count();
    if (count > 0) return res.status(400).json({ error: 'Setup already completed' });
    const { clinicName, adminName, adminEmail, adminPassword } = req.body;
    const password = await bcrypt.hash(adminPassword, 10);
    const dept = await prisma.department.create({ data: { name: 'Administration', description: 'Clinic administration' } });
    await prisma.clinicSettings.create({
      data: {
        id: 'default',
        clinicName: clinicName || 'Magil Clinic',
        consultStartHour: 17,
        consultEndHour: 21,
        slotMinutes: 15,
        integrations: JSON.stringify(DEFAULT_INTEGRATIONS),
        automation: JSON.stringify(DEFAULT_AUTOMATION),
      },
    });
    const user = await prisma.user.create({
      data: { email: adminEmail, password, name: adminName, role: 'DOCTOR_ADMIN', departmentId: dept.id, salary: 0 },
    });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Setup failed' }); }
});

app.get('/api/settings', async (_req, res) => {
  try {
    const settings = await ensureClinicSettings();
    res.json(serializeSettings(settings));
  } catch { res.status(500).json({ error: 'Failed to fetch settings' }); }
});

const updateSettings = async (req: express.Request, res: express.Response) => {
  try {
    const {
      clinicName,
      primaryColor,
      secondaryColor,
      fontFamily,
      consultStartHour,
      consultEndHour,
      slotMinutes,
      integrations,
      automation,
    } = req.body;

    const existing = await ensureClinicSettings();
    const start = consultStartHour !== undefined ? parseInt(consultStartHour) : existing.consultStartHour;
    const end = consultEndHour !== undefined ? parseInt(consultEndHour) : existing.consultEndHour;
    const slots = slotMinutes !== undefined ? parseInt(slotMinutes) : existing.slotMinutes;

    if (start >= end) return res.status(400).json({ error: 'Consult start hour must be before end hour' });
    if (slots < 5 || slots > 60) return res.status(400).json({ error: 'Slot minutes must be between 5 and 60' });

    const settings = await prisma.clinicSettings.update({
      where: { id: 'default' },
      data: {
        clinicName: clinicName ?? existing.clinicName,
        primaryColor: primaryColor ?? existing.primaryColor,
        secondaryColor: secondaryColor ?? existing.secondaryColor,
        fontFamily: fontFamily ?? existing.fontFamily,
        consultStartHour: start,
        consultEndHour: end,
        slotMinutes: slots,
        integrations: integrations ? JSON.stringify(integrations) : existing.integrations,
        automation: automation ? JSON.stringify(automation) : existing.automation,
      },
    });
    res.json(serializeSettings(settings));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

app.put('/api/settings', updateSettings);
app.patch('/api/settings', updateSettings);

const ONBOARDING_TASKS = [
  { title: 'Complete profile', description: 'Fill in your employee profile and contact details', priority: 'HIGH' },
  { title: 'Review clinic policies', description: 'Read and acknowledge clinic policies and procedures', priority: 'MEDIUM' },
  { title: 'Setup workstation', description: 'Configure your computer, email, and clinic systems access', priority: 'MEDIUM' },
];

async function createOnboardingTasks(assigneeId: string, assigneeEmail: string, createdById?: string) {
  await prisma.task.createMany({
    data: ONBOARDING_TASKS.map((t, i) => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: 'TODO',
      assigneeId,
      assigneeEmail,
      createdById: createdById || null,
      sortOrder: i,
    })),
  });
}

app.post('/api/employees', async (req, res) => {
  try {
    const { name, email, password, role, phone, salary, departmentId } = req.body;
    const hash = await bcrypt.hash(password || 'changeme123', 10);
    const user = await prisma.user.create({
      data: { name, email, password: hash, role, phone, salary: parseFloat(salary) || 0, departmentId: departmentId || null },
      select: { id: true, name: true, email: true, role: true, phone: true, salary: true, createdAt: true },
    });
    if (email) {
      await createOnboardingTasks(user.id, email);
    }
    res.json(user);
  } catch { res.status(500).json({ error: 'Failed to create employee' }); }
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
app.get('/api/dashboard', async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

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
    res.json({ todayAppointments, walkIns, lowStock, revenue, recentAppointments, lowStockMeds, pendingFollowUps: followUps, doctors });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch dashboard' }); }
});

// ─── PATIENTS ─────────────────────────────────────────────────────────────────
app.get('/api/patients', async (req, res) => {
  try {
    const { search } = req.query;
    const where = search ? {
      OR: [
        { name: { contains: String(search) } },
        { patientId: { contains: String(search) } },
        { phoneNumber: { contains: String(search) } },
      ],
    } : {};
    const patients = await prisma.patient.findMany({ where, orderBy: { createdAt: 'desc' }, include: { _count: { select: { appointments: true, consultations: true } } } });
    res.json(patients);
  } catch { res.status(500).json({ error: 'Failed to fetch patients' }); }
});

app.get('/api/patients/:id', async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: routeId(req) },
      include: {
        appointments: { include: { doctor: true }, orderBy: { appointmentDate: 'desc' } },
        consultations: { include: { doctor: true, prescription: { include: { items: { include: { medicine: true } } } } }, orderBy: { createdAt: 'desc' } },
        bills: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        followUps: { orderBy: { scheduledAt: 'desc' } },
        prescriptions: { include: { items: { include: { medicine: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

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
      }))
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
      ...medications.map((m) => ({
        type: 'MEDICATION',
        date: m.date,
        title: 'Medicine Prescribed',
        detail: `${m.medicine} — ${m.dosage} for ${m.duration}`,
        status: 'GIVEN',
      })),
      {
        type: 'REGISTRATION',
        date: patient.createdAt,
        title: 'Patient Registered',
        detail: `Registered as ${patient.patientId}`,
        status: 'COMPLETED',
      },
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      ...patient,
      stats: { totalBilled, totalPaid, visitCount, lastVisit, medicationCount: medications.length, billCount: patient.bills.length },
      medications,
      pharmacySales: await prisma.pharmacySale.findMany({ where: { patientId: routeId(req) }, include: { medicine: true }, orderBy: { createdAt: 'desc' } }),
      timeline,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch patient' }); }
});

app.post('/api/patients', async (req, res) => {
  try {
    const { fullName, gender, age, dob, phone, email, bloodGroup, emergencyContact, address, medicalNotes } = req.body;
    const count = await prisma.patient.count();
    const patientId = `MAG-${(count + 1).toString().padStart(4, '0')}`;
    const patient = await prisma.patient.create({
      data: { patientId, name: fullName, gender, age: parseInt(age), dateOfBirth: dob ? new Date(dob) : null, phoneNumber: phone, email, bloodGroup, emergencyContact, address, medicalNotes },
    });
    res.json(patient);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create patient' }); }
});

const updatePatient = async (req: express.Request, res: express.Response) => {
  try {
    const { fullName, gender, age, dob, phone, email, bloodGroup, emergencyContact, address, medicalNotes } = req.body;
    const patient = await prisma.patient.update({
      where: { id: routeId(req) },
      data: { name: fullName, gender, age: parseInt(age), dateOfBirth: dob ? new Date(dob) : null, phoneNumber: phone, email, bloodGroup, emergencyContact, address, medicalNotes },
    });
    res.json(patient);
  } catch { res.status(500).json({ error: 'Failed to update patient' }); }
};

app.put('/api/patients/:id', updatePatient);
app.patch('/api/patients/:id', updatePatient);

app.post('/api/patients/:id/documents', async (req, res) => {
  try {
    const { name, type, fileData, mimeType, notes } = req.body;
    let url: string | undefined;
    let storedFileData: string | undefined = fileData;

    if (fileData) {
      const { uploadToR2, parseBase64File, isR2Configured } = await import('./r2');
      if (isR2Configured()) {
        const parsed = parseBase64File(fileData);
        if (parsed) {
          const key = `patients/${routeId(req)}/${Date.now()}-${(name || 'document').replace(/\s+/g, '-')}`;
          const r2Url = await uploadToR2(key, parsed.buffer, mimeType || parsed.mimeType);
          if (r2Url) {
            url = r2Url;
            storedFileData = undefined;
          }
        }
      }
    }

    const doc = await prisma.patientDocument.create({
      data: {
        patientId: routeId(req),
        name,
        type: type || 'OTHER',
        url,
        fileData: storedFileData,
        mimeType,
        notes,
      },
    });
    res.json(doc);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to upload document' }); }
});

// ─── DOCTORS ──────────────────────────────────────────────────────────────────
app.get('/api/doctors', async (_req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({ include: { leaves: true, _count: { select: { appointments: true } } }, orderBy: { name: 'asc' } });
    res.json(doctors);
  } catch { res.status(500).json({ error: 'Failed to fetch doctors' }); }
});

app.post('/api/doctors', async (req, res) => {
  try {
    const { name, specialization, phone, email, consultationFee, availability } = req.body;
    const count = await prisma.doctor.count();
    const doctor = await prisma.doctor.create({
      data: { doctorId: `DOC-${(count + 1).toString().padStart(3, '0')}`, name, specialization, phone, email, consultationFee: parseFloat(consultationFee) || 500, availability: availability || 'AVAILABLE' },
    });
    res.json(doctor);
  } catch { res.status(500).json({ error: 'Failed to create doctor' }); }
});

app.put('/api/doctors/:id', async (req, res) => {
  try {
    const doctor = await prisma.doctor.update({ where: { id: routeId(req) }, data: req.body });
    res.json(doctor);
  } catch { res.status(500).json({ error: 'Failed to update doctor' }); }
});

app.post('/api/doctors/:id/leave', async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const leave = await prisma.doctorLeave.create({ data: { doctorId: routeId(req), startDate: new Date(startDate), endDate: new Date(endDate), reason } });
    await prisma.doctor.update({ where: { id: routeId(req) }, data: { availability: 'ON_LEAVE' } });
    res.json(leave);
  } catch { res.status(500).json({ error: 'Failed to add leave' }); }
});

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
function getTodayRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
}

function formatApptDateTime(date: Date) {
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

app.get('/api/appointments/today', async (_req, res) => {
  try {
    const { today, tomorrow } = getTodayRange();
    const appointments = await withAppointmentMigration(() =>
      prisma.appointment.findMany({
        where: { appointmentDate: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } },
        include: { patient: true, doctor: true },
        orderBy: { appointmentDate: 'asc' },
      })
    );
    res.json(appointments);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch today appointments' }); }
});

app.get('/api/doctors/:id/appointments', async (req, res) => {
  try {
    const { today, tomorrow } = getTodayRange();
    const doctor = await prisma.doctor.findUnique({ where: { id: routeId(req) } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    const appointments = await withAppointmentMigration(() =>
      prisma.appointment.findMany({
        where: { doctorId: routeId(req), appointmentDate: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } },
        include: { patient: true },
        orderBy: { appointmentDate: 'asc' },
      })
    );
    res.json({ doctor, appointments, count: appointments.length });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch doctor appointments' }); }
});

app.get('/api/notifications', async (_req, res) => {
  try {
    const { today, tomorrow } = getTodayRange();
    const [appointments, doctors, reminders] = await withAppointmentMigration(() =>
      Promise.all([
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
      ])
    );

    const doctorSchedules = doctors.map((doc) => ({
      doctor: { id: doc.id, name: doc.name, specialization: doc.specialization, availability: doc.availability },
      appointments: appointments
        .filter((a) => a.doctorId === doc.id)
        .map((a) => ({
          id: a.id,
          tokenNumber: a.tokenNumber,
          tokenLabel: a.tokenLabel,
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

    res.json({
      totalToday: appointments.length,
      doctorSchedules,
      todayAppointments: appointments,
      appointmentReminders: reminders,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch notifications' }); }
});

app.get('/api/appointments', async (req, res) => {
  try {
    const { date, status } = req.query;
    const where: any = {};
    if (date) {
      const d = new Date(String(date));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.appointmentDate = { gte: d, lt: next };
    }
    if (status) where.status = String(status);
    const appointments = await withAppointmentMigration(() =>
      prisma.appointment.findMany({
        where, include: { patient: true, doctor: true }, orderBy: { appointmentDate: 'asc' },
      })
    );
    res.json(appointments);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch appointments' }); }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason, appointmentType, bookedById } = req.body;
    const isWalkIn = appointmentType === 'WALK_IN';
    const aptDay = appointmentDate ? new Date(appointmentDate) : new Date();
    aptDay.setHours(0, 0, 0, 0);
    const nextDay = new Date(aptDay);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingCount = await prisma.appointment.count({
      where: { appointmentDate: { gte: aptDay, lt: nextDay }, doctorId, status: { not: 'CANCELLED' } },
    });
    const hours = await getClinicHoursConfig();
    const tokenNum = existingCount + 1;
    const maxTokens = maxTokensPerDay(hours);
    if (tokenNum > maxTokens) {
      return res.status(400).json({ error: `No slots available. Consulting hours are ${formatConsultHoursLabel(hours.consultStartHour, hours.consultEndHour)} (${maxTokens} tokens max).` });
    }

    const slot = getSlotTimes(tokenNum, aptDay, hours);
    if (!slot) return res.status(400).json({ error: 'Invalid token slot' });

    const appointment = await prisma.appointment.create({
      data: {
        patientId, doctorId,
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

    const timeStr = `${formatTime12(slot.scheduledSlotStart)} – ${formatTime12(slot.scheduledSlotEnd)}`;
    const waMsg = `Magil Clinic: Dear ${appointment.patient.name}, your ${isWalkIn ? 'walk-in' : 'phone'} appointment with Dr. ${appointment.doctor?.name} is on ${aptDay.toLocaleDateString('en-IN')} at ${timeStr}. ${slot.tokenLabel}. Reason: ${reason || 'Consultation'}.`;
    const waStatus = await sendWhatsAppReminder(appointment.patient.phoneNumber, waMsg);

    await prisma.reminder.createMany({
      data: [
        { patientId, type: 'APPOINTMENT', channel: 'WHATSAPP', message: waMsg, sendAt: new Date(), status: waStatus },
        { patientId, type: 'APPOINTMENT', channel: 'SMS', message: waMsg, sendAt: slot.scheduledSlotStart, status: 'SCHEDULED' },
      ],
    });

    res.json({ ...appointment, whatsappSent: waStatus === 'SENT' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create appointment' }); }
});

app.post('/api/appointments/:id/start', async (req, res) => {
  try {
    const apt = await prisma.appointment.update({
      where: { id: routeId(req) },
      data: { status: 'IN_PROGRESS', actualStartTime: new Date() },
      include: { patient: true, doctor: true },
    });
    res.json(apt);
  } catch { res.status(500).json({ error: 'Failed to start appointment' }); }
});

app.post('/api/appointments/:id/complete', async (req, res) => {
  try {
    const apt = await prisma.appointment.update({
      where: { id: routeId(req) },
      data: { status: 'COMPLETED', actualEndTime: new Date() },
      include: { patient: true, doctor: true },
    });
    res.json(apt);
  } catch { res.status(500).json({ error: 'Failed to complete appointment' }); }
});

app.put('/api/appointments/:id', async (req, res) => {
  try {
    const { status, appointmentDate, doctorId, reason } = req.body;
    const appointment = await prisma.appointment.update({
      where: { id: routeId(req) },
      data: { status, appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined, doctorId, reason },
      include: { patient: true, doctor: true },
    });
    res.json(appointment);
  } catch { res.status(500).json({ error: 'Failed to update appointment' }); }
});

// ─── CONSULTATIONS ────────────────────────────────────────────────────────────
app.get('/api/consultations', async (_req, res) => {
  try {
    const consultations = await withAppointmentMigration(() =>
      prisma.consultation.findMany({
        include: { patient: true, doctor: true, appointment: true, prescription: { include: { items: { include: { medicine: true } } } } },
        orderBy: { createdAt: 'desc' },
      })
    );
    res.json(consultations);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch consultations' }); }
});

app.post('/api/consultations', async (req, res) => {
  try {
    const { patientId, doctorId, appointmentId, diagnosis, treatment, notes, followUpDate, fee } = req.body;
    const consultation = await prisma.consultation.create({
      data: { patientId, doctorId, appointmentId, diagnosis, treatment, notes, followUpDate: followUpDate ? new Date(followUpDate) : null, fee: parseFloat(fee) || 0, status: 'COMPLETED' },
      include: { patient: true, doctor: true },
    });
    if (appointmentId) await prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'COMPLETED' } });
    res.json(consultation);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create consultation' }); }
});

app.post('/api/consultations/:id/prescription', async (req, res) => {
  try {
    const consultation = await prisma.consultation.findUnique({ where: { id: routeId(req) } });
    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
    const { items, notes } = req.body;
    const prescription = await prisma.prescription.create({
      data: {
        consultationId: routeId(req), patientId: consultation.patientId, notes,
        items: { create: items.map((i: any) => ({ medicineId: i.medicineId, dosage: i.dosage, duration: i.duration, quantity: parseInt(i.quantity) })) },
      },
      include: { items: { include: { medicine: true } } },
    });
    res.json(prescription);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create prescription' }); }
});

// ─── MEDICINES / PHARMACY / INVENTORY ─────────────────────────────────────────
app.get('/api/medicines', async (req, res) => {
  try {
    const { lowStock } = req.query;
    const where = lowStock === 'true' ? { stock: { lte: 10 } } : {};
    const medicines = await prisma.medicine.findMany({ where, orderBy: { name: 'asc' } });
    res.json(medicines);
  } catch { res.status(500).json({ error: 'Failed to fetch medicines' }); }
});

app.post('/api/medicines', async (req, res) => {
  try {
    const { name, category, manufacturer, unit, price, stock, minStock, expiryDate } = req.body;
    const count = await prisma.medicine.count();
    const medicine = await prisma.medicine.create({
      data: { medicineId: `MED-${(count + 1).toString().padStart(3, '0')}`, name, category, manufacturer, unit, price: parseFloat(price), stock: parseInt(stock) || 0, minStock: parseInt(minStock) || 10, expiryDate: expiryDate ? new Date(expiryDate) : null },
    });
    res.json(medicine);
  } catch { res.status(500).json({ error: 'Failed to create medicine' }); }
});

app.post('/api/medicines/:id/stock', async (req, res) => {
  try {
    const { type, quantity, notes } = req.body;
    const medicine = await prisma.medicine.findUnique({ where: { id: routeId(req) } });
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
    const qty = parseInt(quantity);
    const newStock = type === 'STOCK_IN' ? medicine.stock + qty : medicine.stock - qty;
    await prisma.medicine.update({ where: { id: routeId(req) }, data: { stock: Math.max(0, newStock) } });
    const movement = await prisma.stockMovement.create({ data: { medicineId: routeId(req), type, quantity: qty, notes } });
    res.json(movement);
  } catch { res.status(500).json({ error: 'Failed to update stock' }); }
});

app.post('/api/pharmacy/dispense', async (req, res) => {
  try {
    const { prescriptionId, medicineId, quantity, patientId, notes } = req.body;
    const medicine = await prisma.medicine.findUnique({ where: { id: medicineId } });
    if (!medicine || medicine.stock < quantity) return res.status(400).json({ error: 'Insufficient stock' });
    await prisma.medicine.update({ where: { id: medicineId }, data: { stock: medicine.stock - quantity } });
    const sale = await prisma.pharmacySale.create({
      data: {
        prescriptionId: prescriptionId || null,
        patientId: patientId || null,
        medicineId,
        quantity: parseInt(quantity),
        total: medicine.price * quantity,
        notes: notes || null,
      },
      include: { medicine: true, patient: true },
    });
    await prisma.stockMovement.create({
      data: { medicineId, type: 'DISPENSED', quantity: parseInt(quantity), notes: patientId ? `Dispensed to patient ${patientId}` : notes },
    });
    res.json(sale);
  } catch { res.status(500).json({ error: 'Failed to dispense medicine' }); }
});

app.get('/api/pharmacy/sales', async (_req, res) => {
  try {
    const sales = await prisma.pharmacySale.findMany({
      include: { medicine: true, patient: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sales);
  } catch { res.status(500).json({ error: 'Failed to fetch sales' }); }
});

app.get('/api/suppliers', async (_req, res) => {
  try { res.json(await prisma.supplier.findMany({ include: { purchases: true } })); }
  catch { res.status(500).json({ error: 'Failed to fetch suppliers' }); }
});

app.post('/api/suppliers', async (req, res) => {
  try { res.json(await prisma.supplier.create({ data: req.body })); }
  catch { res.status(500).json({ error: 'Failed to create supplier' }); }
});

app.get('/api/purchases', async (_req, res) => {
  try { res.json(await prisma.purchase.findMany({ include: { supplier: true }, orderBy: { createdAt: 'desc' } })); }
  catch { res.status(500).json({ error: 'Failed to fetch purchases' }); }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const { supplierId, medicineId, quantity, totalCost, notes } = req.body;
    const purchase = await prisma.purchase.create({ data: { supplierId, medicineId, quantity: parseInt(quantity), totalCost: parseFloat(totalCost), notes } });
    if (medicineId) {
      const med = await prisma.medicine.findUnique({ where: { id: medicineId } });
      if (med) await prisma.medicine.update({ where: { id: medicineId }, data: { stock: med.stock + parseInt(quantity) } });
      await prisma.stockMovement.create({ data: { medicineId, type: 'STOCK_IN', quantity: parseInt(quantity), notes: 'Purchase' } });
    }
    res.json(purchase);
  } catch { res.status(500).json({ error: 'Failed to create purchase' }); }
});

// ─── BILLING ──────────────────────────────────────────────────────────────────
app.get('/api/bills', async (_req, res) => {
  try {
    const bills = await prisma.bill.findMany({ include: { patient: true, items: true }, orderBy: { createdAt: 'desc' } });
    res.json(bills);
  } catch { res.status(500).json({ error: 'Failed to fetch bills' }); }
});

app.get('/api/bills/:id', async (req, res) => {
  try {
    const bill = await prisma.bill.findUnique({
      where: { id: routeId(req) },
      include: { patient: true, items: { include: { medicine: true } } },
    });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    const settings = await prisma.clinicSettings.findUnique({ where: { id: 'default' } });
    res.json({
      ...bill,
      clinic: {
        name: settings?.clinicName || 'Magil Clinic',
        address: 'Magil Clinic Management System',
        phone: '+91 9876543210',
        gstin: 'GSTIN-MAGIL-2026',
      },
    });
  } catch { res.status(500).json({ error: 'Failed to fetch bill' }); }
});

app.post('/api/bills', async (req, res) => {
  try {
    const { patientId, type, items, paymentMethod, gstRate } = req.body;
    if (!patientId) return res.status(400).json({ error: 'Patient is required' });
    if (!items?.length) return res.status(400).json({ error: 'At least one line item is required' });
    const count = await prisma.bill.count();
    const subtotal = items.reduce((s: number, i: any) => s + i.unitPrice * i.quantity, 0);
    const gstAmount = subtotal * (parseFloat(gstRate) || 0.18);
    const total = subtotal + gstAmount;
    const bill = await prisma.bill.create({
      data: {
        billNumber: `INV-2026-${(count + 1).toString().padStart(3, '0')}`,
        patientId, type, subtotal, gstAmount, total, paidAmount: total, paymentStatus: 'PAID', paymentMethod,
        items: { create: items.map((i: any) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.unitPrice * i.quantity, medicineId: i.medicineId })) },
      },
      include: { patient: true, items: true },
    });
    await prisma.income.create({ data: { source: type, description: `Bill ${bill.billNumber}`, amount: total } });
    const settings = await prisma.clinicSettings.findUnique({ where: { id: 'default' } });
    res.json({
      ...bill,
      clinic: {
        name: settings?.clinicName || 'Magil Clinic',
        address: 'Magil Clinic Management System',
        phone: '+91 9876543210',
        gstin: 'GSTIN-MAGIL-2026',
      },
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create bill' }); }
});

// ─── FINANCE ──────────────────────────────────────────────────────────────────
app.get('/api/finance', async (_req, res) => {
  try {
    const [incomes, expenses, bills] = await Promise.all([
      prisma.income.findMany({ orderBy: { date: 'desc' } }),
      prisma.expense.findMany({ orderBy: { date: 'desc' } }),
      prisma.bill.findMany(),
    ]);
    const totalIncome = incomes.reduce((s, i) => s + i.amount, 0) + bills.reduce((s, b) => s + b.paidAmount, 0);
    const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
    res.json({ incomes, expenses, totalIncome, totalExpense, profit: totalIncome - totalExpense });
  } catch { res.status(500).json({ error: 'Failed to fetch finance data' }); }
});

app.post('/api/expenses', async (req, res) => {
  try { res.json(await prisma.expense.create({ data: req.body })); }
  catch { res.status(500).json({ error: 'Failed to create expense' }); }
});

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────
app.get('/api/employees', async (_req, res) => {
  try {
    const employees = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, phone: true, salary: true, department: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json(employees);
  } catch { res.status(500).json({ error: 'Failed to fetch employees' }); }
});

app.get('/api/departments', async (_req, res) => {
  try { res.json(await prisma.department.findMany({ include: { _count: { select: { employees: true } } } })); }
  catch { res.status(500).json({ error: 'Failed to fetch departments' }); }
});

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
app.get('/api/attendance', async (req, res) => {
  try {
    const { date } = req.query;
    const where: any = {};
    if (date) {
      const d = new Date(String(date));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.checkIn = { gte: d, lt: next };
    }
    const records = await prisma.attendance.findMany({ where, include: { user: { select: { name: true, role: true } } }, orderBy: { checkIn: 'desc' } });
    res.json(records);
  } catch { res.status(500).json({ error: 'Failed to fetch attendance' }); }
});

app.post('/api/attendance/checkin', async (req, res) => {
  try {
    const { userId } = req.body;
    const record = await prisma.attendance.create({ data: { userId, checkIn: new Date(), status: 'PRESENT' }, include: { user: { select: { name: true } } } });
    res.json(record);
  } catch { res.status(500).json({ error: 'Failed to check in' }); }
});

app.post('/api/attendance/:id/checkout', async (req, res) => {
  try {
    const record = await prisma.attendance.update({ where: { id: routeId(req) }, data: { checkOut: new Date() }, include: { user: { select: { name: true } } } });
    res.json(record);
  } catch { res.status(500).json({ error: 'Failed to check out' }); }
});

// ─── PAYROLL ──────────────────────────────────────────────────────────────────
app.get('/api/payroll', async (_req, res) => {
  try {
    const payrolls = await prisma.payroll.findMany({ include: { user: { select: { name: true, role: true, email: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(payrolls);
  } catch { res.status(500).json({ error: 'Failed to fetch payroll' }); }
});

app.post('/api/payroll/process', async (req, res) => {
  try {
    const { month, year } = req.body;
    const users = await prisma.user.findMany();
    const payrolls = await Promise.all(users.map(async (u) => {
      const base = u.salary || 40000;
      const deductions = 2000;
      const bonuses = 1000;
      return prisma.payroll.create({
        data: { userId: u.id, month, year: parseInt(year), baseSalary: base, deductions, bonuses, netSalary: base - deductions + bonuses, status: 'PROCESSED', processedAt: new Date() },
        include: { user: { select: { name: true } } },
      });
    }));
    res.json(payrolls);
  } catch { res.status(500).json({ error: 'Failed to process payroll' }); }
});

// ─── CRM / FOLLOW-UPS ─────────────────────────────────────────────────────────
app.get('/api/followups', async (_req, res) => {
  try {
    const followUps = await prisma.followUp.findMany({ include: { patient: true }, orderBy: { scheduledAt: 'asc' } });
    res.json(followUps);
  } catch { res.status(500).json({ error: 'Failed to fetch follow-ups' }); }
});

app.post('/api/followups', async (req, res) => {
  try {
    const followUp = await prisma.followUp.create({ data: { ...req.body, scheduledAt: new Date(req.body.scheduledAt) }, include: { patient: true } });
    res.json(followUp);
  } catch { res.status(500).json({ error: 'Failed to create follow-up' }); }
});

app.put('/api/followups/:id', async (req, res) => {
  try {
    const followUp = await prisma.followUp.update({ where: { id: routeId(req) }, data: req.body, include: { patient: true } });
    res.json(followUp);
  } catch { res.status(500).json({ error: 'Failed to update follow-up' }); }
});

// ─── REMINDERS ────────────────────────────────────────────────────────────────
app.get('/api/reminders', async (_req, res) => {
  try {
    const reminders = await prisma.reminder.findMany({ include: { patient: true }, orderBy: { sendAt: 'asc' } });
    res.json(reminders);
  } catch { res.status(500).json({ error: 'Failed to fetch reminders' }); }
});

app.post('/api/reminders', async (req, res) => {
  try {
    const reminder = await prisma.reminder.create({ data: { ...req.body, sendAt: new Date(req.body.sendAt) }, include: { patient: true } });
    res.json(reminder);
  } catch { res.status(500).json({ error: 'Failed to create reminder' }); }
});

// ─── REPORTS ──────────────────────────────────────────────────────────────────
app.get('/api/reports/:type', async (req, res) => {
  try {
    const { type } = req.params;
    switch (type) {
      case 'patients': return res.json(await prisma.patient.findMany({ include: { _count: { select: { appointments: true, consultations: true } } } }));
      case 'appointments': return res.json(await prisma.appointment.findMany({ include: { patient: true, doctor: true } }));
      case 'doctors': return res.json(await prisma.doctor.findMany({ include: { _count: { select: { appointments: true, consultations: true } } } }));
      case 'financial': {
        const [bills, expenses, incomes] = await Promise.all([prisma.bill.findMany(), prisma.expense.findMany(), prisma.income.findMany()]);
        return res.json({ bills, expenses, incomes, totalRevenue: bills.reduce((s, b) => s + b.total, 0), totalExpenses: expenses.reduce((s, e) => s + e.amount, 0) });
      }
      case 'inventory': return res.json(await prisma.medicine.findMany({ include: { stockMovements: { take: 5, orderBy: { createdAt: 'desc' } } } }));
      case 'pharmacy': return res.json(await prisma.pharmacySale.findMany({ include: { medicine: true, prescription: true }, orderBy: { createdAt: 'desc' } }));
      case 'attendance': return res.json(await prisma.attendance.findMany({ include: { user: { select: { name: true, role: true } } } }));
      default: return res.status(400).json({ error: 'Invalid report type' });
    }
  } catch { res.status(500).json({ error: 'Failed to generate report' }); }
});

// ─── TASKS (Kanban) ───────────────────────────────────────────────────────────
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

app.get('/api/tasks', async (req, res) => {
  try {
    const { email, role, assigneeEmail } = req.query;
    const isSuperAdmin = role === 'DOCTOR_ADMIN';
    const where: { OR?: Array<{ assigneeEmail?: string; assigneeId?: string }> } = {};

    if (!isSuperAdmin) {
      const userEmail = String(email || '');
      const user = userEmail
        ? await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true } })
        : null;
      where.OR = [
        ...(userEmail ? [{ assigneeEmail: userEmail }] : []),
        ...(user ? [{ assigneeId: user.id }] : []),
      ];
      if (!where.OR?.length) return res.json([]);
    } else if (assigneeEmail) {
      where.OR = [{ assigneeEmail: String(assigneeEmail) }];
    }

    const tasks = await prisma.task.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(tasks);
  } catch { res.status(500).json({ error: 'Failed to fetch tasks' }); }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, status, priority, assigneeId, assigneeEmail, createdById, dueDate } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    let resolvedAssigneeId = assigneeId || null;
    let resolvedEmail = assigneeEmail || null;
    if (resolvedAssigneeId && !resolvedEmail) {
      const assignee = await prisma.user.findUnique({ where: { id: resolvedAssigneeId }, select: { email: true } });
      resolvedEmail = assignee?.email || null;
    }

    const maxOrder = await prisma.task.aggregate({
      where: { status: status || 'TODO' },
      _max: { sortOrder: true },
    });

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description || null,
        status: TASK_STATUSES.includes(status) ? status : 'TODO',
        priority: priority || 'MEDIUM',
        assigneeId: resolvedAssigneeId,
        assigneeEmail: resolvedEmail,
        createdById: createdById || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    res.json(task);
  } catch { res.status(500).json({ error: 'Failed to create task' }); }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const id = routeId(req);
    const { title, description, status, priority, assigneeId, assigneeEmail, dueDate } = req.body;
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined && TASK_STATUSES.includes(status)) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (assigneeId !== undefined) data.assigneeId = assigneeId;
    if (assigneeEmail !== undefined) data.assigneeEmail = assigneeEmail;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await prisma.task.update({ where: { id }, data });
    res.json(task);
  } catch { res.status(500).json({ error: 'Failed to update task' }); }
});

app.patch('/api/tasks/:id/move', async (req, res) => {
  try {
    const id = routeId(req);
    const { status, sortOrder } = req.body;
    if (!TASK_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const task = await prisma.task.update({
      where: { id },
      data: {
        status,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
    });
    res.json(task);
  } catch { res.status(500).json({ error: 'Failed to move task' }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: routeId(req) } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Failed to delete task' }); }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'magil-clinic-api' });
});

migrateLegacyAppointmentTokens();

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
