// client/src/services/firebase.js
// Firebase web SDK initialization for Phone Authentication (signup only).
//
// Config comes from VITE_FIREBASE_* env vars (see client/.env.example).
// These values are public by design (Firebase security is enforced server-side
// via Authorized domains + the Admin SDK token check), but keep them in .env so
// they differ per environment.

import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "firebase/app-check";
import env from "../utils/env";

const app = initializeApp(env.firebase);

export const auth = getAuth(app);
auth.useDeviceLanguage();

// ── Firebase App Check (optional, anti-automation) ────────────────────────────
// Initialized only when VITE_FIREBASE_APP_CHECK_KEY is configured, so deployments
// without App Check set up are unaffected. Wrapped in try/catch so a misconfigured
// key can never break app startup.
let appCheck = null;
if (env.firebase.appCheckKey) {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(env.firebase.appCheckKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    // Never let App Check init break the app — log and continue without it.
    console.error("[App Check] init failed:", err?.message || err);
    appCheck = null;
  }
}

/**
 * Best-effort App Check token for hardened endpoints. Returns null when App Check
 * isn't configured or token retrieval fails — callers must treat it as optional.
 */
export async function getAppCheckToken() {
  if (!appCheck) return null;
  try {
    const { token } = await getToken(appCheck, /* forceRefresh */ false);
    return token || null;
  } catch (err) {
    console.error("[App Check] token fetch failed:", err?.message || err);
    return null;
  }
}

export { RecaptchaVerifier, signInWithPhoneNumber };

/** Maps Firebase auth error codes to user-friendly messages. */
export function firebaseAuthErrorMessage(err) {
  switch (err?.code) {
    case "auth/invalid-phone-number":     return "Invalid phone number.";
    case "auth/missing-phone-number":     return "Phone number is required.";
    case "auth/too-many-requests":        return "Too many attempts. Please try again later.";
    case "auth/quota-exceeded":           return "SMS limit reached. Please try again later.";
    case "auth/invalid-verification-code":return "Incorrect OTP. Please try again.";
    case "auth/code-expired":             return "OTP expired. Please request a new one.";
    case "auth/invalid-app-credential":   return "Verification setup failed. Please reload and try again.";
    default:                              return err?.message || "Phone verification failed. Please try again.";
  }
}
