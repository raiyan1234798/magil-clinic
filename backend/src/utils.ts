// Default consulting hours: 5 PM – 9 PM, 15-minute slots
export const CONSULT_START_HOUR = 17;
export const CONSULT_END_HOUR = 21;
export const SLOT_MINUTES = 15;

export type ClinicHoursConfig = {
  consultStartHour: number;
  consultEndHour: number;
  slotMinutes: number;
};

export const DEFAULT_INTEGRATIONS: Record<string, boolean> = {
  whatsapp: true,
  sms: true,
  email: true,
  pdfReports: true,
  printer: true,
  googleCalendar: false,
};

export const DEFAULT_AUTOMATION: Record<string, boolean> = {
  appointmentReminders: true,
  followUpReminders: true,
  medicineReminders: true,
  invoiceGeneration: true,
  stockAlerts: true,
  attendanceTracking: true,
  payrollProcessing: true,
};

export function parseSettingsJson(raw: string | null | undefined, defaults: Record<string, boolean>) {
  if (!raw || raw === '{}') return { ...defaults };
  try {
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function formatConsultHoursLabel(startHour: number, endHour: number) {
  const fmt = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour}:00 ${period}`;
  };
  return `${fmt(startHour)} – ${fmt(endHour)}`;
}

export function getSlotTimes(tokenNumber: number, date: Date, config?: ClinicHoursConfig) {
  const startHour = config?.consultStartHour ?? CONSULT_START_HOUR;
  const endHour = config?.consultEndHour ?? CONSULT_END_HOUR;
  const slotMinutes = config?.slotMinutes ?? SLOT_MINUTES;
  const slotStart = new Date(date);
  slotStart.setHours(startHour, 0, 0, 0);
  const startMs = slotStart.getTime() + (tokenNumber - 1) * slotMinutes * 60 * 1000;
  const endMs = startMs + slotMinutes * 60 * 1000;
  const maxEnd = new Date(date);
  maxEnd.setHours(endHour, 0, 0, 0);
  if (startMs >= maxEnd.getTime()) return null;
  return {
    scheduledSlotStart: new Date(startMs),
    scheduledSlotEnd: new Date(Math.min(endMs, maxEnd.getTime())),
    tokenLabel: `Token ${tokenNumber}`,
  };
}

export function maxTokensPerDay(config?: ClinicHoursConfig) {
  const startHour = config?.consultStartHour ?? CONSULT_START_HOUR;
  const endHour = config?.consultEndHour ?? CONSULT_END_HOUR;
  const slotMinutes = config?.slotMinutes ?? SLOT_MINUTES;
  return ((endHour - startHour) * 60) / slotMinutes;
}

export function formatTime12(date: Date) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  DOCTOR_ADMIN: ['*'],
  NURSE_RECEPTIONIST: ['/', '/patients', '/appointments', '/consultations', '/billing', '/crm', '/reminders'],
  PHARMACIST: ['/', '/pharmacy', '/inventory', '/patients'],
  FINANCE_MANAGER: ['/', '/billing', '/finance', '/payroll', '/reports', '/employees'],
};

export function canAccess(role: string, path: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes('*')) return true;
  return perms.some((p) => path === p || (p !== '/' && path.startsWith(p)));
}

export async function sendWhatsAppReminder(phone: string, message: string): Promise<'SENT' | 'SCHEDULED'> {
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (apiKey) {
    // Production: integrate Twilio/Meta WhatsApp Business API here
    console.log(`[WhatsApp] To ${phone}: ${message}`);
    return 'SENT';
  }
  console.log(`[WhatsApp SIMULATION] To ${phone}: ${message}`);
  return 'SENT';
}

export type WhatsAppTemplate =
  | 'APPOINTMENT_SCHEDULED'
  | 'NOT_SCHEDULED'
  | 'DOCTOR_NOT_PRESENT'
  | 'BOOKING_CONFIRMED'
  | 'CUSTOM';

type AppointmentForMessage = {
  patient: { name: string; phoneNumber: string };
  doctor?: { name: string } | null;
  appointmentDate: Date;
  scheduledSlotStart?: Date | null;
  scheduledSlotEnd?: Date | null;
  tokenLabel?: string | null;
  tokenNumber?: number | null;
  appointmentType?: string;
  isWalkIn?: boolean;
};

function formatDateIN(date: Date) {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function buildAppointmentWhatsAppMessage(
  appointment: AppointmentForMessage,
  template: WhatsAppTemplate,
  customMessage?: string
): string {
  if (template === 'CUSTOM' && customMessage?.trim()) return customMessage.trim();

  const patientName = appointment.patient.name;
  const rawDoctor = appointment.doctor?.name || 'the doctor';
  const doctorName = rawDoctor.replace(/^Dr\.?\s*/i, '');
  const slotStart = appointment.scheduledSlotStart || appointment.appointmentDate;
  const date = formatDateIN(slotStart);
  const time = formatTime12(slotStart);
  const tokenLabel = appointment.tokenLabel || `Token ${appointment.tokenNumber}`;

  switch (template) {
    case 'APPOINTMENT_SCHEDULED':
      return `Hi ${patientName}, your phone appointment with Dr. ${doctorName} is confirmed for ${date} at ${time}. Token: ${tokenLabel}. Please be available on your phone.`;
    case 'NOT_SCHEDULED':
      return `Hi ${patientName}, your appointment with Dr. ${doctorName} on ${date} could not be scheduled. Please contact the clinic to rebook.`;
    case 'DOCTOR_NOT_PRESENT':
      return `Hi ${patientName}, Dr. ${doctorName} is not available today (${date}). Please contact us to book a new slot.`;
    case 'BOOKING_CONFIRMED':
    default:
      return `Hi ${patientName}, your appointment with Dr. ${doctorName} is booked for ${date} at ${time}. Token: ${tokenLabel}`;
  }
}

/** Normalize YYYY-MM-DD (or Date) to midnight UTC for consistent storage. */
export function parseAttendanceDate(input?: string | Date): Date {
  if (input instanceof Date) {
    return new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  }
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number) as [number, number, number];
    return new Date(Date.UTC(y, m - 1, d));
  }
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function combineDateAndTime(date: Date, timeStr?: string | null): Date | null {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h, m));
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthDateRange(month: string, year: number) {
  const monthIndex = MONTH_NAMES.findIndex((m) => m.toLowerCase() === month.toLowerCase());
  const idx = monthIndex >= 0 ? monthIndex : new Date().getMonth();
  const start = new Date(Date.UTC(year, idx, 1));
  const end = new Date(Date.UTC(year, idx + 1, 1));
  return { start, end };
}

export type AttendanceCounts = { daysPresent: number; halfDays: number; absentDays: number };

export function countAttendanceStatuses(records: { status: string }[]): AttendanceCounts {
  return records.reduce(
    (acc, r) => {
      if (r.status === 'PRESENT' || r.status === 'LATE') acc.daysPresent += 1;
      else if (r.status === 'HALF_DAY') acc.halfDays += 1;
      else if (r.status === 'ABSENT') acc.absentDays += 1;
      return acc;
    },
    { daysPresent: 0, halfDays: 0, absentDays: 0 }
  );
}

/** Monthly pay from attendance: present = 1 day, half day = 0.5 day, absent = 0 (salary / 30 per day). */
export function calculatePayrollFromAttendance(baseSalary: number, counts: AttendanceCounts, bonuses = 0) {
  const dailyRate = baseSalary / 30;
  const payableDays = counts.daysPresent + counts.halfDays * 0.5;
  const attendancePay = payableDays * dailyRate;
  const deductions = Math.max(0, baseSalary - attendancePay);
  const netSalary = attendancePay + bonuses;
  return { dailyRate, attendancePay, deductions, netSalary, payableDays };
}
