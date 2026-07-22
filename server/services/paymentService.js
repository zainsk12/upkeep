// server/services/paymentService.js
//
// Payment collection for workflow fees (currently the cancellation fee).
//
// GATEWAY ABSTRACTION: everything provider-specific lives in
// gateways/razorpayGateway (order creation, checkout signature verification).
// This service owns the ledger and every business rule around it — idempotent
// initiation, server-side verification, single-use consumption. Payment
// records are provider-tagged, so rows written by the earlier mock provider
// and real Razorpay transactions coexist in the same collection.
//
// Real-checkout flow (two phases — the customer pays in the browser):
//   1. initiateCancellationFeePayment → Razorpay order + ledger row ("created")
//   2. (client) Razorpay Checkout completes
//   3. confirmCancellationFeePayment  → HMAC signature verified → "paid"
// A payment only ever counts once it is "paid", so an abandoned checkout
// leaves nothing but an inert "created" row.

const Payment = require("../models/Payment");
const gateway = require("./gateways/razorpayGateway");
const { PAYMENT_PURPOSE, PAYMENT_STATUS } = Payment;

const CURRENCY = "INR";

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
 * Phase 1 — create a Razorpay order (+ "created" ledger row) for the
 * cancellation fee.
 * Idempotent against double charging: when a paid-but-unconsumed payment
 * already covers the amount it is returned with alreadyPaid: true and NO new
 * order is created — the client skips checkout entirely. This is also the
 * recovery path after an interrupted pay→cancel sequence.
 * Abandoned attempts (customer closed checkout) simply leave their "created"
 * row behind; a retry creates a fresh order, and only a verified "paid" row
 * ever authorises anything.
 * Returns { payment, alreadyPaid, checkout } — `checkout` (null when
 * alreadyPaid) carries what Razorpay Checkout needs client-side; its `amount`
 * is in paise, per Razorpay's contract.
 */
async function initiateCancellationFeePayment({ booking, userId, amount }) {
  const existing = await findReusableCancellationFeePayment({
    bookingId: booking._id,
    userId,
    minAmount: amount,
  });
  if (existing) return { payment: existing, alreadyPaid: true, checkout: null };

  const order = await gateway.createOrder({
    amount,
    currency: CURRENCY,
    receipt: booking.bookingId || booking._id.toString(),
    notes: {
      purpose: PAYMENT_PURPOSE.CANCELLATION_FEE,
      bookingRef: booking.bookingId || "",
      bookingId: booking._id.toString(),
    },
  });

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

  return {
    payment,
    alreadyPaid: false,
    checkout: {
      keyId: gateway.getKeyId(),
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
    },
  };
}

/**
 * Phase 2 — verify a Razorpay Checkout result and mark the ledger row paid.
 * Never trusts the client: the order must belong to this exact booking + user,
 * and the signature must verify against the key secret. Retry-safe: confirming
 * an already-verified payment returns it as-is (the checkout callback may fire
 * twice, or the client may resend after a lost response).
 * Returns { ok, payment, message, declined } — never throws on bad input.
 *   ok: true      → payment is "paid" (paidAt/verifiedAt/provider ids set)
 *   declined: true → a real attempt failed signature verification (the
 *                    "gateway declined" analog — callers may notify on it);
 *                    other failures are bad/foreign requests and stay silent.
 * On failure `payment` is still returned when the order was found, so callers
 * can attribute the failure without a second lookup.
 */
async function confirmCancellationFeePayment({
  bookingId,
  userId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) {
  const fail = (message, payment = null, declined = false) =>
    ({ ok: false, payment, message, declined });

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return fail("Missing payment verification details.");
  }

  const payment = await Payment.findOne({
    provider: gateway.name,
    providerOrderId: razorpayOrderId,
    purpose: PAYMENT_PURPOSE.CANCELLATION_FEE,
  });
  if (!payment) return fail("Payment order not found.");
  if (payment.bookingId.toString() !== bookingId.toString())
    return fail("Payment does not belong to this booking.");
  if (payment.userId.toString() !== userId.toString())
    return fail("Payment does not belong to this account.");

  if (payment.status === PAYMENT_STATUS.PAID) {
    // Idempotent replay of the same checkout result — same payment, same row.
    if (payment.providerPaymentId === razorpayPaymentId) {
      return { ok: true, payment, message: "", declined: false };
    }
    return fail("This payment order has already been settled.", payment);
  }
  if (payment.status === PAYMENT_STATUS.FAILED) {
    return fail("This payment attempt failed. Please start the payment again.", payment);
  }

  const valid = gateway.verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) {
    payment.status = PAYMENT_STATUS.FAILED;
    payment.meta = { ...payment.meta, failureReason: "signature_verification_failed" };
    await payment.save();
    return fail(
      "Payment verification failed. Your booking has not been cancelled.",
      payment,
      true
    );
  }

  payment.status = PAYMENT_STATUS.PAID;
  payment.paidAt = new Date();
  payment.verifiedAt = new Date();
  payment.providerPaymentId = razorpayPaymentId;
  payment.providerSignature = razorpaySignature;
  await payment.save();

  return { ok: true, payment, message: "", declined: false };
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
  initiateCancellationFeePayment,
  confirmCancellationFeePayment,
  verifyCancellationFeePayment,
  findReusableCancellationFeePayment,
  consumePayment,
  // Controllers gate payment endpoints on this without ever importing the
  // gateway directly — provider specifics stay encapsulated here.
  isPaymentGatewayConfigured: gateway.isConfigured,
};
