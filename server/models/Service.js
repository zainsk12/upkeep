// server/models/Service.js  ← NEW

const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    // Matches the `name` field used in Booking.service (e.g. "Electrical")
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Short description shown on the services page
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // Whether the service is bookable by users
    isEnabled: {
      type: Boolean,
      default: true,
    },
    // Optional reason shown to users when a service is disabled
    disabledReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);