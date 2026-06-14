// server/models/User.js
// Phone-centric user schema.
// Migration notes:
//   • phone is now UNIQUE — run a one-time deduplication script on existing data
//     if multiple users share the same phone number.
//   • email is now OPTIONAL with a SPARSE unique index
//     (sparse = multiple NULL values allowed, but non-null emails must be unique).
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
    // sparse: true → multiple documents can have email: null / undefined
    // while still enforcing uniqueness for non-null values.
    email: {
      type:      String,
      lowercase: true,
      trim:      true,
      default:   null,
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
  },
  { timestamps: true }
);

// Sparse unique index for email (allows multiple nulls)
userSchema.index({ email: 1 }, { unique: true, sparse: true });

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
