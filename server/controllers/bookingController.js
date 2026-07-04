// server/controllers/bookingController.js

const Booking  = require("../models/Booking");
const Service  = require("../models/Service");
const Settings = require("../models/Settings");
const { validateBookingDateTime } = require("../utils/bookingValidation"); // ← MODULE 2
const isValidId = require("../utils/isValidObjectId");
const { generateUniqueBookingId } = require("../utils/bookingId");
const { verifyRecaptcha } = require("../services/recaptchaService");
const {
  notifyBookingCreated,
  notifyBookingConfirmed,
  notifyQuoteRejected,
  notifyRevisionRequested,
  notifyRequestClosed,
} = require("../services/notificationService");
const {
  REJECTION_REASONS,
  canTransition,
  pushHistory,
} = require("../constants/quoteWorkflow");

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

    // Generate a unique, human-readable booking reference (e.g. UPK-20260617-7F3K9)
    const bookingId = await generateUniqueBookingId(Booking);

    const booking = await Booking.create({
      bookingId,
      userId: req.user._id,
      service,
      date: new Date(date),
      time,
      address,
      phone: phone || "",
      serviceIssue,
      notes: notes || "",
      // Seed the activity timeline — every later transition appends to this.
      history: [
        { event: "requested", label: "Service Requested", by: "customer", at: new Date() },
      ],
    });

    res.status(201).json({ message: "Booking created successfully.", booking });

    // Fire-and-forget in-app notification (never blocks/affects the response).
    notifyBookingCreated(booking).catch((e) =>
      console.error("[NOTIF] booking_created emit failed:", e.message)
    );
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

// ── POST /api/bookings/:id/confirm ──────────────────────────────────────────────
// Quotation acceptance flow (reCAPTCHA-protected, no OTP).
// User clicks "Accept Quote / Confirm Booking" → client runs reCAPTCHA v3 and
// sends the token. We verify it server-side:
//   • success → status becomes "confirmed" + confirmation email is sent
//   • failure → status stays "awaiting_user_confirmation", no email, error returned
const confirmBooking = async (req, res) => {
  // ── TIMING INSTRUMENTATION (diagnostic) ───────────────────────────────────
  // Measures each major step and logs a single structured line to Railway logs.
  // Logging only — does not change behaviour. Remove once the bottleneck is fixed.
  const T = {};
  const reqStart = Date.now();
  let mark = Date.now();
  const lap = (key) => { T[key] = Date.now() - mark; mark = Date.now(); };
  try {
    const { recaptchaToken } = req.body;

    const booking = await Booking.findById(req.params.id);
    lap("db_findById_ms");
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    // Ownership check
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised." });
    }

    // Idempotency / status guards
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

    // ── reCAPTCHA verification (gate) ─────────────────────────────────────────
    const captcha = await verifyRecaptcha(
      recaptchaToken,
      "confirm_booking",
      req.ip
    );
    lap("recaptcha_verify_ms");
    if (!captcha.success) {
      // Leave the booking untouched — do NOT confirm, do NOT email.
      return res.status(400).json({
        message: captcha.reason || "Verification failed. Please try again.",
      });
    }

    // ✅ Verified — confirm the booking.
    // NOTE: the customer notification email is intentionally NOT sent here.
    // Per the updated flow, the email is sent only once a worker has been
    // assigned to the booking (see adminController.updateBooking).
    booking.status = "confirmed";
    pushHistory(booking, "confirmed", "customer");
    await booking.save();
    lap("db_save_ms");

    res.json({ message: "Booking confirmed successfully!", booking });
    T.total_handler_ms = Date.now() - reqStart;
    console.log("[TIMING] confirmBooking", JSON.stringify(T));

    // Fire-and-forget in-app notification (after the response — no added latency).
    notifyBookingConfirmed(booking).catch((e) =>
      console.error("[NOTIF] booking_confirmed emit failed:", e.message)
    );
  } catch (err) {
    console.error("confirmBooking error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── POST /api/bookings/:id/reject ──────────────────────────────────────────────
// Quote rejection workflow. The customer rejects the quotation with a reason
// (one of REJECTION_REASONS; free-text comment required when "Other").
// Status: awaiting_user_confirmation → quote_rejected. The rejected quotation
// is snapshotted into quotationHistory so a later revision never overwrites it.
// From quote_rejected the customer can request a revision or close the request.
const rejectBooking = async (req, res) => {
  try {
    const { reason, comment } = req.body || {};

    // ── Reason validation ────────────────────────────────────────────────────
    if (!reason || !REJECTION_REASONS.includes(reason)) {
      return res.status(400).json({
        message: "A valid rejection reason is required.",
        reasons: REJECTION_REASONS,
      });
    }
    const trimmedComment = (comment || "").trim();
    if (reason === "Other" && !trimmedComment) {
      return res.status(400).json({
        message: "Please describe your reason when selecting \"Other\".",
      });
    }
    if (trimmedComment.length > 500) {
      return res.status(400).json({
        message: "Comment must be 500 characters or fewer.",
      });
    }

    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid booking ID." });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    // ── Ownership ────────────────────────────────────────────────────────────
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised." });
    }

    // ── Status guards (meaningful per-state errors) ──────────────────────────
    if (booking.status === "quote_rejected") {
      return res.status(400).json({ message: "This quotation has already been rejected." });
    }
    if (booking.status === "confirmed") {
      return res.status(400).json({ message: "This quotation has already been accepted and cannot be rejected." });
    }
    if (booking.status === "completed") {
      return res.status(400).json({ message: "Completed requests cannot be rejected." });
    }
    if (booking.status === "cancelled" || booking.status === "closed") {
      return res.status(400).json({ message: "This request is no longer active." });
    }
    if (!canTransition(booking.status, "quote_rejected")) {
      return res.status(400).json({ message: "There is no quotation awaiting your response." });
    }

    // ── Apply rejection ──────────────────────────────────────────────────────
    booking.rejection = {
      reason,
      comment: trimmedComment,
      rejectedAt: new Date(),
      rejectedBy: req.user._id,
    };

    // Snapshot the rejected quotation (append-only revision history).
    if (booking.quotation && booking.quotation.total > 0) {
      // When the quote was actually sent — from the timeline if available
      // (updatedAt is the last save of ANY kind, e.g. a reschedule).
      const lastQuoteSent = [...booking.history]
        .reverse()
        .find((h) => h.event === "quote_sent" || h.event === "revised_quote_sent");
      booking.quotationHistory.push({
        revision: booking.quotationHistory.length + 1,
        ...booking.quotation.toObject(),
        sentAt: lastQuoteSent?.at || booking.updatedAt,
        rejectedAt: booking.rejection.rejectedAt,
        rejectionReason: reason,
        rejectionComment: trimmedComment,
      });
    }

    booking.status = "quote_rejected";
    pushHistory(booking, "quote_rejected", "customer", { reason, comment: trimmedComment });
    await booking.save();

    res.json({ message: "Quotation rejected.", booking });

    // Fire-and-forget: notify all admins with the reason.
    notifyQuoteRejected(booking, booking.rejection).catch((e) =>
      console.error("[NOTIF] quote_rejected emit failed:", e.message)
    );
  } catch (err) {
    console.error("rejectBooking error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── POST /api/bookings/:id/request-revision ───────────────────────────────────
// After rejecting a quote, the customer may ask for a revised quotation.
// Status: quote_rejected → revision_requested. Admins are notified and can then
// send a new quotation (see adminController.updateBooking), which moves the
// booking back to awaiting_user_confirmation.
const requestQuoteRevision = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid booking ID." });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised." });
    }

    if (booking.status === "revision_requested") {
      return res.status(400).json({ message: "A revised quotation has already been requested." });
    }
    if (!canTransition(booking.status, "revision_requested")) {
      return res.status(400).json({
        message: "A revision can only be requested after rejecting a quotation.",
      });
    }

    booking.status = "revision_requested";
    pushHistory(booking, "revision_requested", "customer");
    await booking.save();

    res.json({ message: "Revised quotation requested.", booking });

    notifyRevisionRequested(booking).catch((e) =>
      console.error("[NOTIF] revision_requested emit failed:", e.message)
    );
  } catch (err) {
    console.error("requestQuoteRevision error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── POST /api/bookings/:id/close ───────────────────────────────────────────────
// After rejecting a quote, the customer may close the request entirely.
// Status: quote_rejected → closed (terminal — no new quotations accepted).
const closeBookingRequest = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid booking ID." });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised." });
    }

    if (booking.status === "closed") {
      return res.status(400).json({ message: "This request is already closed." });
    }
    if (!canTransition(booking.status, "closed")) {
      return res.status(400).json({
        message: "A request can only be closed after rejecting its quotation.",
      });
    }

    booking.status = "closed";
    pushHistory(booking, "closed", "customer");
    await booking.save();

    res.json({ message: "Request closed.", booking });

    notifyRequestClosed(booking).catch((e) =>
      console.error("[NOTIF] request_closed emit failed:", e.message)
    );
  } catch (err) {
    console.error("closeBookingRequest error:", err.message);
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
  confirmBooking,
  rejectBooking,
  requestQuoteRevision,
  closeBookingRequest,
  rescheduleBooking,
};