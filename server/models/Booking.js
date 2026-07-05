// server/models/Booking.js

const mongoose = require("mongoose");
const {
  REJECTION_REASONS,
  BOOKING_STATUSES,
  RESCHEDULABLE_STATUSES,
} = require("../constants/quoteWorkflow");
const {
  CANCELLATION_REASONS,
  CANCELLATION_WINDOWS,
  CANCELLABLE_STATUSES,
  CANCELLATION_PAYMENT_STATUSES,
} = require("../constants/cancellationWorkflow");

/* ── Quotation breakdown sub-schema ───────────────────────────────────────────
   All line-item fields default to 0 so partial quotations are valid.
   `total` is stored (not virtual) so it survives projection/lean queries.
   `price` on the parent document is kept in sync (= total) for backward compat.
────────────────────────────────────────────────────────────────────────────── */
const quotationSchema = new mongoose.Schema(
  {
    labour:          { type: Number, default: 0, min: 0 },
    materials:       { type: Number, default: 0, min: 0 },
    travel:          { type: Number, default: 0, min: 0 },
    inspection:      { type: Number, default: 0, min: 0 },
    convenience_fee: { type: Number, default: 0, min: 0 },
    tax:             { type: Number, default: 0, min: 0 },
    notes:           { type: String, default: "", trim: true },
    total:           { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

/* ── Quote rejection sub-schema ───────────────────────────────────────────────
   Captured when the customer rejects a quotation. `reason` is one of the
   predefined REJECTION_REASONS; `comment` carries free text (required when
   reason is "Other"). Default null on the parent — fully backward compatible
   with existing bookings.
────────────────────────────────────────────────────────────────────────────── */
const rejectionSchema = new mongoose.Schema(
  {
    reason:     { type: String, enum: REJECTION_REASONS, required: true },
    comment:    { type: String, default: "", trim: true },
    rejectedAt: { type: Date, default: Date.now },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

/* ── Service cancellation sub-schema ──────────────────────────────────────────
   Captured when a booking is cancelled through the customer cancellation
   workflow. `reason` is one of the predefined CANCELLATION_REASONS; `comment`
   carries free text (required when reason is "Other"). Snapshot fields record
   the state the cancellation was evaluated in (stage / timeRemaining / window /
   fee) so history stays auditable even if business rules change later.
   Default null on the parent — fully backward compatible: legacy and
   admin-cancelled bookings simply have no cancellation record.
────────────────────────────────────────────────────────────────────────────── */
const cancellationSchema = new mongoose.Schema(
  {
    reason:      { type: String, enum: CANCELLATION_REASONS, required: true },
    comment:     { type: String, default: "", trim: true },
    requestedAt: { type: Date, default: Date.now },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Actor kind — "customer" today; future workflows may add worker/vendor.
    cancelledBy: { type: String, enum: ["customer", "admin", "system"], default: "customer" },
    // Booking status at the moment of cancellation (e.g. "confirmed").
    stage:       { type: String, default: "", trim: true },
    // Hours until the scheduled slot when cancellation was requested
    // (negative = slot already passed; null = not computable/legacy).
    timeRemaining: { type: Number, default: null },
    window: {
      type: String,
      enum: Object.values(CANCELLATION_WINDOWS),
      default: CANCELLATION_WINDOWS.FREE,
    },
    fee: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: Object.values(CANCELLATION_PAYMENT_STATUSES),
      default: CANCELLATION_PAYMENT_STATUSES.NOT_REQUIRED,
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", default: null },
  },
  { _id: false }
);

/* ── Quotation history entry ──────────────────────────────────────────────────
   Snapshot of a quotation at the moment it was superseded (rejected → revised).
   Append-only: every revision extends this array; the live quotation always
   lives in `quotation`. `revision` is 1-based (1 = the original quote).
────────────────────────────────────────────────────────────────────────────── */
const quotationHistorySchema = new mongoose.Schema(
  {
    revision:         { type: Number, required: true },
    labour:           { type: Number, default: 0 },
    materials:        { type: Number, default: 0 },
    travel:           { type: Number, default: 0 },
    inspection:       { type: Number, default: 0 },
    convenience_fee:  { type: Number, default: 0 },
    tax:              { type: Number, default: 0 },
    notes:            { type: String, default: "", trim: true },
    total:            { type: Number, default: 0 },
    sentAt:           { type: Date, default: null },
    rejectedAt:       { type: Date, default: null },
    rejectionReason:  { type: String, default: "", trim: true },
    rejectionComment: { type: String, default: "", trim: true },
  },
  { _id: false }
);

/* ── Activity timeline entry ──────────────────────────────────────────────────
   Append-only event log rendered as the request timeline on both dashboards.
   `label` is stored alongside `event` so entries render without a lookup.
   `by` records the actor: "customer" | "admin" | "system".
────────────────────────────────────────────────────────────────────────────── */
const historyEventSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, trim: true },
    label: { type: String, default: "", trim: true },
    by:    { type: String, enum: ["customer", "admin", "system"], default: "system" },
    at:    { type: Date, default: Date.now },
    meta:  { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

/* ── Assigned worker sub-schema ───────────────────────────────────────────────
   Stores a snapshot of the worker's name and the contact number to surface
   to the client. `contactSource` controls whose phone was stored in `phone`.
────────────────────────────────────────────────────────────────────────────── */
const assignedWorkerSchema = new mongoose.Schema(
  {
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker", default: null },
    name:     { type: String, trim: true, default: "" },
    phone:    { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    // ── Public booking reference ────────────────────────────────────────────────
    // Human-readable unique ID generated on creation, e.g. "UPK-20260617-7F3K9".
    // Used in confirmation emails and customer communication.
    // Indexed as unique + sparse via schema.index() below — sparse so legacy
    // bookings that predate this field (bookingId = null) don't collide.
    bookingId: {
      type: String,
      trim: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    service: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    serviceIssue: {
      type: String,
      trim: true,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    // Quote workflow additions (see constants/quoteWorkflow.js):
    //   quote_rejected     — customer rejected the quotation
    //   revision_requested — customer asked for a revised quotation
    //   closed             — customer closed the request after rejecting (terminal)
    // Enum lives in constants/quoteWorkflow.js (BOOKING_STATUSES) — the single
    // source of truth shared with the workflow transition maps.
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "pending",
    },

    // ── Structured quotation ───────────────────────────────────────────────────
    quotation: {
      type: quotationSchema,
      default: null,
    },

    // ── Quote rejection details (null until the customer rejects) ─────────────
    rejection: {
      type: rejectionSchema,
      default: null,
    },

    // ── Cancellation details (null until cancelled via the customer flow) ─────
    cancellation: {
      type: cancellationSchema,
      default: null,
    },

    // ── Superseded quotations (append-only; empty for legacy records) ─────────
    quotationHistory: {
      type: [quotationHistorySchema],
      default: [],
    },

    // ── Activity timeline (append-only; empty for legacy records) ─────────────
    history: {
      type: [historyEventSchema],
      default: [],
    },

    // ── Legacy / derived price ─────────────────────────────────────────────────
    price: {
      type: Number,
      default: null,
    },

    // ── Legacy worker field (plain string) ────────────────────────────────────
    // Kept for old records that pre-date assignedWorker.
    // On new records it is written in sync with assignedWorker.name.
    // Prefer the `workerName` virtual for all reads — it resolves correctly
    // for both legacy and current records.
    worker: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Structured worker assignment (current) ─────────────────────────────────
    assignedWorker: {
      type: assignedWorkerSchema,
      default: null,
    },

    // "worker" → use worker's own phone | "admin" → admin supplied an override
    contactSource: {
      type: String,
      enum: ["worker", "admin"],
      default: "worker",
    },
  },
  { timestamps: true }
);

// Unique + sparse index on the public booking reference. Sparse allows the
// multiple null bookingIds on legacy records while keeping new IDs unique.
bookingSchema.index({ bookingId: 1 }, { unique: true, sparse: true });

// ── Virtual: normalized worker name ───────────────────────────────────────────
// Resolves to assignedWorker.name for current records, falls back to the
// legacy `worker` string for old records that lack assignedWorker.
// Use this instead of reading either field directly to stay compatible with
// both old and new records without branching in controller/route code.
bookingSchema.virtual("workerName").get(function () {
  return (this.assignedWorker && this.assignedWorker.name) || this.worker || "";
});

// ── Virtuals: workflow capability flags ───────────────────────────────────────
// Server-authoritative UI flags derived from the workflow constants, so
// clients never mirror status lists to decide which actions to offer. The
// server endpoints still re-validate every action regardless.
bookingSchema.virtual("canCancel").get(function () {
  return CANCELLABLE_STATUSES.includes(this.status);
});
bookingSchema.virtual("canReschedule").get(function () {
  return RESCHEDULABLE_STATUSES.includes(this.status);
});

// Serialize virtuals (workerName, canCancel, canReschedule) with every API
// response so the flags ride along on all booking payloads. Additive only —
// no existing field changes. (Note: .lean() queries skip virtuals.)
bookingSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Booking", bookingSchema);