// server/routes/adminNotificationRoutes.js
//
// Admin Notification Management routes (Module 4). Mounted at
// /api/admin/notifications from adminRoutes.js, which already applies
// `auth + requireAdmin`, so every route here is admin-only.

const express = require("express");
const router = express.Router();
const {
  adminCreateLimiter,
  adminResendLimiter,
  adminDeleteLimiter,
} = require("../middleware/notificationRateLimits");
const {
  createCampaign,
  listCampaigns,
  getAnalytics,
  listUsers,
  audienceCount,
  getCampaign,
  cancelCampaign,
  resendCampaign,
  deleteCampaign,
} = require("../controllers/adminNotificationController");

// Static routes MUST be declared before the dynamic "/:id" route.
router.get("/analytics", getAnalytics);
router.get("/users", listUsers);
router.post("/audience-count", audienceCount);

router.get("/", listCampaigns);
router.post("/", adminCreateLimiter, createCampaign);

router.get("/:id", getCampaign);
router.post("/:id/resend", adminResendLimiter, resendCampaign);
router.patch("/:id/cancel", cancelCampaign);
router.delete("/:id", adminDeleteLimiter, deleteCampaign);

module.exports = router;
