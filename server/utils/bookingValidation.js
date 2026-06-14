// server/utils/bookingValidation.js
//
// MODULE 2 — SMART BOOKING & SCHEDULING VALIDATION  (server-side)
// Server is the authoritative source of truth — this runs after the frontend
// check and catches any client-side bypass attempts (e.g., Postman, devtools).
//
// Mirror validation also exists on the client
// (client/src/utils/bookingValidation.js).

// ─── Allowed time slots (must stay in sync with TIME_SLOTS in ServicesPage) ──
const VALID_TIME_SLOTS = [
  "9:00 AM",  "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM",  "2:00 PM",
  "3:00 PM",  "4:00 PM",  "5:00 PM",
];

// IST offset in minutes (UTC+5:30). Hardcoded because this app is India-only.
// Using an explicit offset makes all date/time logic deterministic regardless
// of the server's TZ environment variable or hosting timezone.
const IST_OFFSET_MINUTES = 5 * 60 + 30;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a Date shifted to IST by applying the fixed UTC+5:30 offset.
 * All subsequent getUTC* calls on the returned date reflect IST wall-clock time.
 *
 * @param {Date} [d]
 * @returns {Date}
 */
function toIST(d = new Date()) {
  return new Date(d.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
}

/**
 * Returns a YYYY-MM-DD date string in IST, independent of server timezone.
 *
 * @param {Date} [d]
 * @returns {string}
 */
function toLocalDateString(d = new Date()) {
  const ist = toIST(d);
  const y   = ist.getUTCFullYear();
  const mon = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${y}-${mon}-${day}`;
}

/**
 * Parses a 12-hour time-slot string into total minutes since midnight.
 * Accepts the format produced by TIME_SLOTS: "9:00 AM", "12:00 PM" etc.
 *
 * @param {string} slot
 * @returns {number}  minutes since midnight, or -1 on parse failure
 */
function parseSlotToMinutes(slot) {
  if (!slot) return -1;
  const m = slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return -1;
  let h      = parseInt(m[1], 10);
  const min  = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

// ─── Main validator ────────────────────────────────────────────────────────────

/**
 * Validates a booking's date and time against the server's current clock.
 *
 * All comparisons are done in IST (UTC+5:30) so the result is the same
 * regardless of the server's TZ environment variable.
 *
 * Validations (in order):
 *  1. Both date and time must be present.
 *  2. `timeStr` must be one of the known VALID_TIME_SLOTS.
 *  3. `dateStr` must not be in the past (compared to today in IST).
 *  4. If `dateStr` is today, the slot must not have already passed.
 *
 * @param {string} dateStr  YYYY-MM-DD as sent by the client
 * @param {string} timeStr  e.g. "9:00 AM" as sent by the client
 * @param {Date}   [now]    Injectable for testing; defaults to new Date()
 * @returns {{ valid: boolean, message: string }}
 */
function validateBookingDateTime(dateStr, timeStr, now = new Date()) {
  // ── 1. Presence check ────────────────────────────────────────────────────
  if (!dateStr || !timeStr) {
    return { valid: false, message: "Date and time are required." };
  }

  // ── 2. Known-slot whitelist (prevents arbitrary strings) ─────────────────
  if (!VALID_TIME_SLOTS.includes(timeStr)) {
    return {
      valid: false,
      message: `"${timeStr}" is not a valid booking time slot.`,
    };
  }

  const todayStr = toLocalDateString(now);

  // ── 3. Reject past dates ─────────────────────────────────────────────────
  if (dateStr < todayStr) {
    return {
      valid: false,
      message: "Bookings cannot be made for past dates.",
    };
  }

  // ── 4. Same-day: reject elapsed slots ────────────────────────────────────
  if (dateStr === todayStr) {
    const slotMins = parseSlotToMinutes(timeStr);
    if (slotMins === -1) {
      return { valid: false, message: "Invalid time slot format." };
    }
    // Derive current IST hours/minutes from the UTC-shifted value — deterministic
    // regardless of server OS timezone.
    const ist     = toIST(now);
    const nowMins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    if (slotMins <= nowMins) {
      return {
        valid: false,
        message:
          "This time slot has already passed. Please select a future time slot.",
      };
    }
  }

  return { valid: true, message: "" };
}

module.exports = { validateBookingDateTime, VALID_TIME_SLOTS, parseSlotToMinutes };