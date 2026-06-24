import Database from 'better-sqlite3';
import path from 'path';
import { getSlotTimes } from './utils';

/** Legacy seed used string tokens (T-101, W-201); schema expects Int. */
export function parseLegacyTokenNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const str = String(value).trim();
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  const tMatch = str.match(/^T-(\d+)$/i);
  if (tMatch?.[1]) {
    const raw = parseInt(tMatch[1], 10);
    const n = raw - 100;
    return n > 0 ? n : raw;
  }
  const wMatch = str.match(/^W-(\d+)$/i);
  if (wMatch?.[1]) {
    const raw = parseInt(wMatch[1], 10);
    const n = raw - 200;
    return n > 0 ? n : raw;
  }
  const digits = str.match(/\d+/)?.[0];
  return digits ? parseInt(digits, 10) : null;
}

type LegacyRow = {
  id: string;
  tokenNumber: string | number | null;
  tokenLabel: string | null;
  appointmentDate: string;
  isWalkIn: number;
  scheduledSlotStart: string | null;
};

export function migrateLegacyAppointmentTokens(dbPath = path.join(__dirname, '..', 'dev.db')): number {
  const db = new Database(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT id, tokenNumber, tokenLabel, appointmentDate, isWalkIn, scheduledSlotStart
         FROM Appointment
         WHERE tokenNumber IS NOT NULL AND typeof(tokenNumber) = 'text'`
      )
      .all() as LegacyRow[];

    if (rows.length === 0) return 0;

    const update = db.prepare(
      `UPDATE Appointment
       SET tokenNumber = ?, tokenLabel = ?, scheduledSlotStart = ?, scheduledSlotEnd = ?,
           appointmentType = ?, isWalkIn = ?
       WHERE id = ?`
    );

    let migrated = 0;
    for (const row of rows) {
      const tokenNum = parseLegacyTokenNumber(row.tokenNumber);
      if (tokenNum === null) continue;

      const isWalkIn = row.isWalkIn === 1 || String(row.tokenNumber).toUpperCase().startsWith('W-');
      const aptDay = new Date(row.appointmentDate);
      aptDay.setHours(0, 0, 0, 0);
      const slot = getSlotTimes(tokenNum, aptDay);
      const tokenLabel = row.tokenLabel || (slot?.tokenLabel ?? `Token ${tokenNum}`);

      update.run(
        tokenNum,
        tokenLabel,
        row.scheduledSlotStart ?? slot?.scheduledSlotStart.toISOString() ?? row.appointmentDate,
        slot?.scheduledSlotEnd.toISOString() ?? null,
        isWalkIn ? 'WALK_IN' : 'PHONE',
        isWalkIn ? 1 : 0,
        row.id
      );
      migrated++;
    }

    if (migrated > 0) {
      console.log(`Migrated ${migrated} legacy appointment token(s) to integer format`);
    }
    return migrated;
  } finally {
    db.close();
  }
}
