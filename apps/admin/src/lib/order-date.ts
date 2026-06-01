// Local-timezone helpers for the offline-order date picker.
//
// Earth Revibe is India-only, so the admin's browser clock (IST) is taken as
// the source of truth for "what day did this sale happen". An <input type="date">
// speaks YYYY-MM-DD; the API wants an ISO timestamp. These convert between the
// two without tripping over the midnight-UTC boundary.

/** Extract the local-calendar day (YYYY-MM-DD) from a Date or ISO string. */
export function isoToLocalDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today as YYYY-MM-DD in the admin's local timezone (picker default + `max`). */
export function todayLocalDate(): string {
  return isoToLocalDate(new Date());
}

/**
 * Turn a picked YYYY-MM-DD into an ISO timestamp for the API: the chosen
 * calendar day at the current time-of-day, in the admin's local timezone. The
 * current time-of-day keeps the order squarely inside the chosen day (a bare
 * 00:00 could slip to the previous day once converted to UTC) and reads as a
 * real timestamp rather than midnight.
 */
export function localDateToISO(picked: string): string {
  const [y, m, d] = picked.split('-').map(Number);
  const now = new Date();
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds()).toISOString();
}
