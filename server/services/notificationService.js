// server/services/notificationService.js
//
// Central factory for generating notifications from application events.
// Every emit helper is FIRE-AND-FORGET SAFE: createNotification catches its own
// errors and resolves to null (never rejects), so a notification failure can
// never break the triggering flow (booking, auth, etc.) nor surface as an
// unhandledRejection. Callers may `await` it or not.

const Notification = require("../models/Notification");
const { NOTIFICATION_CATALOG } = require("../constants/notifications");
const { emitToUser, NOTIFICATION_EVENTS } = require("./socketService");
const { getPreferencesLean, isCategoryAllowed } = require("./notificationPreferenceService");
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
    try {
      const unreadCount = await Notification.countDocuments({ userId: uid, isRead: false });
      emitToUser(uid, NOTIFICATION_EVENTS.CREATED, { notification: doc.toObject(), unreadCount });
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
};
