import api from "./axios";

export const createBooking = (data) =>
  api.post("/api/bookings", data);

export const getMyBookings = () =>
  api.get("/api/bookings/my");

// Accept quotation → confirm booking. Requires a reCAPTCHA v3 token
// (action: "confirm_booking"), verified server-side before confirming.
export const confirmBooking = (id, recaptchaToken) =>
  api.post(`/api/bookings/${id}/confirm`, { recaptchaToken });

// Reject quotation
export const rejectBooking = (id) =>
  api.post(`/api/bookings/${id}/reject`);

// Reschedule booking — change date and/or time
export const rescheduleBooking = (id, data) =>
  api.patch(`/api/bookings/${id}/reschedule`, data);
