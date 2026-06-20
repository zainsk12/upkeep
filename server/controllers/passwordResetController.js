// server/controllers/passwordResetController.js
// Forgot Password / Reset Password flow.
//
// Two channels, chosen by what the user typed:
//   • EMAIL  — backend generates a 6-digit OTP, stores its bcrypt hash, e-mails
//              the plain code, then verifies it here.
//   • PHONE  — reuses the existing Firebase Phone Authentication (same as signup):
//              the client sends the SMS OTP via Firebase and obtains an ID token;
//              we verify that token here instead of an OTP.
//
// Either channel, once verified, yields a short-lived reset token. The final
// step swaps that token for a new password.
//
// Security:
//   • Plain OTP is never stored (bcrypt hash only); reset token stored as sha256.
//   • Generic responses — never reveal whether an account exists.
//   • Rate limiting is applied at the route layer.
//   • Max 5 OTP attempts, 10-min OTP TTL, 15-min reset-token TTL.

"use strict";

const User = require("../models/User");
const { normalizePhone, isValidIndianPhone } = require("../utils/phone");
const {
  verifyFirebaseToken,
  verifyAppCheckToken,
  isAppCheckEnforced,
} = require("../services/firebaseAdmin");
const {
  sendPasswordResetOtpEmail,
  sendPasswordChangedEmail,
} = require("../services/emailService");
const {
  MAX_OTP_ATTEMPTS,
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
} = require("../services/passwordResetService");

// Identical wording for "account exists" vs "doesn't" so the response never
// leaks which accounts are registered.
const GENERIC_SENT =
  "If an account exists, a verification code has been sent.";
// One message for EVERY verification failure (wrong / expired / missing OTP,
// missing or expired reset session, account-not-found) so the response never
// reveals whether an account or an active reset exists, nor attempts remaining.
const GENERIC_INVALID = "Invalid or expired verification code. Please try again.";
const GENERIC_RESET_STATE =
  "This reset session is invalid or has expired. Please start again.";

const isEmailInput = (s) => typeof s === "string" && s.includes("@");

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
// Body: { identifier }  (email OR phone)
// Determines the channel from the INPUT format (not account existence → no leak)
// and, for the email channel, issues + sends an OTP.
async function forgotPassword(req, res) {
  try {
    const identifier = (req.body.identifier || "").trim();
    if (!identifier)
      return res.status(400).json({ message: "Please enter your email or phone number." });

    // ── EMAIL channel ─────────────────────────────────────────────────────────
    if (isEmailInput(identifier)) {
      const email = identifier.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ message: "Enter a valid email address." });

      // Kick off the real work (DB lookup + OTP hash + email send) WITHOUT
      // awaiting it, then respond immediately with a fixed generic payload.
      // This is deliberate and fixes two enumeration vectors:
      //   • Response BODY is identical whether or not the account exists, and
      //     whether or not the email actually sends (SMTP outcome is never
      //     surfaced to the client — failures are logged internally only).
      //   • Response TIMING is constant: we don't block on bcrypt/DB/SMTP, so an
      //     attacker can't distinguish "real account" (slow) from "no account".
      // The masked destination simply echoes the address the user typed (no leak).
      processEmailReset(email).catch((err) =>
        console.error("[RESET] Background email reset failed:", err.message)
      );

      return res.json({
        message:     GENERIC_SENT,
        channel:     "email",
        destination: maskEmail(email),
      });
    }

    // ── PHONE channel ─────────────────────────────────────────────────────────
    // The OTP itself is sent by Firebase on the client (same as signup). We only
    // validate the format and hand back the channel + masked destination so the
    // UI can start the Firebase flow. We do NOT confirm the account exists here
    // (generic by design); existence is enforced at the verify step.
    if (!isValidIndianPhone(identifier))
      return res.status(400).json({ message: "Enter a valid email address or 10-digit mobile number." });

    return res.json({
      message:     GENERIC_SENT,
      channel:     "phone",
      destination: maskPhone(identifier),
    });
  } catch (err) {
    console.error("forgotPassword error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
}

/**
 * Background worker for the EMAIL channel — runs AFTER the HTTP response has been
 * sent (fire-and-forget) so neither timing nor outcome leaks account existence.
 * Any failure here is logged only; it never reaches the client.
 */
async function processEmailReset(email) {
  const user = await User.findOne({ email }).select(
    "+lastResetRequestAt +resetRequestWindowStart +resetRequestCount"
  );
  if (!user) return; // No account → nothing to do (response was already generic).

  // Admin accounts must use the admin panel — never the customer reset flow.
  // Silently skip (the generic success response was already sent → no leak).
  if (user.role === "admin") {
    console.warn(`[RESET] Ignored reset request for admin account ${user._id}.`);
    return;
  }

  // ── Per-account throttle (IP-independent, anti email-bombing) ──────────────
  // Silently drop the request if the account is in its 60s cooldown or has hit
  // the 24h cap. The HTTP response was already sent as the generic success, so
  // an attacker learns nothing about the throttle state.
  const { allowed, state } = evaluateResetThrottle(user);
  if (!allowed) {
    console.warn(`[RESET] Throttled reset email for account ${user._id} (cooldown/daily cap).`);
    return;
  }

  // Record the (allowed) request alongside the new OTP in a single save.
  user.lastResetRequestAt      = state.lastResetRequestAt;
  user.resetRequestWindowStart = state.resetRequestWindowStart;
  user.resetRequestCount       = state.resetRequestCount;

  const otp = generateOtp();
  user.resetOtp         = await hashOtp(otp);
  user.resetOtpExpires  = new Date(Date.now() + 10 * 60 * 1000);
  user.resetOtpAttempts = 0;
  // Invalidate any previously-issued reset token on a fresh request.
  user.resetToken        = null;
  user.resetTokenExpires = null;
  await user.save();

  try {
    await sendPasswordResetOtpEmail(user, otp);
  } catch (err) {
    // Roll back the OTP so the user isn't stuck with a code they never received.
    console.error("[RESET] Email send failed for existing account:", err.message);
    user.resetOtp        = null;
    user.resetOtpExpires = null;
    await user.save();
  }
}

// ── POST /api/auth/verify-reset-otp ───────────────────────────────────────────
// Body (email): { identifier, otp }
// Body (phone): { identifier, firebaseIdToken, appCheckToken? }
// Verifies the proof of identity and, on success, returns a short-lived reset
// token used by /reset-password.
async function verifyResetOtp(req, res) {
  try {
    const identifier = (req.body.identifier || "").trim();
    const { otp, firebaseIdToken, appCheckToken } = req.body;

    if (!identifier)
      return res.status(400).json({ message: "Missing account identifier." });

    // ── PHONE: verify via Firebase ID token ───────────────────────────────────
    if (!isEmailInput(identifier)) {
      if (!firebaseIdToken)
        return res.status(400).json({ message: "Phone verification is required." });
      if (!isValidIndianPhone(identifier))
        return res.status(400).json({ message: "Enter a valid mobile number." });

      // ── App Check (anti-automation) ────────────────────────────────────────
      // When enforcement is enabled, the request MUST carry a valid Firebase App
      // Check token proving it came from a genuine app instance — blocking scripted
      // SMS/credential abuse. This FAILS CLOSED: a missing or invalid token is
      // rejected before any Firebase/DB work, so enforcement cannot be bypassed.
      // Gated by FIREBASE_APP_CHECK_ENFORCE so the flow keeps working (backward
      // compatible) until App Check is configured in the console + client.
      if (isAppCheckEnforced()) {
        if (!appCheckToken) {
          console.error("[RESET] App Check enforced but no token supplied — rejecting.");
          return res.status(400).json({ message: GENERIC_INVALID });
        }
        try {
          await verifyAppCheckToken(appCheckToken);
        } catch (err) {
          console.error("[RESET] App Check verification failed:", err.message);
          return res.status(400).json({ message: GENERIC_INVALID });
        }
      }

      // Server-side normalization + validation already enforced above; the same
      // normalized number is used for the account lookup and the token match.
      const normalised = normalizePhone(identifier);
      const user = await User.findOne({ phone: normalised }).select(
        "+resetToken +resetTokenExpires"
      );

      let verified;
      try {
        verified = await verifyFirebaseToken(firebaseIdToken);
      } catch (err) {
        console.error("[RESET] Firebase verify failed:", err.message);
        return res.status(400).json({ message: "Phone verification expired or invalid. Please try again." });
      }

      // The Firebase-proven phone must match the account being reset. Generic
      // error whether the account is missing, an admin, or the number mismatched
      // (admin accounts must use the admin panel, never the customer reset flow).
      if (
        !user ||
        user.role === "admin" ||
        !verified.phone ||
        normalizePhone(verified.phone) !== normalised
      )
        return res.status(400).json({ message: GENERIC_INVALID });

      return res.json(await issueResetToken(user));
    }

    // ── EMAIL: verify the OTP ─────────────────────────────────────────────────
    // Generic response for malformed input too — never differentiate failure modes.
    if (!otp || !/^\d{6}$/.test(String(otp).trim()))
      return res.status(400).json({ message: GENERIC_INVALID });

    const email = identifier.toLowerCase();

    // ── Atomic attempt consumption (race-safe) ────────────────────────────────
    // A single atomic findOneAndUpdate both checks preconditions and burns one
    // attempt: it only matches when a non-expired OTP exists AND attempts remain
    // (< MAX). Concurrent requests therefore can never collectively exceed
    // MAX_OTP_ATTEMPTS — once the counter hits the cap the filter stops matching.
    // A non-match (null) means: no account, no/expired OTP, or attempts exhausted
    // — all surfaced identically via GENERIC_INVALID.
    const user = await User.findOneAndUpdate(
      {
        email,
        // Admin accounts must use the admin panel — never the customer reset flow.
        // Excluding them from the filter yields a generic non-match (no attempt
        // consumed on the admin's own record, no enumeration signal).
        role:             { $ne: "admin" },
        resetOtp:         { $ne: null },
        resetOtpExpires:  { $gt: new Date() },
        resetOtpAttempts: { $lt: MAX_OTP_ATTEMPTS },
      },
      { $inc: { resetOtpAttempts: 1 } },
      { new: true }
    ).select(
      // Need the (now-incremented) reset fields back to run the bcrypt compare.
      "+resetOtp +resetOtpExpires +resetOtpAttempts +resetToken +resetTokenExpires"
    );

    if (!user)
      return res.status(400).json({ message: GENERIC_INVALID });

    const ok = await compareOtp(String(otp).trim(), user.resetOtp);
    if (!ok)
      // The attempt was already consumed atomically above; nothing else to do.
      return res.status(400).json({ message: GENERIC_INVALID });

    // Success → consume the OTP and issue the reset token.
    user.resetOtp         = null;
    user.resetOtpExpires  = null;
    user.resetOtpAttempts = 0;
    return res.json(await issueResetToken(user));
  } catch (err) {
    console.error("verifyResetOtp error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
}

// Generate, persist (hashed) and return the plaintext reset token for `user`.
async function issueResetToken(user) {
  const { token, hash, expires } = generateResetToken();
  user.resetToken        = hash;
  user.resetTokenExpires = expires;
  await user.save();
  return {
    message:    "Verified. You can now set a new password.",
    resetToken: token,
    expiresIn:  Math.round((expires.getTime() - Date.now()) / 1000),
  };
}

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
// Body: { identifier, resetToken, newPassword }
// Swaps a valid reset token for a new password, then wipes all reset state.
async function resetPassword(req, res) {
  try {
    const identifier = (req.body.identifier || "").trim();
    const { resetToken, newPassword } = req.body;

    if (!identifier || !resetToken)
      return res.status(400).json({ message: "This reset link is invalid. Please start again." });

    // Enforce password strength before any DB work.
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid)
      return res.status(400).json({ message: strength.message });

    // Locate the account the same way the rest of the flow did.
    const query = isEmailInput(identifier)
      ? { email: identifier.toLowerCase() }
      : { phone: normalizePhone(identifier) };

    const user = await User.findOne(query).select("+resetToken +resetTokenExpires");

    // One generic message for every reset-state failure (no session, admin
    // account, expired session, or token mismatch) so nothing about reset state
    // is revealed. Admins are blocked here too as defense-in-depth (they can't
    // obtain a reset token via the guarded verify step in the first place).
    if (!user || user.role === "admin" || !user.resetToken || !user.resetTokenExpires)
      return res.status(400).json({ message: GENERIC_RESET_STATE });

    if (user.resetTokenExpires.getTime() < Date.now()) {
      user.resetToken        = null;
      user.resetTokenExpires = null;
      await user.save();
      return res.status(400).json({ message: GENERIC_RESET_STATE });
    }

    // Constant-time comparison of the supplied token's hash against the stored
    // hash (avoids a timing side-channel on token validation).
    if (!safeEqualHex(hashToken(resetToken), user.resetToken))
      return res.status(400).json({ message: GENERIC_RESET_STATE });

    // Reject reusing the current password. The reset token already authenticated
    // the request, so this is a safe, non-enumerating message. Uses the model's
    // bcrypt comparePassword against the stored hash (selected by default here).
    if (await user.comparePassword(newPassword))
      return res.status(400).json({
        message: "Your new password must be different from your current password.",
      });

    // Apply the new password (pre-save hook hashes it + stamps passwordChangedAt,
    // invalidating existing sessions) and wipe ALL reset state.
    user.password          = newPassword;
    user.resetOtp          = null;
    user.resetOtpExpires   = null;
    user.resetOtpAttempts  = 0;
    user.resetToken        = null;
    user.resetTokenExpires = null;
    await user.save();

    // Notify the account owner so an unauthorized change can be caught. Sent to
    // the account's email (phone-only accounts have no email channel → skipped).
    // Fire-and-forget: never block or fail the reset on email issues.
    const maskedIdentifier = user.email ? maskEmail(user.email) : maskPhone(user.phone);
    sendPasswordChangedEmail(user, { maskedIdentifier, when: new Date() }).catch((err) =>
      console.error("[RESET] Password-changed notice failed:", err.message)
    );

    res.json({ message: "Your password has been updated successfully. You can now log in." });
  } catch (err) {
    console.error("resetPassword error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
}

module.exports = { forgotPassword, verifyResetOtp, resetPassword };
