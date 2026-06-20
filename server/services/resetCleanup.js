// server/services/resetCleanup.js
// Automated, server-side cleanup of abandoned password-reset state.
//
// Reset fields (resetOtp/resetToken + counters) live on the User document, so a
// Mongo TTL index can't be used (it would delete the user). Instead we run a
// lightweight periodic sweep that nulls out ONLY already-EXPIRED reset state.
//
// Safety:
//   • Filters strictly on `*Expires < now`, so an ACTIVE reset session (expiry in
//     the future) is never touched.
//   • Idempotent bulk `updateMany` — safe to run repeatedly and concurrently.
//   • The interval is unref()'d so it never keeps the process alive on its own.

"use strict";

const User = require("../models/User");

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // hourly

/**
 * Clear expired OTP and reset-token fields. Returns the number of documents
 * modified (for logging/observability). Never throws to the caller of the job —
 * callers may still await it directly (e.g. in tests) and handle errors.
 */
async function cleanupExpiredResets(now = new Date()) {
  // Expired one-time-passcodes → drop the hash, expiry and attempt counter.
  const otpRes = await User.updateMany(
    { resetOtpExpires: { $ne: null, $lt: now } },
    { $set: { resetOtp: null, resetOtpExpires: null, resetOtpAttempts: 0 } }
  );

  // Expired authorization tokens → drop the hash and expiry.
  const tokenRes = await User.updateMany(
    { resetTokenExpires: { $ne: null, $lt: now } },
    { $set: { resetToken: null, resetTokenExpires: null } }
  );

  const otpCleared   = otpRes.modifiedCount   ?? otpRes.nModified   ?? 0;
  const tokenCleared = tokenRes.modifiedCount ?? tokenRes.nModified ?? 0;
  return { otpCleared, tokenCleared };
}

let timer = null;

/**
 * Start the recurring cleanup job. Runs once shortly after start and then on a
 * fixed interval. No-op if already started.
 * @param {number} [intervalMs]
 */
function startResetCleanupJob(intervalMs = DEFAULT_INTERVAL_MS) {
  if (timer) return;

  const run = async () => {
    try {
      const { otpCleared, tokenCleared } = await cleanupExpiredResets();
      if (otpCleared || tokenCleared)
        console.log(`[RESET CLEANUP] Cleared expired reset state — otp:${otpCleared} token:${tokenCleared}`);
    } catch (err) {
      console.error("[RESET CLEANUP] sweep failed:", err.message);
    }
  };

  // Kick off shortly after boot (don't block startup), then on the interval.
  setTimeout(run, 30 * 1000).unref?.();
  timer = setInterval(run, intervalMs);
  timer.unref?.(); // don't hold the event loop open just for cleanup
  console.log(`[RESET CLEANUP] Job scheduled (every ${Math.round(intervalMs / 60000)} min).`);
}

/** Stop the job (used in tests / graceful shutdown). */
function stopResetCleanupJob() {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { cleanupExpiredResets, startResetCleanupJob, stopResetCleanupJob };
