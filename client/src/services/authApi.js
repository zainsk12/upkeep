// client/src/services/authApi.js

import api from "./axios";

// ── Signup flow ───────────────────────────────────────────────────────────────

/** Step 1 — Request OTP for phone number (signup only) */
export const sendOtpApi      = (data) => api.post("/api/auth/send-otp",    data);

/** Step 2 — Verify OTP, receive signupToken */
export const verifyOtpApi    = (data) => api.post("/api/auth/verify-otp",  data);

/** Step 3 — Create account (requires signupToken from verifyOtpApi) */
export const signupApi       = (data) => api.post("/api/auth/register",    data);

// ── Login ─────────────────────────────────────────────────────────────────────

/** Login with phone or email + password.
 *  Pass { credential, password } — backend auto-detects phone vs email. */
export const loginApi        = (data) => api.post("/api/auth/login",       data);

// ── Profile ───────────────────────────────────────────────────────────────────

export const updateProfileApi = (data) => api.put("/api/auth/profile",     data);
