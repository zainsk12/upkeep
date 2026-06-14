// server/controllers/reviewController.js

const Review    = require("../models/Review");
const Booking   = require("../models/Booking");
const Settings  = require("../models/Settings"); // MODULE 6: threshold persistence
const { stripHtml } = require("../utils/sanitize");
const isValidId = require("../utils/isValidObjectId");

/* ─────────────────────────────────────────────────────────────
   POST /api/reviews
   Body: { bookingId, rating, comment }
   Auth: required
───────────────────────────────────────────────────────────── */
const createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating || !comment)
      return res.status(400).json({ message: "bookingId, rating, and comment are required." });

    // H3: reject malformed ObjectIds before hitting MongoDB
    if (!isValidId(bookingId))
      return res.status(400).json({ message: "Invalid booking ID." });

    const parsedRating = Number(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5)
      return res.status(400).json({ message: "Rating must be a number between 1 and 5." });

    // H2: strip HTML tags before length check so markup cannot bypass the minimum
    const sanitizedComment = stripHtml(comment);
    if (sanitizedComment.length < 10)
      return res.status(400).json({ message: "Comment must be at least 10 characters." });

    const booking = await Booking.findById(bookingId);
    if (!booking)
      return res.status(404).json({ message: "Booking not found." });
    if (booking.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "You can only review your own bookings." });
    if (booking.status !== "completed")
      return res.status(400).json({ message: "You can only review completed bookings." });

    const existing = await Review.findOne({ bookingId });
    if (existing)
      return res.status(409).json({ message: "You have already reviewed this booking." });

    const review = await Review.create({
      bookingId,
      userId:      req.user._id,
      name:        req.user.name,
      rating:      parsedRating,
      comment:     sanitizedComment,
      serviceType: booking.service,
    });

    res.status(201).json({ message: "Review submitted successfully.", review });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "You have already reviewed this booking." });
    console.error("createReview error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/reviews/homepage
   Public — homepage-filtered reviews.
   Logic: isFeatured === true  OR  rating >= threshold
   Query: limit (default 6, max 12)
───────────────────────────────────────────────────────────── */
const getHomepageReviews = async (req, res) => {
  try {
    const limit     = Math.min(12, Math.max(1, Number(req.query.limit) || 6));
    const threshold = await Settings.getReviewThreshold();

    const reviews = await Review.find({
      $or: [{ isFeatured: true }, { rating: { $gte: threshold } }],
    })
      .sort({ isFeatured: -1, rating: -1, createdAt: -1 })
      .limit(limit)
      .select("name rating comment serviceType createdAt isFeatured")
      .lean();

    res.json({ reviews, threshold });
  } catch (err) {
    console.error("getHomepageReviews error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/reviews
   Public — ALL reviews, paginated.
   Query: page, limit (max 50), sort (newest|oldest|highest|lowest)
───────────────────────────────────────────────────────────── */
const getAllReviewsPublic = async (req, res) => {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const skip  = (page - 1) * limit;

    const SORT_MAP = {
      newest:  { createdAt: -1 },
      oldest:  { createdAt:  1 },
      highest: { rating: -1, createdAt: -1 },
      lowest:  { rating:  1, createdAt: -1 },
    };
    const sortQuery = SORT_MAP[req.query.sort] || SORT_MAP.newest;

    const [reviews, total] = await Promise.all([
      Review.find()
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .select("name rating comment serviceType createdAt")
        .lean(),
      Review.countDocuments(),
    ]);

    res.json({
      reviews,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getAllReviewsPublic error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/reviews/my-reviewed-bookings  (auth required)
───────────────────────────────────────────────────────────── */
const getMyReviewedBookingIds = async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user._id })
      .select("bookingId")
      .lean();
    res.json({ bookingIds: reviews.map((r) => r.bookingId.toString()) });
  } catch (err) {
    console.error("getMyReviewedBookingIds error:", err.message);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

module.exports = {
  createReview,
  getHomepageReviews,
  getAllReviewsPublic,
  getMyReviewedBookingIds,
};