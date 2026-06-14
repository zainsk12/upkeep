// server/models/Settings.js
// Singleton collection — only ever one document per key.
// Stores admin-configurable settings that must survive server restarts.

const mongoose = require("mongoose");

// ── Centralized defaults ───────────────────────────────────────────────────────
// Each default is driven by an environment variable first, then a hard-coded
// fallback. This is the ONLY place these values are defined — schema defaults,
// seed logic, and static helpers all reference this object so there is no
// duplication of "magic numbers" across the codebase.
const DEFAULTS = {
  // Review settings
  REVIEW_THRESHOLD: (() => {
    const v = parseInt(process.env.REVIEW_THRESHOLD_DEFAULT, 10);
    return !isNaN(v) && v >= 1 && v <= 5 ? v : 4;
  })(),

  // Booking / reschedule settings
  MIN_HOURS_BEFORE_RESCHEDULE: (() => {
    const v = parseFloat(process.env.MIN_HOURS_BEFORE_RESCHEDULE);
    return !isNaN(v) && v >= 0 ? v : 2;
  })(),

  // Booking field length limits
  BOOKING_LIMIT_ADDRESS: (() => {
    const v = parseInt(process.env.BOOKING_LIMIT_ADDRESS, 10);
    return !isNaN(v) && v > 0 ? v : 300;
  })(),
  BOOKING_LIMIT_SERVICE_ISSUE: (() => {
    const v = parseInt(process.env.BOOKING_LIMIT_SERVICE_ISSUE, 10);
    return !isNaN(v) && v > 0 ? v : 1000;
  })(),
  BOOKING_LIMIT_NOTES: (() => {
    const v = parseInt(process.env.BOOKING_LIMIT_NOTES, 10);
    return !isNaN(v) && v > 0 ? v : 500;
  })(),
};

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },

    // ── Review settings ──────────────────────────────────────────────────────
    reviewThreshold: {
      type:    Number,
      default: null, // null = defer to DEFAULTS.REVIEW_THRESHOLD
      min: 1,
      max: 5,
    },

    // ── Booking / reschedule settings ────────────────────────────────────────
    minHoursBeforeReschedule: {
      type:    Number,
      default: null, // null = defer to DEFAULTS.MIN_HOURS_BEFORE_RESCHEDULE
      min: 0,
    },

    // ── Booking field length limits ──────────────────────────────────────────
    maxAddressLength: {
      type:    Number,
      default: null, // null = defer to DEFAULTS.BOOKING_LIMIT_ADDRESS
      min: 1,
    },
    maxServiceIssueLength: {
      type:    Number,
      default: null, // null = defer to DEFAULTS.BOOKING_LIMIT_SERVICE_ISSUE
      min: 1,
    },
    maxNotesLength: {
      type:    Number,
      default: null, // null = defer to DEFAULTS.BOOKING_LIMIT_NOTES
      min: 1,
    },
  },
  { timestamps: true }
);

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns true if value is a non-null finite number. */
function isSet(v) {
  return v !== null && v !== undefined && !isNaN(v);
}

// ── Review threshold ───────────────────────────────────────────────────────────

/**
 * getReviewThreshold()
 * Resolution order:
 *   1. Value persisted in the "reviewSettings" document.
 *   2. REVIEW_THRESHOLD_DEFAULT environment variable.
 *   3. Hard-coded fallback (4).
 */
settingsSchema.statics.getReviewThreshold = async function () {
  const doc = await this.findOne({ key: "reviewSettings" });
  if (doc && isSet(doc.reviewThreshold)) return doc.reviewThreshold;
  return DEFAULTS.REVIEW_THRESHOLD;
};

/**
 * setReviewThreshold(value)
 * Persists a new threshold. Upserts the "reviewSettings" singleton.
 */
settingsSchema.statics.setReviewThreshold = async function (value) {
  const doc = await this.findOneAndUpdate(
    { key: "reviewSettings" },
    { $set: { reviewThreshold: value } },
    { upsert: true, new: true }
  );
  return doc.reviewThreshold;
};

// ── Reschedule hours ───────────────────────────────────────────────────────────

/**
 * getRescheduleHours()
 * Resolution order:
 *   1. Value persisted in the "bookingSettings" document (admin-set).
 *   2. MIN_HOURS_BEFORE_RESCHEDULE environment variable.
 *   3. Hard-coded fallback (2).
 *
 * Value of 0 disables the guard entirely.
 */
settingsSchema.statics.getRescheduleHours = async function () {
  const doc = await this.findOne({ key: "bookingSettings" });
  if (doc && isSet(doc.minHoursBeforeReschedule)) return doc.minHoursBeforeReschedule;
  return DEFAULTS.MIN_HOURS_BEFORE_RESCHEDULE;
};

/**
 * setRescheduleHours(value)
 * Persists a new minimum-hours value. Upserts the "bookingSettings" singleton.
 */
settingsSchema.statics.setRescheduleHours = async function (value) {
  const doc = await this.findOneAndUpdate(
    { key: "bookingSettings" },
    { $set: { minHoursBeforeReschedule: value } },
    { upsert: true, new: true }
  );
  return doc.minHoursBeforeReschedule;
};

// ── Booking field length limits ────────────────────────────────────────────────

/**
 * getBookingFieldLimits()
 * Returns the maximum character lengths for free-text booking fields.
 * Resolution order per field:
 *   1. Value persisted in the "bookingSettings" document (admin-set).
 *   2. BOOKING_LIMIT_* environment variables.
 *   3. Hard-coded fallbacks (address=300, serviceIssue=1000, notes=500).
 *
 * Returns: { address: number, serviceIssue: number, notes: number }
 */
settingsSchema.statics.getBookingFieldLimits = async function () {
  const doc = await this.findOne({ key: "bookingSettings" });
  return {
    address:      (doc && isSet(doc.maxAddressLength))      ? doc.maxAddressLength      : DEFAULTS.BOOKING_LIMIT_ADDRESS,
    serviceIssue: (doc && isSet(doc.maxServiceIssueLength)) ? doc.maxServiceIssueLength : DEFAULTS.BOOKING_LIMIT_SERVICE_ISSUE,
    notes:        (doc && isSet(doc.maxNotesLength))        ? doc.maxNotesLength        : DEFAULTS.BOOKING_LIMIT_NOTES,
  };
};

/**
 * setBookingFieldLimits({ address, serviceIssue, notes })
 * Persists updated field limits. Only fields explicitly passed are updated.
 * Upserts the "bookingSettings" singleton.
 */
settingsSchema.statics.setBookingFieldLimits = async function ({ address, serviceIssue, notes } = {}) {
  const update = {};
  if (isSet(address))      update.maxAddressLength      = address;
  if (isSet(serviceIssue)) update.maxServiceIssueLength = serviceIssue;
  if (isSet(notes))        update.maxNotesLength        = notes;

  const doc = await this.findOneAndUpdate(
    { key: "bookingSettings" },
    { $set: update },
    { upsert: true, new: true }
  );

  return {
    address:      isSet(doc.maxAddressLength)      ? doc.maxAddressLength      : DEFAULTS.BOOKING_LIMIT_ADDRESS,
    serviceIssue: isSet(doc.maxServiceIssueLength) ? doc.maxServiceIssueLength : DEFAULTS.BOOKING_LIMIT_SERVICE_ISSUE,
    notes:        isSet(doc.maxNotesLength)        ? doc.maxNotesLength        : DEFAULTS.BOOKING_LIMIT_NOTES,
  };
};

// Export DEFAULTS so other modules (e.g. configRoutes) can reference them
// without re-parsing env vars.
settingsSchema.statics.DEFAULTS = DEFAULTS;

module.exports = mongoose.model("Settings", settingsSchema);