// server/controllers/bookingController.js

const Booking  = require("../models/Booking");
const Service  = require("../models/Service");
const Settings = require("../models/Settings");
const { validateBookingDateTime } = require("../utils/bookingValidation"); // ← MODULE 2
const {
  sendQuotationConfirmOTP,
  verifyQuotationConfirmOTP,
  normalizePhone,
} = require("../services/otpService");

// ── POST /api/bookings ─────────────────────────────────────────────────────────
const createBooking = async (req, res) => {
  try {
    const { service, date, time, address, phone, serviceIssue, notes } = req.body;

    // ── Basic field presence ─────────────────────────────────────────────────
    if (!service || !date || !time || !address) {
      return res
        .status(400)
        .json({ message: "service, date, time, and address are required." });
    }
    if (!serviceIssue || !serviceIssue.trim()) {
      return res.status(400).json({ message: "serviceIssue is required." });
    }

    // ── M1: Max-length enforcement on free-text fields ────────────────────────
    // Limits are resolved dynamically from Settings (DB → env var → default).
    // Changing a limit only requires an admin settings update — no code change.
    const limits = await Settings.getBookingFieldLimits();

    if (address.length > limits.address)
      return res.status(400).json({
        message: `Address must be ${limits.address} characters or fewer.`,
      });
    if (serviceIssue.trim().length > limits.serviceIssue)
      return res.status(400).json({
        message: `Service issue description must be ${limits.serviceIssue} characters or fewer.`,
      });
    if (notes && notes.length > limits.notes)
      return res.status(400).json({
        message: `Notes must be ${limits.notes} characters or fewer.`,
      });

    // ── M2: Validate service against enabled services in DB ───────────────────
    const validService = await Service.findOne({ name: service.trim(), isEnabled: true });
    if (!validService)
      return res.status(400).json({ message: "Invalid or unavailable service selected." });

    // ── MODULE 2: Date & time validation (server is the source of truth) ────
    // This runs AFTER the frontend check and catches any bypass attempts
    // (e.g., direct Postman calls, browser devtools manipulation).
    const { valid, message } = validateBookingDateTime(date, time);
    if (!valid) {
      return res.status(400).json({ message });
    }
    // ────────────────────────────────────────────────────────────────────────

    const booking = await Booking.create({
      userId: req.user._id,
      service,
      date: new Date(date),
      time,
      address,
      phone: phone || "",
      serviceIssue,
      notes: notes || "",
    });

    res.status(201).json({ message: "Booking created successfully.", booking });
  } catch (err) {
    console.error("createBooking error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── GET /api/bookings/my ───────────────────────────────────────────────────────
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ bookings });
  } catch (err) {
    console.error("getMyBookings error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── POST /api/bookings/:id/send-confirmation-otp ───────────────────────────────
// Step 1 of the new quotation acceptance flow.
// User clicks "Accept" → we send an OTP to their registered phone.
const sendConfirmationOTP = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    // Ownership check
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised." });
    }

    // Only bookings awaiting user confirmation can trigger an OTP
    if (booking.status !== "awaiting_user_confirmation") {
      return res.status(400).json({
        message: "This booking is not awaiting your confirmation.",
      });
    }

    // Resolve the phone to send OTP to: booking phone → user phone (fallback)
    const rawPhone = booking.phone || req.user.phone;
    if (!rawPhone) {
      return res.status(400).json({
        message: "No phone number found. Please update your profile.",
      });
    }

    await sendQuotationConfirmOTP(rawPhone, booking._id, req.user._id);

    const maskedPhone = normalizePhone(rawPhone).replace(/(\d{2})\d{6}(\d{2})/, "$1******$2");

    res.json({
      message: `OTP sent to +91${maskedPhone}. Valid for 10 minutes.`,
      phone:   maskedPhone,
    });
  } catch (err) {
    console.error("sendConfirmationOTP error:", err.message);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
};

// ── POST /api/bookings/:id/verify-confirmation-otp ────────────────────────────
// Step 2 of the new quotation acceptance flow.
// User submits the OTP → we verify and, on success, mark booking as confirmed.
const verifyConfirmationOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp || String(otp).trim().length !== 6) {
      return res.status(400).json({ message: "A valid 6-digit OTP is required." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    // Ownership check
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised." });
    }

    // Idempotency guards
    if (booking.status === "confirmed") {
      return res.status(400).json({ message: "Booking is already confirmed." });
    }
    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking has already been cancelled." });
    }
    if (booking.status !== "awaiting_user_confirmation") {
      return res.status(400).json({
        message: "Booking is not awaiting your confirmation.",
      });
    }

    // Resolve phone (same logic as sendConfirmationOTP)
    const rawPhone = booking.phone || req.user.phone;

    const result = await verifyQuotationConfirmOTP(
      rawPhone,
      String(otp).trim(),
      booking._id,
      req.user._id
    );

    if (!result.success) {
      return res.status(400).json({ message: result.reason });
    }

    // ✅ OTP verified — confirm the booking
    booking.status = "confirmed";
    await booking.save();

    res.json({ message: "Booking confirmed successfully!", booking });
  } catch (err) {
    console.error("verifyConfirmationOTP error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── POST /api/bookings/:id/reject ──────────────────────────────────────────────
// User rejects the admin's price quote → status becomes "cancelled"
// No OTP required for rejection (user is cancelling, not committing funds).
const rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised." });
    }
    if (booking.status !== "awaiting_user_confirmation") {
      return res
        .status(400)
        .json({ message: "Booking is not awaiting your confirmation." });
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Booking cancelled.", booking });
  } catch (err) {
    console.error("rejectBooking error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── PATCH /api/bookings/:id/reschedule ────────────────────────────────────────
// Allows the booking owner to change the date and/or time of an active booking.
// Restrictions:
//   • Only "pending", "awaiting_user_confirmation", and "confirmed" bookings
//     may be rescheduled — completed and cancelled are immutable.
//   • The new date/time must pass the same validation as createBooking.
//   • MIN_HOURS_BEFORE guard: the current booking slot must be more than N hours
//     away; rescheduling last-minute is not permitted.
//     The threshold is resolved dynamically (Settings DB → env var → default 2h).
//     Set to 0 to disable this check entirely.

const RESCHEDULABLE_STATUSES = ["pending", "awaiting_user_confirmation", "confirmed"];

const rescheduleBooking = async (req, res) => {
  try {
    const { date, time } = req.body;

    // ── Presence check ───────────────────────────────────────────────────────
    if (!date || !time) {
      return res.status(400).json({ message: "New date and time are required." });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    // ── Ownership check ──────────────────────────────────────────────────────
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised." });
    }

    // ── Status eligibility ───────────────────────────────────────────────────
    if (!RESCHEDULABLE_STATUSES.includes(booking.status)) {
      return res.status(400).json({
        message: `Bookings with status "${booking.status}" cannot be rescheduled.`,
      });
    }

    // ── Too-close-to-appointment guard ───────────────────────────────────────
    // Resolve threshold dynamically: DB setting → env var → default (2h).
    const minHours = await Settings.getRescheduleHours();

    if (minHours > 0) {
      const { parseSlotToMinutes } = require("../utils/bookingValidation");
      const existingDate = new Date(booking.date);
      const slotMins = parseSlotToMinutes(booking.time);
      if (slotMins !== -1) {
        existingDate.setHours(Math.floor(slotMins / 60), slotMins % 60, 0, 0);
        const hoursRemaining = (existingDate - new Date()) / (1000 * 60 * 60);
        if (hoursRemaining >= 0 && hoursRemaining < minHours) {
          return res.status(400).json({
            message: `Bookings cannot be rescheduled within ${minHours} hours of the appointment.`,
          });
        }
      }
    }

    // ── New date/time validation (same rules as createBooking) ───────────────
    const { valid, message } = validateBookingDateTime(date, time);
    if (!valid) {
      return res.status(400).json({ message });
    }

    // ── Persist ──────────────────────────────────────────────────────────────
    booking.date = new Date(date);
    booking.time = time;
    await booking.save();

    res.json({ message: "Booking rescheduled successfully.", booking });
  } catch (err) {
    console.error("rescheduleBooking error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  sendConfirmationOTP,
  verifyConfirmationOTP,
  rejectBooking,
  rescheduleBooking,
};