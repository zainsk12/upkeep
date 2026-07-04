// server/routes/notificationRoutes.js

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { userApiLimiter } = require("../middleware/notificationRateLimits");
const {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
} = require("../controllers/notificationController");

// Rate-limit first (blunts unauthenticated floods too), then require auth.
router.use(userApiLimiter);
// All notification routes require an authenticated user.
router.use(auth);

router.get("/", listNotifications);
router.get("/unread-count", getUnreadCount);

// Notification preferences (Module 6). Static paths — declared before "/:id".
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

// Static path declared before the parameterised one for clarity (they don't
// actually collide — "/read-all" is one segment, "/:id/read" is two).
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

router.delete("/:id", deleteNotification);

module.exports = router;
