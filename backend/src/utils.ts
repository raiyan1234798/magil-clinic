// Consulting hours: 5 PM – 9 PM, 15-minute slots
export const CONSULT_START_HOUR = 17;
export const CONSULT_END_HOUR = 21;
export const SLOT_MINUTES = 15;

export function getSlotTimes(tokenNumber: number, date: Date) {
  const slotStart = new Date(date);
  slotStart.setHours(CONSULT_START_HOUR, 0, 0, 0);
  const startMs = slotStart.getTime() + (tokenNumber - 1) * SLOT_MINUTES * 60 * 1000;
  const endMs = startMs + SLOT_MINUTES * 60 * 1000;
  const maxEnd = new Date(date);
  maxEnd.setHours(CONSULT_END_HOUR, 0, 0, 0);
  if (startMs >= maxEnd.getTime()) return null;
  return {
    scheduledSlotStart: new Date(startMs),
    scheduledSlotEnd: new Date(Math.min(endMs, maxEnd.getTime())),
    tokenLabel: `Token ${tokenNumber}`,
  };
}

export function maxTokensPerDay() {
  return ((CONSULT_END_HOUR - CONSULT_START_HOUR) * 60) / SLOT_MINUTES; // 16
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
