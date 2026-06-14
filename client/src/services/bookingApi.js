import api from "./axios";

export const createBooking = (data) =>
  api.post("/api/bookings", data);

export const getMyBookings = () =>
  api.get("/api/bookings/my");

// Send OTP for quotation confirmation
export const sendConfirmationOTP = (id) =>
  api.post(`/api/bookings/${id}/send-confirmation-otp`);

// Verify OTP and confirm booking
export const verifyConfirmationOTP = (id, otp) =>
  api.post(`/api/bookings/${id}/verify-confirmation-otp`, { otp });

// Reject quotation
export const rejectBooking = (id) =>
  api.post(`/api/bookings/${id}/reject`);

// Reschedule booking — change date and/or time
export const rescheduleBooking = (id, data) =>
  api.patch(`/api/bookings/${id}/reschedule`, data);