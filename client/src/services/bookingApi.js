import api from "./axios";

export const createBooking = (data) =>
  api.post("/api/bookings", data);

export const getMyBookings = () =>
  api.get("/api/bookings/my");

// Accept quotation → confirm booking. Requires a reCAPTCHA v3 token
// (action: "confirm_booking"), verified server-side before confirming.
export const confirmBooking = (id, recaptchaToken) =>
  api.post(`/api/bookings/${id}/confirm`, { recaptchaToken });

// Reject quotation — requires a reason (one of the predefined REJECTION_REASONS)
// and a free-text comment (mandatory when reason is "Other").
export const rejectBooking = (id, { reason, comment }) =>
  api.post(`/api/bookings/${id}/reject`, { reason, comment });

// After rejection: ask the team for a revised quotation
export const requestQuoteRevision = (id) =>
  api.post(`/api/bookings/${id}/request-revision`);

// After rejection: permanently close the request (no further quotations)
export const closeBookingRequest = (id) =>
  api.post(`/api/bookings/${id}/close`);

// Reschedule booking — change date and/or time
export const rescheduleBooking = (id, data) =>
  api.patch(`/api/bookings/${id}/reschedule`, data);
