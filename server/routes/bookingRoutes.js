// server/routes/bookingRoutes.js

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
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
} = require("../controllers/bookingController");

router.post("/", auth, createBooking);
router.get("/my", auth, getMyBookings);

// Accept quotation → confirm booking (reCAPTCHA v3 protected, no OTP)
router.post("/:id/confirm", auth, confirmBooking);

// Reject quotation (requires { reason, comment? } — see REJECTION_REASONS)
router.post("/:id/reject", auth, rejectBooking);

// After rejection: request a revised quotation from the team
router.post("/:id/request-revision", auth, requestQuoteRevision);

// After rejection: close the request permanently (terminal)
router.post("/:id/close", auth, closeBookingRequest);

// Service cancellation workflow (state + time-window driven)
router.get("/:id/cancellation/preview", auth, getCancellationPreview);
router.post("/:id/cancellation/pay", auth, payCancellationFee);
router.post("/:id/cancel", auth, cancelBooking);

// Reschedule booking (change date / time)
router.patch("/:id/reschedule", auth, rescheduleBooking);

module.exports = router;
