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
