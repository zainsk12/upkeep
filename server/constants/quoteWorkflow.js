// server/constants/quoteWorkflow.js
//
// Quote rejection / revision workflow — the single source of truth for the
// rejection reasons a customer may pick and the status transitions the
// state-driven workflow permits. Imported by the Booking model (for enums)
// and the booking/admin controllers (for transition guards).
//
// Status vocabulary (existing lowercase style is kept):
//   awaiting_user_confirmation → the quote has been SENT to the customer
//   quote_rejected             → customer rejected the quote
//   revision_requested         → customer asked for a revised quotation
//   closed                     → customer closed the request after rejecting

// Predefined rejection reasons shown to the customer. "Other" requires a
// free-text comment. Mirrored by the client (MyBookingsPage reject modal).
const REJECTION_REASONS = [
  "Too expensive",
  "Found another provider",
  "Scope of work is incorrect",
  "Service no longer required",
  "Need a revised quotation",
  "Other",
];

// Allowed status transitions for the quote workflow. Anything not listed here
// is rejected by canTransition(). Transitions outside this map (e.g. admin
// cancelling a pending booking) are governed by their own controller guards.
const QUOTE_TRANSITIONS = {
  awaiting_user_confirmation: ["quote_rejected"],
  quote_rejected:             ["revision_requested", "closed"],
  revision_requested:         ["awaiting_user_confirmation"],
};

const canTransition = (from, to) =>
  Array.isArray(QUOTE_TRANSITIONS[from]) && QUOTE_TRANSITIONS[from].includes(to);

// Timeline event → human label. Stored on each history entry so old clients
// (and emails/exports) can render entries without a lookup table.
const HISTORY_LABELS = {
  requested:           "Service Requested",
  quote_sent:          "Quote Sent",
  quote_rejected:      "Quote Rejected",
  revision_requested:  "Revised Quote Requested",
  revised_quote_sent:  "Revised Quote Sent",
  confirmed:           "Quote Accepted — Booking Confirmed",
  worker_assigned:     "Worker Assigned",
  completed:           "Service Completed",
  cancelled:           "Booking Cancelled",
  closed:              "Request Closed",
};

/**
 * Append an event to a booking's activity timeline (in memory — caller saves).
 * `by` is who performed the action: "customer" | "admin" | "system".
 * History is append-only: revisions extend it, never replace it.
 */
function pushHistory(booking, event, by = "system", meta = {}) {
  if (!Array.isArray(booking.history)) booking.history = [];
  booking.history.push({
    event,
    label: HISTORY_LABELS[event] || event,
    by,
    at: new Date(),
    meta,
  });
}

module.exports = {
  REJECTION_REASONS,
  QUOTE_TRANSITIONS,
  HISTORY_LABELS,
  canTransition,
  pushHistory,
};
