// server/services/gateways/razorpayGateway.js
//
// Razorpay payment gateway (Test Mode) — credentials come from
// RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in server/.env, never hardcoded.
//
// GENERIC BY DESIGN: this module knows nothing about cancellations, bookings,
// or any other workflow. It exposes provider-level operations only — order
// creation and checkout signature verification. Business rules (what a fee is
// for, when it may be charged, idempotency, the ledger) live in
// services/paymentService. Future flows (service payments, advance booking
// payments) reuse these same operations unchanged.
//
// Amounts: callers pass rupees — the unit stored in the Payment ledger. The
// paise conversion Razorpay requires happens here and never leaks out.

const crypto = require("crypto");
const Razorpay = require("razorpay");

function isConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

// Lazy singleton — reads env at first use (after dotenv has run), and lets the
// server boot without keys as long as no payment is attempted.
let client = null;
function getClient() {
  if (!isConfigured()) {
    throw new Error(
      "Razorpay is not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }
  if (!client) {
    client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return client;
}

const toPaise = (rupees) => Math.round(rupees * 100);

/**
 * Create a Razorpay order (server-side half of the checkout handshake).
 * @param {object} p
 * @param {number} p.amount   - rupees (converted to paise here)
 * @param {string} p.currency - e.g. "INR"
 * @param {string} p.receipt  - caller's human-readable reference (≤40 chars)
 * @param {object} [p.notes]  - free-form key/values shown in the dashboard
 * @returns {{ orderId: string, amount: number, currency: string }}
 *          `amount` is in PAISE — exactly what Razorpay Checkout expects.
 */
async function createOrder({ amount, currency, receipt, notes }) {
  const order = await getClient().orders.create({
    amount: toPaise(amount),
    currency,
    // Razorpay caps receipt at 40 chars — booking refs fit comfortably.
    receipt: String(receipt || "").slice(0, 40),
    notes: notes || {},
  });
  return { orderId: order.id, amount: order.amount, currency: order.currency };
}

/**
 * Verify a Razorpay Checkout result: HMAC-SHA256(order_id|payment_id) signed
 * with the key secret must equal the signature the checkout handler received.
 * This is the ONLY proof a payment succeeded — the client is never trusted.
 * Returns boolean; never throws on malformed input.
 */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!isConfigured() || !orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  // timingSafeEqual throws on length mismatch — guard first.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  name: "razorpay",
  isConfigured,
  /** Publishable key id (rzp_test_…) — safe to send to the client for Checkout. */
  getKeyId: () => process.env.RAZORPAY_KEY_ID || "",
  createOrder,
  verifyPaymentSignature,
};
