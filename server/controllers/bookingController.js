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
  notifyBookingCancelled,
  notifyBookingCancelledAdmins,
  notifyCancellationFeePaid,
  notifyCancellationFeeFailed,
} = require("../services/notificationService");
const {
  REJECTION_REASONS,
  RESCHEDULABLE_STATUSES,
  canTransition,
  pushHistory,
} = require("../constants/quoteWorkflow");
const {
  CANCELLATION_REASONS,
  SUPPORT_GUIDED_STATUSES,
  CANCELLATION_PAYMENT_STATUSES,
  computeCancellationContext,
} = require("../constants/cancellationWorkflow");
const { getHoursRemaining, hasSlotPassed } = require("../utils/scheduleTime");
const { getCancellationRules } = require("../config/businessRules");
const {
  collectCancellationFee,
  verifyCancellationFeePayment,
  findReusableCancellationFeePayment,
  consumePayment,
} = require("../services/paymentService");
const { PAYMENT_STATUS } = require("../models/Payment");

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

// ── Service cancellation workflow ─────────────────────────────────────────────
// State-driven customer cancellation. Behaviour depends on the booking status
// and the time remaining until the scheduled slot (see constants/cancellation-
// Workflow.js + config/businessRules.js). Three endpoints:
//   GET  /:id/cancellation/preview — window/fee context to drive the UI
//   POST /:id/cancellation/pay     — collect the fee (only when one applies)
//   POST /:id/cancel               — finalise the cancellation

/**
 * Shared status guard for the cancellation endpoints. Returns a
 * { code, message } descriptor when cancellation is impossible from the
 * booking's current status, or null when the workflow may proceed.
 */
function cancellationBlocker(booking) {
  if (booking.status === "cancelled") {
    return { code: "already_cancelled", message: "This booking has already been cancelled." };
  }
  if (SUPPORT_GUIDED_STATUSES.includes(booking.status)) {
    return {
      code: "support",
      message:
        booking.status === "completed"
          ? "Completed services cannot be cancelled. If something went wrong, please contact our support team and we'll make it right."
          : "This service is already underway and can no longer be cancelled. Please contact our support team for help.",
    };
  }
  if (booking.status === "closed") {
    return { code: "closed", message: "This request is closed and cannot be cancelled." };
  }
  if (!canTransition(booking.status, "cancelled")) {
    return { code: "invalid_stage", message: "This booking cannot be cancelled at its current stage." };
  }
  // Confirmed booking whose scheduled slot has already passed: this is no
  // longer a cancellation (and must never incur a late-cancellation fee) —
  // it belongs to support / the future no-show workflow. Earlier stages
  // (pending / quote sent / rejected) stay cancellable free of charge even
  // after the slot, so stale requests aren't stranded.
  if (booking.status === "confirmed" && hasSlotPassed(booking)) {
    return {
      code: "support",
      message:
        "The scheduled time for this service has already passed, so it can no longer be cancelled online. Please contact our support team and we'll sort it out.",
    };
  }
  return null;
}

// ── GET /api/bookings/:id/cancellation/preview ────────────────────────────────
// Server-authoritative cancellation context for the client modal: whether
// cancellation is allowed, which window applies, and the fee (if any).
// Read-only — never mutates the booking. Blocked states return 200 with
// allowed:false so the client can render guidance instead of an error toast.
const getCancellationPreview = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid booking ID." });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised." });
    }

    const blocked = cancellationBlocker(booking);
    if (blocked) {
      return res.json({ allowed: false, ...blocked, reasons: CANCELLATION_REASONS });
    }

    const rules = await getCancellationRules();
    const context = computeCancellationContext(booking, rules);

    res.json({
      allowed: true,
      ...context,
      reasons: CANCELLATION_REASONS,
      // Surface the fee inputs so the UI can explain the calculation.
      rules: {
        cancellationFeePercent: rules.cancellationFeePercent,
        minimumCancellationFee: rules.minimumCancellationFee,
      },
    });
  } catch (err) {
    console.error("getCancellationPreview error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── POST /api/bookings/:id/cancellation/pay ───────────────────────────────────
// Collects the cancellation fee when one applies. On success the booking is
// STILL ACTIVE — the client immediately calls POST /:id/cancel with the
// returned paymentId to finalise. On gateway failure nothing changes.
const payCancellationFee = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid booking ID." });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found." });

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorised." });
    }

    const blocked = cancellationBlocker(booking);
    if (blocked) return res.status(400).json({ message: blocked.message });

    // Recompute server-side — the fee the customer saw in the preview may have
    // drifted; the amount charged is always the one that applies right now.
    const rules = await getCancellationRules();
    const context = computeCancellationContext(booking, rules);
    if (!context.requiresPayment || context.fee <= 0) {
      return res.status(400).json({ message: "No cancellation fee is due for this booking." });
    }

    const payment = await collectCancellationFee({
      booking,
      userId: req.user._id,
      amount: context.fee,
    });

    if (payment.status !== PAYMENT_STATUS.PAID) {
      // Gateway declined — booking stays active, nothing else changes.
      res.status(402).json({
        message: "Payment failed. Your booking has not been cancelled — please try again.",
        paymentStatus: "failed",
      });
      notifyCancellationFeeFailed(booking, context.fee).catch((e) =>
        console.error("[NOTIF] payment_failed emit failed:", e.message)
      );
      return;
    }

    // Append-only ledger entry on the timeline — the fee was genuinely paid,
    // even if the follow-up cancel call were to fail. A retried pay call may
    // reuse an already-paid payment (idempotency), so don't log it twice.
    const alreadyLogged = (booking.history || []).some(
      (h) =>
        h.event === "cancellation_fee_paid" &&
        h.meta?.paymentId?.toString() === payment._id.toString()
    );
    if (!alreadyLogged) {
      pushHistory(booking, "cancellation_fee_paid", "customer", {
        amount: payment.amount,
        paymentId: payment._id,
      });
      await booking.save();
    }

    res.json({
      message: "Payment successful.",
      payment: { id: payment._id, amount: payment.amount, status: payment.status },
      fee: context.fee,
    });

    // Reused (already-notified) payments must not trigger a second notification.
    if (!alreadyLogged) {
      notifyCancellationFeePaid(booking, payment).catch((e) =>
        console.error("[NOTIF] payment_successful emit failed:", e.message)
      );
    }
  } catch (err) {
    console.error("payCancellationFee error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── POST /api/bookings/:id/cancel ─────────────────────────────────────────────
// Finalises a customer cancellation. Requires { reason, comment? } (comment
// mandatory when reason is "Other"), plus { paymentId } when the booking is
// inside the charge window. All windows/fees are recomputed here — the server
// at cancel time is the single source of truth, never the client.
const cancelBooking = async (req, res) => {
  try {
    const { reason, comment, paymentId } = req.body || {};

    // ── Reason validation ────────────────────────────────────────────────────
    if (!reason || !CANCELLATION_REASONS.includes(reason)) {
      return res.status(400).json({
        message: "A valid cancellation reason is required.",
        reasons: CANCELLATION_REASONS,
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

    // ── Status guards (invalid transitions are impossible past this point) ───
    const blocked = cancellationBlocker(booking);
    if (blocked) return res.status(400).json({ message: blocked.message, code: blocked.code });

    // ── Window / fee resolution (authoritative, at cancel time) ─────────────
    const rules = await getCancellationRules();
    const context = computeCancellationContext(booking, rules);

    let paymentStatus = CANCELLATION_PAYMENT_STATUSES.NOT_REQUIRED;
    let consumedPayment = null;

    if (context.fee > 0) {
      if (!rules.requirePaymentBeforeCancellation) {
        paymentStatus = CANCELLATION_PAYMENT_STATUSES.WAIVED;
      } else {
        const verdict = await verifyCancellationFeePayment({
          paymentId,
          bookingId: booking._id,
          userId: req.user._id,
          minAmount: context.fee,
        });
        if (verdict.ok) {
          consumedPayment = verdict.payment;
        } else {
          // Recovery path: the fee may already have been paid but never
          // applied (e.g. the client crashed between the pay and cancel
          // calls and lost the paymentId). A paid-but-unconsumed payment for
          // this booking is proof of payment — reuse it rather than leaving
          // the customer stuck with a charged fee and an active booking.
          consumedPayment = await findReusableCancellationFeePayment({
            bookingId: booking._id,
            userId: req.user._id,
            minAmount: context.fee,
          });
        }
        if (!consumedPayment) {
          // No valid payment → booking stays active; tell the client to run
          // (or re-run) the payment step with the current fee.
          return res.status(402).json({
            message: verdict.message,
            paymentRequired: true,
            fee: context.fee,
            window: context.window,
          });
        }
        paymentStatus = CANCELLATION_PAYMENT_STATUSES.PAID;
      }
    }

    // ── Apply cancellation ───────────────────────────────────────────────────
    const stage = booking.status; // status BEFORE the transition
    booking.cancellation = {
      reason,
      comment: trimmedComment,
      requestedAt: new Date(),
      requestedBy: req.user._id,
      cancelledBy: "customer",
      stage,
      timeRemaining: context.hoursRemaining,
      window: context.window,
      fee: context.fee,
      paymentStatus,
      paymentId: consumedPayment ? consumedPayment._id : null,
    };
    booking.status = "cancelled";
    pushHistory(booking, "cancelled", "customer", {
      reason,
      comment: trimmedComment,
      stage,
      window: context.window,
      windowLabel: context.windowLabel,
      fee: context.fee,
    });
    await booking.save();

    // Single-use: bind the payment to this completed cancellation. Compare-
    // and-set so two racing cancel requests can never both claim it. Ordering
    // matters: the booking is cancelled first — worst case (this write fails)
    // is an unconsumed payment on an already-cancelled booking, which is
    // harmless (it's bound to this booking and the blocker stops a re-cancel);
    // the reverse order could consume the fee without cancelling anything.
    if (consumedPayment) {
      const claimed = await consumePayment(consumedPayment._id);
      if (!claimed) {
        console.warn(
          `[PAYMENT] cancellation payment ${consumedPayment._id} was already consumed (booking ${booking._id})`
        );
      }
    }

    res.json({
      message:
        context.fee > 0 && paymentStatus === CANCELLATION_PAYMENT_STATUSES.PAID
          ? "Cancellation fee received — your booking has been cancelled."
          : "Booking cancelled successfully.",
      booking,
    });

    // Fire-and-forget notifications: customer + all admins (the admin team is
    // the vendor in this system — there is no separate vendor account).
    notifyBookingCancelled(booking, booking.cancellation).catch((e) =>
      console.error("[NOTIF] booking_cancelled (customer) emit failed:", e.message)
    );
    notifyBookingCancelledAdmins(booking, booking.cancellation, context.windowLabel).catch((e) =>
      console.error("[NOTIF] booking_cancelled (admins) emit failed:", e.message)
    );
  } catch (err) {
    console.error("cancelBooking error:", err.message);
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
      // Shared scheduled-time math (utils/scheduleTime) — the same
      // implementation the cancellation workflow uses, so the two windows can
      // never disagree. null = unparsable legacy slot (guard skipped, as
      // before); negative = slot already passed (rescheduling to a future
      // date remains allowed, as before).
      const hoursRemaining = getHoursRemaining(booking);
      if (hoursRemaining !== null && hoursRemaining >= 0 && hoursRemaining < minHours) {
        return res.status(400).json({
          message: `Bookings cannot be rescheduled within ${minHours} hours of the appointment.`,
        });
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
  getCancellationPreview,
  payCancellationFee,
  cancelBooking,
  rescheduleBooking,
};