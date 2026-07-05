// server/config/businessRules.js
//
// Centralized business-rule configuration — the single source of truth for
// operational policy values (cancellation windows, fees, penalties). No other
// module may hardcode these numbers; everything resolves through the getters
// below.
//
// Resolution order per value: environment variable → hard-coded default.
// The getters are async on purpose: when the Admin Settings page lands, they
// will additionally read a persisted Settings document (DB → env → default,
// exactly like Settings.getRescheduleHours) without any call-site changes.

const num = (envName, fallback) => {
  const v = parseFloat(process.env[envName]);
  return !isNaN(v) && v >= 0 ? v : fallback;
};
const bool = (envName, fallback) => {
  const v = process.env[envName];
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
};

// ── Service cancellation policy ────────────────────────────────────────────────
// Windows are measured in hours remaining before the scheduled service slot and
// only apply once a quotation has been accepted (status "confirmed"). Earlier
// stages always cancel free of charge.
//
//   remaining > freeCancellationWindowHours              → free, no warning
//   warningWindowHours < remaining ≤ freeCancellation…   → free, courtesy warning
//   chargeWindowHours  < remaining ≤ warningWindowHours  → free, strong warning
//   remaining ≤ chargeWindowHours                        → fee = max(percent, minimum)
const CANCELLATION_DEFAULTS = {
  freeCancellationWindowHours:      num("CANCEL_FREE_WINDOW_HOURS",   24),
  warningWindowHours:               num("CANCEL_WARNING_WINDOW_HOURS", 4),
  chargeWindowHours:                num("CANCEL_CHARGE_WINDOW_HOURS",  2),
  cancellationFeePercent:           num("CANCEL_FEE_PERCENT",         20),
  minimumCancellationFee:           num("CANCEL_FEE_MINIMUM",        100),
  requirePaymentBeforeCancellation: bool("CANCEL_REQUIRE_PAYMENT",   true),
  // Reserved for the future booking-priority module: late cancellations may
  // lower a customer's priority during high-demand periods. Not enforced yet.
  priorityPenaltyEnabled:           bool("CANCEL_PRIORITY_PENALTY",  true),
};

/**
 * Resolve the active cancellation rules. Currently env/defaults only; the
 * Admin Settings page will layer a DB read on top (hence async).
 */
async function getCancellationRules() {
  return { ...CANCELLATION_DEFAULTS };
}

module.exports = {
  CANCELLATION_DEFAULTS,
  getCancellationRules,
};
