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

// Fee step 1 (charge window only): create the Razorpay payment order.
// Returns { payment, alreadyPaid, checkout, fee }. When alreadyPaid (fee was
// collected by an earlier interrupted attempt) skip checkout and pass
// payment.id straight to cancelBooking; otherwise open Razorpay Checkout with
// the `checkout` payload. The booking is NOT cancelled by this call.
export const payCancellationFee = (id) =>
  api.post(`/api/bookings/${id}/cancellation/pay`);

// Fee step 2: verify the Razorpay Checkout result server-side. `payload` is
// the { razorpay_payment_id, razorpay_order_id, razorpay_signature } object
// the checkout handler receives. Returns { payment } — pass payment.id to
// cancelBooking to finalise. The booking is still NOT cancelled by this call.
export const verifyCancellationPayment = (id, payload) =>
  api.post(`/api/bookings/${id}/cancellation/pay/verify`, payload);

// Finalise the cancellation — requires a reason (one of the server's
// predefined reasons, as returned by the preview endpoint), a comment when
// reason is "Other", and a paymentId when the booking is inside the charge window.
export const cancelBooking = (id, { reason, comment, paymentId }) =>
  api.post(`/api/bookings/${id}/cancel`, { reason, comment, paymentId });

// Reschedule booking — change date and/or time
export const rescheduleBooking = (id, data) =>
  api.patch(`/api/bookings/${id}/reschedule`, data);
