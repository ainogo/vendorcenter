import { pool } from "../../db/pool.js";

// ─── Weekly Slots ──────────────────────────────

export async function getWeeklySlots(vendorId: string) {
  const result = await pool.query(
    `SELECT id, vendor_id as "vendorId", day_of_week as "dayOfWeek",
            start_time as "startTime", end_time as "endTime", is_active as "isActive"
     FROM vendor_weekly_slots WHERE vendor_id = $1 ORDER BY day_of_week, start_time`,
    [vendorId]
  );
  return result.rows;
}

export async function setWeeklySlots(
  vendorId: string,
  slots: { dayOfWeek: number; startTime: string; endTime: string }[]
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM vendor_weekly_slots WHERE vendor_id = $1", [vendorId]);
    for (const s of slots) {
      await client.query(
        `INSERT INTO vendor_weekly_slots (vendor_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [vendorId, s.dayOfWeek, s.startTime, s.endTime]
      );
    }
    await client.query("COMMIT");
    return getWeeklySlots(vendorId);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// ─── Blocked Dates ─────────────────────────────

export async function getBlockedDates(vendorId: string) {
  const result = await pool.query(
    `SELECT id, blocked_date as "blockedDate", reason
     FROM vendor_blocked_dates WHERE vendor_id = $1 AND blocked_date >= CURRENT_DATE
     ORDER BY blocked_date`,
    [vendorId]
  );
  return result.rows;
}

export async function addBlockedDate(vendorId: string, date: string, reason?: string) {
  const result = await pool.query(
    `INSERT INTO vendor_blocked_dates (vendor_id, blocked_date, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (vendor_id, blocked_date) DO UPDATE SET reason = EXCLUDED.reason
     RETURNING id, blocked_date as "blockedDate", reason`,
    [vendorId, date, reason || null]
  );
  return result.rows[0];
}

export async function removeBlockedDate(vendorId: string, date: string) {
  await pool.query(
    "DELETE FROM vendor_blocked_dates WHERE vendor_id = $1 AND blocked_date = $2",
    [vendorId, date]
  );
}

// ─── Available Slots for a Date ────────────────

export async function getAvailableSlots(vendorId: string, date: string) {
  // Check if date is blocked
  const blocked = await pool.query(
    "SELECT 1 FROM vendor_blocked_dates WHERE vendor_id = $1 AND blocked_date = $2",
    [vendorId, date]
  );
  if (blocked.rows.length > 0) return [];

  // Get day of week (0=Sunday, 6=Saturday)
  const d = new Date(date);
  const dow = d.getDay();

  // Get weekly slots for this day
  const slots = await pool.query(
    `SELECT start_time as "startTime", end_time as "endTime"
     FROM vendor_weekly_slots WHERE vendor_id = $1 AND day_of_week = $2 AND is_active = true
     ORDER BY start_time`,
    [vendorId, dow]
  );

  if (slots.rows.length === 0) return [];

  // Get existing bookings for this vendor on this date
  const bookings = await pool.query(
    `SELECT scheduled_time as "scheduledTime"
     FROM bookings
     WHERE vendor_id = $1
       AND scheduled_date = $2
       AND status NOT IN ('cancelled', 'rejected')`,
    [vendorId, date]
  );
  const bookedTimes = new Set(bookings.rows.map((r: { scheduledTime: string }) => r.scheduledTime));

  // Generate 1-hour slots from each time range
  const available: { time: string; booked: boolean }[] = [];
  for (const slot of slots.rows) {
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const [eh, em] = slot.endTime.split(":").map(Number);
    const startMin = sh * 60 + (sm || 0);
    const endMin = eh * 60 + (em || 0);

    for (let m = startMin; m < endMin; m += 60) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      const timeStr = `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
      available.push({ time: timeStr, booked: bookedTimes.has(timeStr) });
    }
  }

  return available;
}
