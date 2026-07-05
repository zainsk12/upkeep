// server/services/notificationService.js
//
// Central factory for generating notifications from application events.
// Every emit helper is FIRE-AND-FORGET SAFE: createNotification catches its own
// errors and resolves to null (never rejects), so a notification failure can
// never break the triggering flow (booking, auth, etc.) nor surface as an
// unhandledRejection. Callers may `await` it or not.

const Notification = require("../models/Notification");
const User = require("../models/User");
const { NOTIFICATION_CATALOG } = require("../constants/notifications");
const { CANCELLATION_PAYMENT_STATUSES } = require("../constants/cancellationWorkflow");
const { emitToUser, hasActiveSockets, NOTIFICATION_EVENTS } = require("./socketService");
const {
  getPreferencesLean,
  isCategoryAllowed,
  filterInAppEnabled,
} = require("./notificationPreferenceService");
const { deliverExternal } = require("./channels");

// Normalise a userId that may be a raw ObjectId or a populated user document.
const resolveUserId = (userId) => (userId && userId._id ? userId._id : userId);

/**
 * Create a single notification. Resolves category/icon/priority from the catalog
 * when not explicitly provided. Returns the created doc, or null on any failure.
 */
async function createNotification({
  userId,
  type,
  title,
  message,
  link = "",
  metadata = {},
  category,
  icon,
  priority,
  campaignId = null,
  // When true (default), honour the user's in-app category preference and skip
  // creating the notification if they opted that category out. The campaign
  // path sets this false because it already bulk-filters recipients up front
  // (avoids a per-recipient preference read during fan-out).
  respectPreferences = true,
}) {
  try {
    const uid = resolveUserId(userId);
    if (!uid || !type || !title || !message) {
      console.error("[NOTIF] Skipped — missing required fields:", { uid: !!uid, type, title: !!title });
      return null;
    }

    const defaults = NOTIFICATION_CATALOG[type] || {};
    const resolvedCategory = category || defaults.category || "system";

    // ── Preference gate (Module 6) ──────────────────────────────────────────
    // Load the user's preferences once (null for users who never changed them →
    // all defaults / fully enabled). Reused below for future-channel routing so
    // this stays a single read. Fail-open: a missing/unreadable doc = allowed.
    let prefs = null;
    if (respectPreferences) {
      prefs = await getPreferencesLean(uid);
      if (!isCategoryAllowed(prefs, resolvedCategory)) return null; // user opted out
    }

    const doc = await Notification.create({
      userId:   uid,
      type,
      title,
      message,
      link,
      metadata: metadata || {},
      category: resolvedCategory,
      icon:     icon     || defaults.icon     || "Bell",
      priority: priority || defaults.priority || "normal",
      campaignId,
    });

    // ── Real-time push to the recipient's active sessions ──────────────────────
    // Include the authoritative unread count so clients set an absolute value
    // (never drift). Guarded so a socket hiccup can't fail the write.
    // The unread count exists only to feed this emit — when the user has no
    // connected sockets the emit is a no-op, so skip the count query entirely
    // (matters during admin fan-outs, where most recipients are offline).
    // Offline users still get the correct count from the REST API on next load.
    try {
      if (hasActiveSockets(uid)) {
        const unreadCount = await Notification.countDocuments({ userId: uid, isRead: false });
        emitToUser(uid, NOTIFICATION_EVENTS.CREATED, { notification: doc.toObject(), unreadCount });
      }
    } catch (emitErr) {
      console.error("[NOTIF] socket emit (created) failed:", emitErr.message);
    }

    // ── Future-channel delivery (Module 6) ──────────────────────────────────
    // Route this notification through the future push/email/sms/whatsapp
    // channels the user opted into. Currently a guaranteed no-op (all channels
    // are inert stubs) — this is the extension point future modules plug into.
    // Fire-and-forget and fully guarded: it can never affect in-app delivery.
    if (prefs) {
      deliverExternal({ notification: doc.toObject(), userId: uid, preferences: prefs }).catch(
        (chErr) => console.error("[NOTIF] external channel delivery failed:", chErr.message)
      );
    }

    return doc;
  } catch (err) {
    // Duplicate (campaignId, userId) — a notification for this campaign already
    // exists for this user (e.g. a campaign re-dispatch after a crash/overlap).
    // This is the idempotency guard working as intended: skip silently.
    if (err && err.code === 11000) return null;
    // Otherwise swallow — a failed notification must never break the parent op.
    console.error("[NOTIF] createNotification failed:", err.message);
    return null;
  }
}

// ── Event emit helpers ─────────────────────────────────────────────────────────
// Thin wrappers so call-sites read declaratively and copy is centralised.
// Links point only at routes that already exist (payments have no dedicated page
// yet, so those point at the related bookings screen — see Module 2 summary).

const notifyBookingCreated = (booking) =>
  createNotification({
    userId: booking.userId,
    type: "booking_created",
    title: "Booking Received",
    message: `Your ${booking.service} booking has been received and is being reviewed.`,
    link: "/my-bookings",
    metadata: { bookingId: booking._id, bookingRef: booking.bookingId, service: booking.service },
  });

const notifyBookingConfirmed = (booking) =>
  createNotification({
    userId: booking.userId,
    type: "booking_confirmed",
    title: "Booking Confirmed",
    message: `Your ${booking.service} booking is confirmed. A technician will be assigned soon.`,
    link: "/my-bookings",
    metadata: { bookingId: booking._id, bookingRef: booking.bookingId, service: booking.service },
  });

const notifyTechnicianAssigned = (booking, worker) =>
  createNotification({
    userId: booking.userId,
    type: "technician_assigned",
    title: "Technician Assigned",
    message: `${worker?.name || "A technician"} has been assigned to your ${booking.service} booking.`,
    link: "/my-bookings",
    metadata: { bookingId: booking._id, bookingRef: booking.bookingId, worker: worker?.name },
  });

const notifyServiceCompleted = (booking) =>
  createNotification({
    userId: booking.userId,
    type: "service_completed",
    title: "Service Completed",
    message: `Your ${booking.service} service is complete. We'd love your feedback — tap to leave a review.`,
    link: "/my-bookings",
    metadata: { bookingId: booking._id, bookingRef: booking.bookingId, service: booking.service },
  });

const notifyProfileUpdated = (userId) =>
  createNotification({
    userId,
    type: "profile_updated",
    title: "Profile Updated",
    message: "Your profile details were updated successfully.",
    link: "/profile",
  });

const notifyPasswordChanged = (userId) =>
  createNotification({
    userId,
    type: "password_changed",
    title: "Password Changed",
    message: "Your password was changed successfully. If this wasn't you, contact support immediately.",
    link: "/settings/account",
  });

// ── Quote workflow notifications ───────────────────────────────────────────────

/**
 * Fan a notification out to every admin user. Used by the quote rejection
 * workflow so admins learn about customer actions in real time. Fire-and-forget
 * safe like everything else here: a lookup failure resolves to an empty result.
 */
async function notifyAdmins(payload) {
  try {
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    // Bulk-filter category opt-outs in ONE query instead of a per-admin
    // preference read inside createNotification (same pattern as the campaign
    // fan-out — hence respectPreferences: false below). Fail-open like the
    // per-user path: a filter error keeps every recipient.
    const category =
      payload.category || NOTIFICATION_CATALOG[payload.type]?.category || "system";
    const recipientIds = await filterInAppEnabled(
      admins.map((a) => a._id),
      category
    );
    return Promise.all(
      recipientIds.map((id) =>
        createNotification({ ...payload, userId: id, respectPreferences: false })
      )
    );
  } catch (err) {
    console.error("[NOTIF] notifyAdmins failed:", err.message);
    return null;
  }
}

const notifyQuoteRejected = (booking, rejection) =>
  notifyAdmins({
    type: "quote_rejected",
    title: "Quote Rejected",
    message:
      `Customer rejected your quotation for ${booking.service}` +
      ` (₹${(booking.quotation?.total ?? booking.price ?? 0).toLocaleString("en-IN")}).` +
      ` Reason: ${rejection.reason}` +
      (rejection.comment ? ` — "${rejection.comment}"` : ""),
    metadata: {
      bookingId: booking._id,
      bookingRef: booking.bookingId,
      service: booking.service,
      reason: rejection.reason,
      comment: rejection.comment || "",
    },
  });

const notifyRevisionRequested = (booking) =>
  notifyAdmins({
    type: "revision_requested",
    title: "Revised Quote Requested",
    message:
      `Customer requested a revised quotation for ${booking.service}.` +
      (booking.rejection?.reason ? ` Original rejection reason: ${booking.rejection.reason}.` : ""),
    metadata: {
      bookingId: booking._id,
      bookingRef: booking.bookingId,
      service: booking.service,
      reason: booking.rejection?.reason || "",
    },
  });

const notifyRequestClosed = (booking) =>
  notifyAdmins({
    type: "request_closed",
    title: "Request Closed",
    message: `Customer closed the ${booking.service} request after rejecting the quotation.`,
    metadata: {
      bookingId: booking._id,
      bookingRef: booking.bookingId,
      service: booking.service,
      reason: booking.rejection?.reason || "",
    },
  });

// Customer-facing: a revised quotation has been sent after they asked for one.
const notifyQuoteRevised = (booking) =>
  createNotification({
    userId: booking.userId,
    type: "quote_revised",
    title: "Revised Quotation Received",
    message: `We've sent a revised quotation for your ${booking.service} request. Tap to review and respond.`,
    link: "/my-bookings",
    metadata: { bookingId: booking._id, bookingRef: booking.bookingId, service: booking.service },
  });

// ── Service cancellation notifications ─────────────────────────────────────────
// `cancellation` is the booking.cancellation sub-doc; `windowLabel` the human
// window name (e.g. "Late Cancellation") resolved by the controller.
//
// Fee wording is driven by the recorded paymentStatus — never inferred from the
// fee amount alone. A fee may exist but be waived by configuration
// (requirePaymentBeforeCancellation=false): the customer was NOT charged, and
// the message must never claim otherwise.

/** True when the cancellation fee was actually collected / actually waived. */
const feeWasPaid = (c) =>
  c?.fee > 0 && c?.paymentStatus === CANCELLATION_PAYMENT_STATUSES.PAID;
const feeWasWaived = (c) =>
  c?.fee > 0 && c?.paymentStatus === CANCELLATION_PAYMENT_STATUSES.WAIVED;

const notifyBookingCancelled = (booking, cancellation) =>
  createNotification({
    userId: booking.userId,
    type: "booking_cancelled",
    title: "Booking Cancelled",
    message:
      `Your ${booking.service} booking has been cancelled successfully.` +
      (feeWasPaid(cancellation)
        ? ` A cancellation fee of ₹${cancellation.fee.toLocaleString("en-IN")} was charged.`
        : feeWasWaived(cancellation)
        ? ` The cancellation fee of ₹${cancellation.fee.toLocaleString("en-IN")} was waived — you have not been charged.`
        : ""),
    link: "/my-bookings",
    metadata: {
      bookingId: booking._id,
      bookingRef: booking.bookingId,
      service: booking.service,
      reason: cancellation?.reason || "",
      fee: cancellation?.fee || 0,
      paymentStatus:
        cancellation?.paymentStatus || CANCELLATION_PAYMENT_STATUSES.NOT_REQUIRED,
    },
  });

const notifyBookingCancelledAdmins = (booking, cancellation, windowLabel) =>
  notifyAdmins({
    type: "booking_cancelled",
    title: "Booking Cancelled by Customer",
    message:
      `Customer cancelled the ${booking.service} booking` +
      (booking.bookingId ? ` (${booking.bookingId})` : "") +
      `. Reason: ${cancellation.reason}` +
      (cancellation.comment ? ` — "${cancellation.comment}"` : "") +
      (windowLabel ? `. Window: ${windowLabel}` : "") +
      (feeWasPaid(cancellation)
        ? `. Fee collected: ₹${cancellation.fee.toLocaleString("en-IN")}`
        : feeWasWaived(cancellation)
        ? `. Fee waived: ₹${cancellation.fee.toLocaleString("en-IN")} (not charged)`
        : ""),
    metadata: {
      bookingId: booking._id,
      bookingRef: booking.bookingId,
      service: booking.service,
      reason: cancellation.reason,
      comment: cancellation.comment || "",
      window: cancellation.window,
      fee: cancellation.fee || 0,
      paymentStatus:
        cancellation?.paymentStatus || CANCELLATION_PAYMENT_STATUSES.NOT_REQUIRED,
    },
  });

const notifyCancellationFeePaid = (booking, payment) =>
  createNotification({
    userId: booking.userId,
    type: "payment_successful",
    title: "Cancellation Fee Paid",
    message:
      `Payment of ₹${payment.amount.toLocaleString("en-IN")} received for cancelling ` +
      `your ${booking.service} booking.`,
    link: "/my-bookings",
    metadata: {
      bookingId: booking._id,
      bookingRef: booking.bookingId,
      paymentId: payment._id,
      amount: payment.amount,
    },
  });

const notifyCancellationFeeFailed = (booking, amount) =>
  createNotification({
    userId: booking.userId,
    type: "payment_failed",
    title: "Cancellation Fee Payment Failed",
    message:
      `Payment of ₹${amount.toLocaleString("en-IN")} for cancelling your ` +
      `${booking.service} booking failed. The booking is still active.`,
    link: "/my-bookings",
    metadata: { bookingId: booking._id, bookingRef: booking.bookingId, amount },
  });

const notifyWelcome = (userId, name) =>
  createNotification({
    userId,
    type: "welcome",
    title: "Welcome to UpKeep 🎉",
    message: `Welcome${name ? `, ${name.split(" ")[0]}` : ""}! Explore trusted home services near you and book in minutes.`,
    link: "/services",
  });

module.exports = {
  createNotification,
  notifyBookingCreated,
  notifyBookingConfirmed,
  notifyTechnicianAssigned,
  notifyServiceCompleted,
  notifyProfileUpdated,
  notifyPasswordChanged,
  notifyWelcome,
  notifyQuoteRejected,
  notifyRevisionRequested,
  notifyRequestClosed,
  notifyQuoteRevised,
  notifyBookingCancelled,
  notifyBookingCancelledAdmins,
  notifyCancellationFeePaid,
  notifyCancellationFeeFailed,
};
