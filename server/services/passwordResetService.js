// server/services/passwordResetService.js
// Pure helpers for the Forgot Password flow — OTP + reset-token generation,
// hashing, comparison and password-strength validation. No DB / HTTP here so
// the logic stays unit-testable and the controller stays thin.
//
// Security model:
//   • The plain 6-digit OTP is e-mailed to the user but NEVER stored — only its
//     bcrypt hash lives in the DB (same hashing family used for passwords).
//   • The authorization token handed back after verification is a 32-byte random
//     value; only its sha256 hash is stored. sha256 (not bcrypt) is fine here
//     because the token has full 256-bit entropy — it isn't brute-forceable.

"use strict";

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { maskEmail, maskPhone } = require("../utils/mask");
const { exceedsBcryptLimit, TOO_LONG_MESSAGE } = require("../utils/passwordPolicy");

const OTP_TTL_MS         = 10 * 60 * 1000; // OTP valid for 10 minutes
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // reset token valid for 15 minutes
const MAX_OTP_ATTEMPTS   = 5;              // lock the OTP after 5 wrong guesses

// ── Per-account reset-request throttle (anti email-bombing) ───────────────────
const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;          // min 60s between reset emails
const RESET_REQUEST_WINDOW_MS   = 24 * 60 * 60 * 1000; // rolling 24h window
const RESET_REQUEST_DAILY_MAX   = 10;                  // max reset emails per window

/**
 * Decide whether an account may receive another reset email right now, given its
 * stored throttle state. Pure function — caller persists the returned state.
 * @returns {{ allowed: boolean, state: { lastResetRequestAt: Date, resetRequestWindowStart: Date, resetRequestCount: number } }}
 */
function evaluateResetThrottle(user, now = Date.now()) {
  let windowStart = user.resetRequestWindowStart ? user.resetRequestWindowStart.getTime() : 0;
  let count       = user.resetRequestCount || 0;
  const last      = user.lastResetRequestAt ? user.lastResetRequestAt.getTime() : 0;

  // Roll the 24h window over if it has elapsed (or was never started).
  if (!windowStart || now - windowStart > RESET_REQUEST_WINDOW_MS) {
    windowStart = now;
    count = 0;
  }

  // Block on either the 60s cooldown or the per-window cap.
  const tooSoon   = last && now - last < RESET_REQUEST_COOLDOWN_MS;
  const overDaily = count >= RESET_REQUEST_DAILY_MAX;
  if (tooSoon || overDaily) {
    return {
      allowed: false,
      state: {
        lastResetRequestAt:      user.lastResetRequestAt,
        resetRequestWindowStart: new Date(windowStart),
        resetRequestCount:       count,
      },
    };
  }

  return {
    allowed: true,
    state: {
      lastResetRequestAt:      new Date(now),
      resetRequestWindowStart: new Date(windowStart),
      resetRequestCount:       count + 1,
    },
  };
}

// ── OTP ───────────────────────────────────────────────────────────────────────

/** Cryptographically-random 6-digit numeric OTP (always zero-padded). */
function generateOtp() {
  // randomInt is uniform over [0, 1_000_000) — no modulo bias.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** bcrypt-hash an OTP for storage. */
function hashOtp(otp) {
  return bcrypt.hash(String(otp), 10);
}

/** Constant-time compare a plain OTP against its stored bcrypt hash. */
function compareOtp(plain, hash) {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(String(plain), hash);
}

// ── Reset authorization token ─────────────────────────────────────────────────

/**
 * Generate the short-lived reset token.
 * @returns {{ token: string, hash: string, expires: Date }}
 *   token   — plaintext, returned to the client (used in /reset-password)
 *   hash    — sha256 of the token, the only thing persisted
 *   expires — absolute expiry timestamp
 */
function generateResetToken() {
  const token   = crypto.randomBytes(32).toString("hex");
  const hash    = hashToken(token);
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  return { token, hash, expires };
}

/** sha256 hash of a reset token (hex). */
function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

/**
 * Constant-time comparison of two hex strings (e.g. a freshly-hashed reset token
 * vs the stored hash). Guards length first — timingSafeEqual throws on unequal
 * buffer lengths, and an early length check is itself safe here because the
 * stored value is a fixed-width sha256 hex digest (length isn't a secret).
 * @returns {boolean}
 */
function safeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ── Password strength ─────────────────────────────────────────────────────────

/**
 * Validate a new password. Mirrors the signup minimum (≥ 8 chars) and adds a
 * light strength floor so reset passwords aren't trivially weak.
 * @returns {{ valid: boolean, message?: string }}
 */
function validatePasswordStrength(password) {
  if (!password || typeof password !== "string")
    return { valid: false, message: "Password is required." };
  if (password.length < 8)
    return { valid: false, message: "Password must be at least 8 characters." };
  if (exceedsBcryptLimit(password))
    // bcrypt silently truncates beyond 72 BYTES — reject so users aren't misled.
    return { valid: false, message: TOO_LONG_MESSAGE };
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
    return { valid: false, message: "Password must include at least one letter and one number." };
  return { valid: true };
}

// Masking helpers now live in utils/mask.js (shared with log redaction). They are
// re-exported here so existing imports from this module keep working unchanged.

module.exports = {
  OTP_TTL_MS,
  RESET_TOKEN_TTL_MS,
  MAX_OTP_ATTEMPTS,
  RESET_REQUEST_COOLDOWN_MS,
  RESET_REQUEST_WINDOW_MS,
  RESET_REQUEST_DAILY_MAX,
  evaluateResetThrottle,
  generateOtp,
  hashOtp,
  compareOtp,
  generateResetToken,
  hashToken,
  safeEqualHex,
  validatePasswordStrength,
  maskEmail,
  maskPhone,
};
