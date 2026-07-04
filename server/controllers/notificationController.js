// server/controllers/notificationController.js
//
// Read/manage the authenticated user's own notifications. Every query is scoped
// to req.user._id, so a user can never read or mutate another user's data.

const Notification = require("../models/Notification");
const isValidId = require("../utils/isValidObjectId");
const { NOTIFICATION_CATEGORIES } = require("../constants/notifications");
const { emitToUser, NOTIFICATION_EVENTS } = require("../services/socketService");
const { parsePagination, parseSort } = require("../utils/queryOptions");
const { pagination: pageCfg } = require("../config/notifications");
const {
  getOrCreatePreferences,
  applyUpdate,
} = require("../services/notificationPreferenceService");

const SORT_MAP = { newest: { createdAt: -1 }, oldest: { createdAt: 1 } };

// ── GET /api/notifications ──────────────────────────────────────────────────────
// Query: page, limit, unread=true, category=<cat>, sort=newest|oldest
const listNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const { page, limit, skip } = parsePagination(req.query, pageCfg.userDefaultLimit, pageCfg.maxLimit);

    const filter = { userId };
    if (req.query.unread === "true") filter.isRead = false;
    if (req.query.category && NOTIFICATION_CATEGORIES.includes(req.query.category)) {
      filter.category = req.query.category;
    }

    const sort = parseSort(req.query.sort, SORT_MAP, "newest");

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (err) {
    console.error("listNotifications error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── GET /api/notifications/unread-count ──────────────────────────────────────────
const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });
    res.json({ unreadCount });
  } catch (err) {
    console.error("getUnreadCount error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────────
const markRead = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid notification ID." });

    // Ownership is enforced in the filter — a mismatched userId yields no match.
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification)
      return res.status(404).json({ message: "Notification not found." });

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    // Sync every other session of this user in real time.
    emitToUser(req.user._id, NOTIFICATION_EVENTS.READ, { id: String(notification._id), unreadCount });

    res.json({ message: "Marked as read.", notification, unreadCount });
  } catch (err) {
    console.error("markRead error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── PATCH /api/notifications/read-all ────────────────────────────────────────────
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    emitToUser(req.user._id, NOTIFICATION_EVENTS.READ_ALL, { unreadCount: 0 });

    res.json({ message: "All notifications marked as read.", unreadCount: 0 });
  } catch (err) {
    console.error("markAllRead error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── DELETE /api/notifications/:id ────────────────────────────────────────────────
const deleteNotification = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ message: "Invalid notification ID." });

    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!deleted)
      return res.status(404).json({ message: "Notification not found." });

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    emitToUser(req.user._id, NOTIFICATION_EVENTS.DELETED, { id: String(req.params.id), unreadCount });

    res.json({ message: "Notification deleted.", unreadCount });
  } catch (err) {
    console.error("deleteNotification error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── GET /api/notifications/preferences ───────────────────────────────────────────
// The authenticated user's notification preferences (created lazily on first read).
const getPreferences = async (req, res) => {
  try {
    const prefs = await getOrCreatePreferences(req.user._id);
    res.json({ preferences: prefs });
  } catch (err) {
    console.error("getPreferences error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ── PUT /api/notifications/preferences ───────────────────────────────────────────
// Partial update — only known keys in the body are applied (unknown keys ignored).
const updatePreferences = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object")
      return res.status(400).json({ message: "Invalid preferences payload." });

    const prefs = await getOrCreatePreferences(req.user._id);
    applyUpdate(prefs, req.body);
    await prefs.save();

    res.json({ message: "Preferences updated.", preferences: prefs });
  } catch (err) {
    console.error("updatePreferences error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
};
