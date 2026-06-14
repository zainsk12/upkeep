import api from "./axios";

/** Submit a review for a completed booking (auth required). */
export const submitReview = ({ bookingId, rating, comment }) =>
  api.post("/api/reviews", { bookingId, rating, comment });

/**
 * Fetch homepage-filtered reviews (public).
 * Logic: isFeatured === true OR rating >= threshold
 * @param {number} [limit=6] - Max number of reviews to return
 */
export const fetchHomepageReviews = (limit = 6) =>
  api.get(`/api/reviews/homepage?limit=${limit}`).then((r) => r.data.reviews);

/**
 * Fetch ALL reviews, unfiltered, paginated (public).
 * @param {object} params - { page, limit, sort }
 */
export const fetchAllReviews = ({ page = 1, limit = 12, sort = "newest" } = {}) =>
  api.get(`/api/reviews?page=${page}&limit=${limit}&sort=${sort}`).then((r) => r.data);

/** Fetch latest 3 reviews (legacy — for backward compat). */
export const fetchLatestReviews = () =>
  api.get("/api/reviews/latest").then((r) => r.data.reviews);

/** Fetch bookingIds already reviewed by the logged-in user (auth required). */
export const fetchMyReviewedBookingIds = () =>
  api.get("/api/reviews/my-reviewed-bookings").then((r) => r.data.bookingIds);