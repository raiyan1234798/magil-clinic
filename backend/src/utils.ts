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
