// server/routes/bookingRoutes.js

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
  createBooking,
  getMyBookings,
  confirmBooking,
  rejectBooking,
  rescheduleBooking,
} = require("../controllers/bookingController");

router.post("/", auth, createBooking);
router.get("/my", auth, getMyBookings);

// Accept quotation → confirm booking (reCAPTCHA v3 protected, no OTP)
router.post("/:id/confirm", auth, confirmBooking);

// Reject quotation
router.post("/:id/reject", auth, rejectBooking);

// Reschedule booking (change date / time)
router.patch("/:id/reschedule", auth, rescheduleBooking);

module.exports = router;
