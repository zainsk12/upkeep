// server/routes/reviewRoutes.js

const express = require("express");
const {
  createReview,
  getHomepageReviews,
  getAllReviewsPublic,
  getMyReviewedBookingIds,
  getReviewStats,
} = require("../controllers/reviewController");
const protect = require("../middleware/auth");

const router = express.Router();

// ── Public routes ──────────────────────────────────────────────────────────────
// NOTE: named routes MUST come before the bare GET "/" to avoid param conflicts.

// Aggregate stats — average rating + total count (public)
router.get("/stats",                 getReviewStats);

// MODULE 6: Homepage-filtered reviews (isFeatured OR rating >= threshold)
router.get("/homepage",              getHomepageReviews);

// Legacy: 3 most recent — delegates to getAllReviewsPublic for consistency
router.get("/latest", (req, res, next) => {
  req.query.limit = req.query.limit || "3";
  req.query.sort  = req.query.sort  || "newest";
  return getAllReviewsPublic(req, res, next);
});

// MODULE 6: All reviews, paginated (for "View All Reviews" page)
router.get("/",                      getAllReviewsPublic);

// ── Protected routes ───────────────────────────────────────────────────────────
router.get("/my-reviewed-bookings",  protect, getMyReviewedBookingIds);
router.post("/",                     protect, createReview);

module.exports = router;