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
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", userSchema);
