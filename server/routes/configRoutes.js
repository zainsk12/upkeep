// server/routes/configRoutes.js
// Public config endpoints — no auth required.
//
// GET /api/config/time-slots          — canonical booking time slots
// GET /api/config/site                — footer/site contact details driven by env vars
// GET /api/config/reschedule-hours    — reschedule lockout window (hours) for the frontend
// GET /api/config/booking-field-limits — max character limits for booking free-text fields

const express  = require("express");
const router   = express.Router();
const Settings = require("../models/Settings");
const { VALID_TIME_SLOTS } = require("../utils/bookingValidation");

// GET /api/config/time-slots
router.get("/time-slots", (req, res) => {
  res.json({ timeSlots: VALID_TIME_SLOTS });
});

// GET /api/config/site
// Reads footer/contact details from environment variables so they can be
// updated without touching frontend code or triggering a redeployment.
// Set these in server/.env (see env.example for reference).
router.get("/site", (req, res) => {
  res.json({
    businessName: process.env.SITE_BUSINESS_NAME || "UpKeep",
    tagline:      process.env.SITE_TAGLINE        || "by Austrum",
    city:         process.env.SITE_CITY           || "Nashik, Maharashtra",
    phone:        process.env.SITE_PHONE          || "+91 98765 43210",
    email:        process.env.SITE_EMAIL          || "support@austrum.in",
  });
});

// GET /api/config/reschedule-hours
// Returns the minimum number of hours before an appointment during which
// rescheduling is blocked. Resolution order:
//   1. Value persisted in the Settings collection (admin-configurable).
//   2. MIN_HOURS_BEFORE_RESCHEDULE environment variable.
//   3. Hard-coded default of 2.
// Value of 0 means the guard is disabled (rescheduling always allowed).
router.get("/reschedule-hours", async (req, res) => {
  try {
    const minHoursBeforeReschedule = await Settings.getRescheduleHours();
    res.json({ minHoursBeforeReschedule });
  } catch (err) {
    console.error("GET /api/config/reschedule-hours error:", err.message);
    // Fail safe: return the env-var or default so the frontend still functions.
    res.json({ minHoursBeforeReschedule: Settings.DEFAULTS.MIN_HOURS_BEFORE_RESCHEDULE });
  }
});

// GET /api/config/booking-field-limits
// Returns the maximum character lengths for free-text booking fields.
// Resolution order per field:
//   1. Value persisted in the Settings collection (admin-configurable).
//   2. BOOKING_LIMIT_* environment variables.
//   3. Hard-coded fallbacks (address=300, serviceIssue=1000, notes=500).
// Frontend can consume this endpoint to keep client-side validation in sync
// with the server without any code changes when limits are updated.
router.get("/booking-field-limits", async (req, res) => {
  try {
    const limits = await Settings.getBookingFieldLimits();
    res.json(limits);
  } catch (err) {
    console.error("GET /api/config/booking-field-limits error:", err.message);
    // Fail safe: return the env-var-driven defaults so the frontend still
    // has something sensible to enforce client-side.
    res.json({
      address:      Settings.DEFAULTS.BOOKING_LIMIT_ADDRESS,
      serviceIssue: Settings.DEFAULTS.BOOKING_LIMIT_SERVICE_ISSUE,
      notes:        Settings.DEFAULTS.BOOKING_LIMIT_NOTES,
    });
  }
});

module.exports = router;