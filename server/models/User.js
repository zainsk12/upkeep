// server/models/User.js
// Phone-centric user schema.
// Migration notes:
//   • phone is now UNIQUE — run a one-time deduplication script on existing data
//     if multiple users share the same phone number.
//   • email is now OPTIONAL with a PARTIAL unique index
//     (only documents where email is an actual string are indexed, so any number
//     of users may have NO email while non-null emails stay unique).
//     NOTE: a partial index — not sparse — is required here. A sparse index still
//     indexes documents that store `email: null`, which collide on the second null.
//   • isPhoneVerified defaults to false — existing users will have false until they
//     re-verify or you set it via a migration script.

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: true,
      trim:     true,
    },

    // ── Phone: primary identifier ───────────────────────────────────────────
    // Always stored as a clean 10-digit string (no +91 prefix).
    phone: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
    },

    // ── Email: optional secondary identifier ───────────────────────────────
    // No `default` — when omitted the field is absent entirely (never stored as
    // null), so the partial unique index below ignores email-less accounts.
    email: {
      type:      String,
      lowercase: true,
      trim:      true,
      validate: {
        // Only validates when a value is present; absent email is always valid.
        validator: (v) => v == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message:   "Enter a valid email address.",
      },
    },

    password: {
      type:     String,
      required: true,
    },

    address: {
      type:    String,
      trim:    true,
      default: "",
    },

    role: {
      type:    String,
      enum:    ["user", "admin"],
      default: "user",
    },

    isPhoneVerified: {
      type:    Boolean,
      default: false,
    },

    // ── Firebase UID ─────────────────────────────────────────────────────────
    // Set at signup once the phone is verified via Firebase Phone Authentication.
    // sparse + unique → multiple nulls allowed (e.g. legacy/admin accounts) but
    // any non-null UID must be unique.
    firebaseUid: {
      type:    String,
      default: null,
      trim:    true,
    },

    // ── Password reset (Forgot Password flow) ────────────────────────────────
    // All fields are `select: false` so they are NEVER returned by a default
    // query (e.g. GET /api/auth/me) and must be explicitly `.select("+field")`-ed
    // inside the reset controllers. They are transient: populated when a reset is
    // requested and wiped the moment the password is changed (or the flow lapses).
    //
    //   resetOtp         — bcrypt HASH of the 6-digit email OTP (never the plain code)
    //   resetOtpExpires  — Date the OTP stops being valid (10 min after issue)
    //   resetOtpAttempts — failed verification count (locks out after 5)
    //   resetToken       — sha256 HASH of the short-lived authorization token issued
    //                      after a successful OTP/Firebase verification
    //   resetTokenExpires— Date the reset token stops being valid (15 min after issue)
    resetOtp:          { type: String, default: null, select: false },
    resetOtpExpires:   { type: Date,   default: null, select: false },
    resetOtpAttempts:  { type: Number, default: 0,    select: false },
    resetToken:        { type: String, default: null, select: false },
    resetTokenExpires: { type: Date,   default: null, select: false },

    // ── Per-account reset-request throttle (anti email-bombing) ──────────────
    // IP-independent cooldown state so an attacker can't flood a victim's inbox
    // by rotating IPs. Enforced in the email-channel background worker.
    //   lastResetRequestAt      — when the most recent reset email was issued
    //   resetRequestWindowStart — start of the current 24h counting window
    //   resetRequestCount       — reset emails issued within the current window
    lastResetRequestAt:      { type: Date,   default: null, select: false },
    resetRequestWindowStart: { type: Date,   default: null, select: false },
    resetRequestCount:       { type: Number, default: 0,    select: false },

    // ── Session invalidation watermark ───────────────────────────────────────
    // Updated automatically whenever the password changes (see pre-save hook).
    // The auth middleware rejects any JWT whose `iat` predates this timestamp, so
    // a password change immediately logs out every previously-issued session.
    // Existing users have `null` until their first password change — their tokens
    // stay valid (backward compatible).
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Partial unique index for email: only indexes documents whose email is a real
// string, so unlimited users may have NO email while non-null emails stay unique.
// (A sparse index would still index `email: null` and collide on the 2nd null.)
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } }
);
// Sparse unique index for Firebase UID (allows multiple nulls)
userSchema.index({ firebaseUid: 1 }, { unique: true, sparse: true });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  // Stamp the change so tokens issued before now are invalidated by the auth
  // middleware. Subtract 1s so a JWT signed in the same wall-clock second as the
  // change (e.g. the token returned right after signup) isn't wrongly rejected —
  // JWT `iat` has only 1-second granularity.
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", userSchema);
