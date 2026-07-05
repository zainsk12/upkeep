// server/utils/scheduleTime.js
//
// Shared scheduled-time math — the single implementation of "when exactly is
// this booking's slot, and how far away is it". Every workflow that reasons
// about the scheduled instant (service cancellation, reschedule, the future
// no-show flow) MUST use these helpers so their time windows can never
// disagree. All math uses the explicit IST offset from bookingValidation, so
// results are deterministic regardless of the server's TZ environment.

const { parseSlotToMinutes, IST_OFFSET_MINUTES } = require("./bookingValidation");

/**
 * Resolve the exact UTC instant of the booking's scheduled slot.
 * `booking.date` is stored as UTC midnight of the IST calendar day and
 * `booking.time` is an IST wall-clock slot ("9:00 AM"), so the real instant is
 * midnight + slot − IST offset. Returns null when the slot can't be parsed
 * (legacy/corrupt records).
 */
function getScheduledInstant(booking) {
  if (!booking?.date) return null;
  const slotMins = parseSlotToMinutes(booking.time);
  if (slotMins === -1) return null;
  const base = new Date(booking.date);
  if (isNaN(base.getTime())) return null;
  return new Date(base.getTime() + (slotMins - IST_OFFSET_MINUTES) * 60 * 1000);
}

/** Hours from `now` until the scheduled slot (negative = slot has passed). */
function getHoursRemaining(booking, now = new Date()) {
  const at = getScheduledInstant(booking);
  if (!at) return null;
  return (at.getTime() - now.getTime()) / (1000 * 60 * 60);
}

/** True when the booking's scheduled slot is already in the past. */
function hasSlotPassed(booking, now = new Date()) {
  const hoursRemaining = getHoursRemaining(booking, now);
  return hoursRemaining !== null && hoursRemaining <= 0;
}

module.exports = {
  getScheduledInstant,
  getHoursRemaining,
  hasSlotPassed,
};
