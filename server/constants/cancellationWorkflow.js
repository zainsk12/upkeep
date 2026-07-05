// server/constants/cancellationWorkflow.js
//
// Service cancellation workflow — the single source of truth for the
// cancellation reasons a customer may pick, the time-based cancellation
// windows, and the fee computation. Extends the shared workflow engine in
// quoteWorkflow.js (transition map + timeline helpers) rather than replacing
// it. Imported by the Booking model (for enums) and the booking controller.
//
// Window semantics (rules come from config/businessRules.js — never hardcode):
//   free          — plenty of notice; cancel silently, no fee
//   early_warning — inside freeCancellationWindowHours; courtesy warning, no fee
//   late_warning  — inside warningWindowHours; strong warning, no fee
//   fee_required  — inside chargeWindowHours; fee = max(percent of quote, minimum)
//
// The time/fee rules only apply once a quotation has been ACCEPTED (status
// "confirmed"). Earlier stages (pending / quote sent / rejected / revision)
// always resolve to "free" regardless of the clock.
//
// NO-SHOW (future): a verified no-show flow will reuse this module by adding
// its own window + a Payment purpose ("no_show_fee") — computeCancellation-
// Context is a pure function of (booking, rules, now), so it composes cleanly.

const { getHoursRemaining } = require("../utils/scheduleTime");
const { CANCELLATION_TRANSITIONS } = require("./quoteWorkflow");

// Predefined cancellation reasons shown to the customer. "Other" requires a
// free-text comment. Mirrored by the client (MyBookingsPage cancel modal).
const CANCELLATION_REASONS = [
  "No longer required",
  "Found another provider",
  "Scheduling conflict",
  "Price too high",
  "Booked by mistake",
  "Duplicate booking",
  "Other",
];

const CANCELLATION_WINDOWS = {
  FREE:          "free",
  EARLY_WARNING: "early_warning",
  LATE_WARNING:  "late_warning",
  FEE_REQUIRED:  "fee_required",
};

// window → human label. Stored in timeline meta and shown in notifications so
// admins read "Late Cancellation", not an internal slug.
const CANCELLATION_WINDOW_LABELS = {
  [CANCELLATION_WINDOWS.FREE]:          "Free Cancellation",
  [CANCELLATION_WINDOWS.EARLY_WARNING]: "Early Cancellation",
  [CANCELLATION_WINDOWS.LATE_WARNING]:  "Late Cancellation",
  [CANCELLATION_WINDOWS.FEE_REQUIRED]:  "Last-Minute Cancellation",
};

// Statuses a customer may cancel from — derived from the engine's transition
// map so the two can never drift apart. Powers the Booking model's `canCancel`
// flag, which is what clients use to show/hide the Cancel action.
const CANCELLABLE_STATUSES = Object.keys(CANCELLATION_TRANSITIONS);

// Statuses where cancellation is refused and the customer is guided toward
// support / issue reporting instead. "in_progress" doesn't exist as a status
// yet — listing it now means the guard is already correct when it lands.
const SUPPORT_GUIDED_STATUSES = ["in_progress", "completed"];

// How the cancellation fee was settled — stored on booking.cancellation and
// echoed in notifications. Single source of truth for the Booking model enum
// and every consumer (controller, notification service).
const CANCELLATION_PAYMENT_STATUSES = {
  NOT_REQUIRED: "not_required",
  PAID:         "paid",
  WAIVED:       "waived",
};

/** Fee formula: max(percent of the approved quote, minimum). Whole rupees. */
function computeCancellationFee(quoteTotal, rules) {
  const percentFee = Math.round(((quoteTotal || 0) * rules.cancellationFeePercent) / 100);
  return Math.max(percentFee, rules.minimumCancellationFee);
}

/** Map hours-remaining onto a cancellation window using the active rules. */
function resolveWindow(hoursRemaining, rules) {
  // Unparsable schedule (legacy record) — fail open: never charge a fee we
  // can't justify with a verifiable time computation.
  if (hoursRemaining === null) return CANCELLATION_WINDOWS.FREE;
  // Slot already passed — this is never a "late cancellation"; the future
  // no-show workflow owns that case, and a fee must never be computed for it.
  // (The controller blocks past-slot cancellations before reaching here; this
  // clamp is defence in depth for any other caller.)
  if (hoursRemaining <= 0) return CANCELLATION_WINDOWS.FREE;
  if (hoursRemaining > rules.freeCancellationWindowHours) return CANCELLATION_WINDOWS.FREE;
  if (hoursRemaining > rules.warningWindowHours) return CANCELLATION_WINDOWS.EARLY_WARNING;
  if (hoursRemaining > rules.chargeWindowHours)  return CANCELLATION_WINDOWS.LATE_WARNING;
  return CANCELLATION_WINDOWS.FEE_REQUIRED;
}

/**
 * Compute the full cancellation context for a booking at a point in time.
 * Pure — no I/O, no mutation — so the preview endpoint and the final cancel
 * endpoint share one authoritative computation.
 */
function computeCancellationContext(booking, rules, now = new Date()) {
  const hoursRemaining = getHoursRemaining(booking, now);
  // Fee/warning windows only bind after quote acceptance.
  const window =
    booking.status === "confirmed"
      ? resolveWindow(hoursRemaining, rules)
      : CANCELLATION_WINDOWS.FREE;
  const quoteTotal =
    booking.quotation && booking.quotation.total > 0
      ? booking.quotation.total
      : booking.price || 0;
  // A fee may only ever be derived from an amount the customer actually
  // approved — the structured quotation, or its legacy `price` mirror. With no
  // valid approved amount (null/zero/corrupt quote, legacy record) the
  // minimum-fee floor must never manufacture a charge: cancellation is free.
  const feeApplies =
    window === CANCELLATION_WINDOWS.FEE_REQUIRED && quoteTotal > 0;
  const fee = feeApplies ? computeCancellationFee(quoteTotal, rules) : 0;

  return {
    window,
    windowLabel: CANCELLATION_WINDOW_LABELS[window],
    hoursRemaining: hoursRemaining === null ? null : Math.round(hoursRemaining * 100) / 100,
    quoteTotal,
    fee,
    requiresPayment: feeApplies && rules.requirePaymentBeforeCancellation,
  };
}

module.exports = {
  CANCELLATION_REASONS,
  CANCELLATION_WINDOWS,
  CANCELLABLE_STATUSES,
  SUPPORT_GUIDED_STATUSES,
  CANCELLATION_PAYMENT_STATUSES,
  computeCancellationContext,
};
