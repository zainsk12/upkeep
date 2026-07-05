// server/services/paymentService.js
//
// Payment collection for workflow fees (currently the cancellation fee).
//
// GATEWAY ABSTRACTION: everything provider-specific lives behind the small
// `gateway` object (createOrder / charge). Today it is an inert MOCK that
// always succeeds instantly — swapping in Razorpay/Stripe later means
// implementing the same two methods (order creation server-side, charge
// verification after the client-side checkout) without touching callers.
// Payment records are provider-tagged, so mock and real transactions can
// coexist in the same collection during a migration.

const crypto = require("crypto");
const Payment = require("../models/Payment");
const { PAYMENT_PURPOSE, PAYMENT_STATUS } = Payment;

const CURRENCY = "INR";

const ref = (prefix) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;

// ── Mock gateway ───────────────────────────────────────────────────────────────
const mockGateway = {
  name: "mock",
  async createOrder({ amount, currency }) {
    return { orderId: ref("mock_order"), amount, currency };
  },
  // Real integrations verify the gateway's signature / payment status here.
  // The mock approves every charge; the failure branch below still exists and
  // is exercised the moment a real provider can decline.
  async charge() {
    return { success: true, paymentRef: ref("mock_pay") };
  },
};

const gateway = mockGateway;

/**
 * Find a paid-but-unconsumed cancellation-fee payment that already covers
 * `minAmount` for this booking + user. Used for idempotency: a retry (or a
 * cancel call that lost its paymentId) reuses this record instead of charging
 * the customer again. Returns the Payment doc or null.
 */
async function findReusableCancellationFeePayment({ bookingId, userId, minAmount }) {
  return Payment.findOne({
    bookingId,
    userId,
    purpose: PAYMENT_PURPOSE.CANCELLATION_FEE,
    status: PAYMENT_STATUS.PAID,
    consumedAt: null,
    amount: { $gte: minAmount },
  }).sort({ paidAt: -1 });
}

/**
 * Create and process a cancellation-fee payment for a booking.
 * Idempotent: if a paid-but-unconsumed payment already covers the amount, it
 * is returned as-is — no new record, no second charge. This holds for real
 * gateways too: the reusable record is only ever written after a successful
 * charge, so a retry can never double-charge.
 * Returns the persisted Payment doc — check `payment.status`:
 *   "paid"   → charge went through (paidAt/providerPaymentId set)
 *   "failed" → gateway declined; the caller must leave the booking untouched
 */
async function collectCancellationFee({ booking, userId, amount }) {
  const existing = await findReusableCancellationFeePayment({
    bookingId: booking._id,
    userId,
    minAmount: amount,
  });
  if (existing) return existing;

  const order = await gateway.createOrder({ amount, currency: CURRENCY });

  const payment = await Payment.create({
    bookingId: booking._id,
    userId,
    purpose: PAYMENT_PURPOSE.CANCELLATION_FEE,
    amount,
    currency: CURRENCY,
    provider: gateway.name,
    providerOrderId: order.orderId,
    status: PAYMENT_STATUS.CREATED,
    meta: { bookingRef: booking.bookingId || "", service: booking.service },
  });

  const result = await gateway.charge({ orderId: order.orderId, amount });

  if (result.success) {
    payment.status = PAYMENT_STATUS.PAID;
    payment.paidAt = new Date();
    payment.providerPaymentId = result.paymentRef;
  } else {
    payment.status = PAYMENT_STATUS.FAILED;
    payment.meta = { ...payment.meta, failureReason: result.reason || "declined" };
  }
  await payment.save();
  return payment;
}

/**
 * Verify that `paymentId` is a paid, unconsumed cancellation-fee payment for
 * this exact booking + user covering at least `minAmount`.
 * Returns { ok, payment, message } — never throws on bad input.
 */
async function verifyCancellationFeePayment({ paymentId, bookingId, userId, minAmount }) {
  const fail = (message) => ({ ok: false, payment: null, message });

  if (!paymentId) return fail("Payment is required before this booking can be cancelled.");

  let payment = null;
  try {
    payment = await Payment.findById(paymentId);
  } catch {
    return fail("Invalid payment reference.");
  }
  if (!payment) return fail("Payment not found.");
  if (payment.purpose !== PAYMENT_PURPOSE.CANCELLATION_FEE) return fail("Invalid payment reference.");
  if (payment.bookingId.toString() !== bookingId.toString()) return fail("Payment does not belong to this booking.");
  if (payment.userId.toString() !== userId.toString()) return fail("Payment does not belong to this account.");
  if (payment.status !== PAYMENT_STATUS.PAID) return fail("Payment has not been completed.");
  if (payment.consumedAt) return fail("This payment has already been used.");
  if (payment.amount < minAmount) return fail("Paid amount no longer covers the cancellation fee.");

  return { ok: true, payment, message: "" };
}

/**
 * Mark a paid payment as consumed (single-use) via compare-and-set, so two
 * concurrent workflow completions can never both claim the same payment.
 * Returns the updated doc, or null when it was already consumed.
 */
async function consumePayment(paymentId) {
  return Payment.findOneAndUpdate(
    { _id: paymentId, consumedAt: null },
    { $set: { consumedAt: new Date() } },
    { new: true }
  );
}

module.exports = {
  collectCancellationFee,
  verifyCancellationFeePayment,
  findReusableCancellationFeePayment,
  consumePayment,
};
