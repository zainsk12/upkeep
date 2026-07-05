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

// ── Service cancellation workflow ──────────────────────────────────────────
// Server-authoritative context: whether cancellation is allowed, the active
// time window (free / early_warning / late_warning / fee_required) and fee.
export const getCancellationPreview = (id) =>
  api.get(`/api/bookings/${id}/cancellation/preview`);

// Collect the cancellation fee (charge window only). Returns { payment }.
// The booking is NOT cancelled by this call — pass payment.id to cancelBooking.
export const payCancellationFee = (id) =>
  api.post(`/api/bookings/${id}/cancellation/pay`);

// Finalise the cancellation — requires a reason (one of the server's
// predefined reasons, as returned by the preview endpoint), a comment when
// reason is "Other", and a paymentId when the booking is inside the charge window.
export const cancelBooking = (id, { reason, comment, paymentId }) =>
  api.post(`/api/bookings/${id}/cancel`, { reason, comment, paymentId });

// Reschedule booking — change date and/or time
export const rescheduleBooking = (id, data) =>
  api.patch(`/api/bookings/${id}/reschedule`, data);
