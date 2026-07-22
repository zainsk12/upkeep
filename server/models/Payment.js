// server/models/Payment.js
//
// Payment transaction ledger. Every collected charge (currently only the
// cancellation fee) is recorded here — never embedded in Booking — so future
// flows (no-show fees, refunds, real gateway webhooks) share one collection.
//
// Lifecycle: created → paid | failed. A paid payment is "consumed" (consumedAt
// set) the moment its workflow action succeeds (e.g. the booking is actually
// cancelled), which makes it single-use and idempotency-safe.

const mongoose = require("mongoose");

// Canonical payment vocabulary — single source of truth for the schema enums
// and every consumer (paymentService + the Razorpay gateway).
// Extend these when new charge types / gateways land (e.g. NO_SHOW_FEE).
// Existing records remain valid — enums only gate new writes, which is why
// "mock" stays listed: rows written by the retired mock provider are
// historical ledger entries and must keep validating.
const PAYMENT_PURPOSE = {
  CANCELLATION_FEE: "cancellation_fee",
};
const PAYMENT_STATUS = {
  CREATED: "created",
  PAID:    "paid",
  FAILED:  "failed",
};
const PAYMENT_PROVIDERS = ["mock", "razorpay"];

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true, index: true },

    purpose:  { type: String, enum: Object.values(PAYMENT_PURPOSE), required: true },
    amount:   { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },

    // Gateway identity — paymentService always sets this explicitly (currently
    // "razorpay"); "mock" appears only on historical rows.
    provider:          { type: String, enum: PAYMENT_PROVIDERS, required: true },
    // Razorpay: order_id / payment_id from Checkout. Indexed lookup key for
    // the confirm (verify) phase.
    providerOrderId:   { type: String, default: "", trim: true, index: true },
    providerPaymentId: { type: String, default: "", trim: true },
    // Razorpay checkout signature that passed HMAC verification, and when it
    // was verified server-side — audit trail for the "paid" transition.
    providerSignature: { type: String, default: "", trim: true },
    verifiedAt:        { type: Date, default: null },

    status:     { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.CREATED },
    paidAt:     { type: Date, default: null },
    // Set when the paid amount has been applied to its workflow action —
    // a consumed payment can never authorise a second action.
    consumedAt: { type: Date, default: null },

    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
module.exports.PAYMENT_PURPOSE = PAYMENT_PURPOSE;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
