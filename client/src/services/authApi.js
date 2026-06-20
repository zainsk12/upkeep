// client/src/services/authApi.js

import api from "./axios";

// ── Signup ────────────────────────────────────────────────────────────────────
// Phone verification is handled client-side via Firebase Phone Auth
// (see services/firebase.js). After the phone is verified, the resulting
// Firebase ID token is passed to register().

/** Create account (requires firebaseIdToken from Firebase phone verification). */
export const signupApi = (data) => api.post("/api/auth/register", data);

// ── Login ─────────────────────────────────────────────────────────────────────

/** Login with phone or email + password.
 *  Pass { credential, password } — backend auto-detects phone vs email. */
export const loginApi = (data) => api.post("/api/auth/login", data);

// ── Profile ───────────────────────────────────────────────────────────────────

export const updateProfileApi = (data) => api.put("/api/auth/profile", data);

// ── Forgot / Reset Password ─────────────────────────────────────────────────────
// Email channel: backend issues + verifies a 6-digit OTP.
// Phone channel: OTP is sent/confirmed via Firebase (client-side), and the
// resulting Firebase ID token is passed to verify-reset-otp instead of an `otp`.

/** Request a reset code. Body: { identifier } → { channel, destination, message } */
export const forgotPasswordApi = (data) => api.post("/api/auth/forgot-password", data);

/** Verify the code → returns { resetToken }.
 *  Email: { identifier, otp }   Phone: { identifier, firebaseIdToken } */
export const verifyResetOtpApi = (data) => api.post("/api/auth/verify-reset-otp", data);

/** Set a new password. Body: { identifier, resetToken, newPassword } */
export const resetPasswordApi = (data) => api.post("/api/auth/reset-password", data);
