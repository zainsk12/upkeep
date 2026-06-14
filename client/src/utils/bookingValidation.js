// client/src/utils/bookingValidation.js
//
// MODULE 2 — SMART BOOKING & SCHEDULING VALIDATION
// Single source of truth for all date/time validation logic on the frontend.
// Mirror logic also exists on the server (server/utils/bookingValidation.js).

// ─── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Returns today's date as a YYYY-MM-DD string using the device's LOCAL timezone.
 *
 * ⚠️  Do NOT use `new Date().toISOString().split("T")[0]` — that gives the UTC
 *     date, which can be one day behind for IST (UTC+5:30) users after midnight.
 *
 * @param {Date} [d]  Defaults to now. Injected in tests.
 * @returns {string}  e.g. "2026-05-08"
 */
export function getLocalDateString(d = new Date()) {
  const y   = d.getFullYear();
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mon}-${day}`;
}

/**
 * True when the given YYYY-MM-DD string is strictly before today (local).
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isPastDate(dateStr) {
  if (!dateStr) return false;
  return dateStr < getLocalDateString();
}

/**
 * True when the given YYYY-MM-DD string is today (local).
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isToday(dateStr) {
  if (!dateStr) return false;
  return dateStr === getLocalDateString();
}

// ─── Time helpers ──────────────────────────────────────────────────────────────

/**
 * Parses a 12-hour time-slot string into total minutes since midnight.
 * Supports the format used by TIME_SLOTS: "9:00 AM", "12:00 PM", "1:00 PM" …
 *
 * @param {string} slot  e.g. "9:00 AM"
 * @returns {number}     Minutes since midnight (0-1439), or -1 on parse failure.
 */
export function parseSlotToMinutes(slot) {
  if (!slot) return -1;
  const m = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return -1;
  let h   = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/**
 * Returns the current local time as minutes since midnight.
 * @param {Date} [now]  Defaults to new Date(). Injected in tests.
 * @returns {number}
 */
export function getNowInMinutes(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes();
}

// ─── Core slot-status logic ────────────────────────────────────────────────────

/**
 * Determines the availability status of a single time slot.
 *
 * Rules (in priority order):
 *  1. No date selected         → always enabled  (don't restrict prematurely)
 *  2. Selected date is past    → disabled         (shouldn't reach here if date
 *                                                  picker has min= guard, but
 *                                                  protects against direct input)
 *  3. Selected date is future  → always enabled
 *  4. Selected date is today   → disabled if slot's start time ≤ current time
 *
 * @param {string} slot          e.g. "9:00 AM"
 * @param {string} selectedDate  YYYY-MM-DD string from the date input
 * @param {Date}   [now]         Injected in tests; defaults to new Date()
 * @returns {{ disabled: boolean, reason: string }}
 */
export function getSlotStatus(slot, selectedDate, now = new Date()) {
  // Rule 1 — no date selected yet
  if (!selectedDate) return { disabled: false, reason: "" };

  // Rule 2 — past date (guard)
  if (isPastDate(selectedDate)) {
    return { disabled: true, reason: "Past dates cannot be selected" };
  }

  // Rule 3 — future date
  if (!isToday(selectedDate)) {
    return { disabled: false, reason: "" };
  }

  // Rule 4 — today: compare slot minutes vs now
  const slotMins = parseSlotToMinutes(slot);
  const nowMins  = getNowInMinutes(now);

  if (slotMins <= nowMins) {
    return { disabled: true, reason: "This time slot is no longer available" };
  }

  return { disabled: false, reason: "" };
}

/**
 * Maps an array of slot strings to enriched availability objects.
 *
 * @param {string[]} slots
 * @param {string}   selectedDate  YYYY-MM-DD
 * @param {Date}     [now]
 * @returns {{ slot: string, disabled: boolean, reason: string }[]}
 */
export function getAvailableSlots(slots, selectedDate, now = new Date()) {
  return slots.map((slot) => ({
    slot,
    ...getSlotStatus(slot, selectedDate, now),
  }));
}

/**
 * Returns true if ALL slots are disabled for the given date/time combination.
 * Useful for showing a "no slots available today" message.
 *
 * @param {string[]} slots
 * @param {string}   selectedDate
 * @param {Date}     [now]
 * @returns {boolean}
 */
export function allSlotsDisabled(slots, selectedDate, now = new Date()) {
  return slots.every(
    (slot) => getSlotStatus(slot, selectedDate, now).disabled
  );
}