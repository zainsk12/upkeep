const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: [true, "Booking ID is required."],
      unique: true, // one review per booking — enforced at DB level
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required."],
    },
    name: {
      type: String,
      required: [true, "Reviewer name is required."],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required."],
      min: [1, "Rating must be at least 1."],
      max: [5, "Rating cannot exceed 5."],
    },
    comment: {
      type: String,
      required: [true, "Comment is required."],
      trim: true,
      minlength: [10, "Comment must be at least 10 characters."],
      maxlength: [1000, "Comment cannot exceed 1000 characters."],
    },
    serviceType: {
      type: String,
      required: [true, "Service type is required."],
      trim: true,
    },
    // ── MODULE 6: Admin-controlled visibility ──────────────────────────────────
    // Admin can manually feature a review regardless of its rating.
    // A review shows on the homepage if: isFeatured === true OR rating >= threshold.
    isFeatured: {
      type: Boolean,
      default: false,
      index: true, // fast queries on homepage filter
    },
  },
  { timestamps: true }
);

// Compound index: homepage query filters by isFeatured OR rating, sorted by newest
reviewSchema.index({ isFeatured: 1, rating: 1, createdAt: -1 });
// Fast "latest 3" queries on the home page
reviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);