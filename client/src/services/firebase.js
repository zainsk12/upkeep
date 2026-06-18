// client/src/services/firebase.js
// Firebase web SDK initialization for Phone Authentication (signup only).
//
// Config comes from VITE_FIREBASE_* env vars (see client/.env.example).
// These values are public by design (Firebase security is enforced server-side
// via Authorized domains + the Admin SDK token check), but keep them in .env so
// they differ per environment.

import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import env from "../utils/env";

const app = initializeApp(env.firebase);

export const auth = getAuth(app);
auth.useDeviceLanguage();

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
