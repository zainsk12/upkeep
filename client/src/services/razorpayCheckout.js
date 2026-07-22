// client/src/services/razorpayCheckout.js
// Razorpay Checkout (Test Mode) — collects the cancellation fee in-browser.
//
// The checkout.js script is loaded lazily on first use (same pattern as
// services/recaptcha.js — users who never pay a fee never fetch it).
//
// openRazorpayCheckout() wraps Razorpay's callback API in a promise:
//   resolves → { razorpay_payment_id, razorpay_order_id, razorpay_signature }
//   rejects  → Error with .code = "dismissed" when the customer closes the
//              sheet without paying, or a plain Error when the script fails
//              to load.
// A failed payment attempt is handled INSIDE the Razorpay sheet (it shows the
// error and lets the customer retry with another method); we only learn the
// final outcome — success via `handler`, or abandonment via `ondismiss`.
//
// The resolved payload proves nothing by itself — the caller must send it to
// the server, which verifies the HMAC signature before treating the fee as
// paid.

import env from "../utils/env";

let loadPromise = null;

function loadScript() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src   = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload  = () => resolve();
    script.onerror = () => {
      loadPromise = null; // allow a retry after a network hiccup
      reject(new Error("Failed to load the payment window. Please try again."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Open Razorpay Checkout for a server-created order.
 * @param {object} opts
 * @param {string} opts.keyId       - publishable key id (server-provided;
 *                                    falls back to VITE_RAZORPAY_KEY_ID)
 * @param {string} opts.orderId     - Razorpay order id from the pay endpoint
 * @param {number} opts.amount      - amount in PAISE, as the server returned it
 * @param {string} opts.currency    - e.g. "INR"
 * @param {string} opts.name        - business name shown on the sheet
 * @param {string} opts.description - line item shown on the sheet
 * @param {object} [opts.prefill]   - { name, email, contact }
 * @returns {Promise<{razorpay_payment_id, razorpay_order_id, razorpay_signature}>}
 */
export async function openRazorpayCheckout({
  keyId,
  orderId,
  amount,
  currency,
  name,
  description,
  prefill,
}) {
  await loadScript();

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: keyId || env.razorpayKeyId,
      order_id: orderId,
      amount,
      currency,
      name,
      description,
      prefill: prefill || {},
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => {
          const err = new Error("Payment window closed before completing the payment.");
          err.code = "dismissed";
          reject(err);
        },
      },
    });
    rzp.open();
  });
}
