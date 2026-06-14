// server/routes/bookingRoutes.js

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
  createBooking,
  getMyBookings,
  sendConfirmationOTP,
  verifyConfirmationOTP,
  rejectBooking,
  rescheduleBooking,
} = require("../controllers/bookingController");

router.post("/", auth, createBooking);
router.get("/my", auth, getMyBookings);

// OTP quotation confirmation flow
router.post(
  "/:id/send-confirmation-otp",
  auth,
  sendConfirmationOTP
);

router.post(
  "/:id/verify-confirmation-otp",
  auth,
  verifyConfirmationOTP
);

// Reject quotation
router.post("/:id/reject", auth, rejectBooking);

// Reschedule booking (change date / time)
router.patch("/:id/reschedule", auth, rescheduleBooking);

module.exports = router;