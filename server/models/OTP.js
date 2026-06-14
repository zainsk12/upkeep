// server/models/OTP.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },

  otpHash: {
    type: String,
    required: true,
  },

  // NEW → distinguishes signup OTP vs quotation OTP
  purpose: {
    type: String,
    enum: ["signup", "quotation_confirm"],
    default: "signup",
    index: true,
  },

  // NEW → quotation-specific OTP isolation
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    default: null,
    index: true,
  },

  // NEW → extra ownership protection
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  attempts: {
    type: Number,
    default: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // 10 minutes TTL
  },
});

// Compare entered OTP with stored hash
otpSchema.methods.compareOtp = function (plain) {
  return bcrypt.compare(String(plain), this.otpHash);
};

module.exports = mongoose.model("OTP", otpSchema);