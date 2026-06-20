// client/src/hooks/usePasswordResetFlow.js
// Single source of truth for the password-reset BUSINESS LOGIC, shared by:
//   • ForgotPasswordPage     (unauthenticated account recovery)
//   • ChangePasswordPage      (authenticated password change)
//
// It owns the Firebase invisible-reCAPTCHA lifecycle and the three backend calls
// (forgot-password → verify-reset-otp → reset-password). It is intentionally
// UI-agnostic: it exposes imperative async operations + the channel/destination/
// resetToken state, and throws on failure. Each page wraps these with its own
// toasts, step transitions, and error display — so there is exactly ONE copy of
// the OTP/Firebase/reset orchestration.

import { useEffect, useRef, useState } from "react";
import {
  forgotPasswordApi,
  verifyResetOtpApi,
  resetPasswordApi,
} from "../services/authApi";
import {
  auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  firebaseAuthErrorMessage,
  getAppCheckToken,
} from "../services/firebase";
import { toE164 } from "../utils/phone";

// ── Error classification ──────────────────────────────────────────────────────
// Distinguish the three error shapes that all lack a useful generic message:
//   1. Axios error WITH a response  → use the server's message.
//   2. Firebase phone-auth error    → string `.code` like "auth/…" (no response).
//   3. True transport failure        → axios network/timeout (no response, no code).
const isFirebaseError = (err) =>
  typeof err?.code === "string" && err.code.startsWith("auth/");
const isNetworkError = (err) =>
  !err?.response &&
  (err?.code === "ERR_NETWORK" ||
    err?.code === "ECONNABORTED" ||
    err?.message === "Network Error");

export function describeAuthError(err) {
  if (err?.response) {
    return err.response.data?.message || "Something went wrong. Please try again.";
  }
  if (isFirebaseError(err)) {
    return firebaseAuthErrorMessage(err);
  }
  if (isNetworkError(err)) {
    return "Cannot reach the server. Check your connection and try again.";
  }
  return err?.message || firebaseAuthErrorMessage(err);
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function usePasswordResetFlow({
  recaptchaContainerId,
  initialChannel = null,
  initialDestination = "",
} = {}) {
  const [channel, setChannel]         = useState(initialChannel);     // "email" | "phone"
  const [destination, setDestination] = useState(initialDestination); // masked dest from server
  const [resetToken, setResetToken]   = useState("");

  // Firebase phone-auth refs.
  const recaptchaVerifierRef  = useRef(null);
  const recaptchaContainerRef = useRef(null); // bind to the page's reCAPTCHA <div>
  const confirmationRef       = useRef(null); // confirmationResult from signInWithPhoneNumber

  const getRecaptchaVerifier = () => {
    if (!recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(
          auth,
          recaptchaContainerRef.current || recaptchaContainerId,
          { size: "invisible" }
        );
      } catch (err) {
        console.error("[PasswordReset] RecaptchaVerifier init failed:", err?.code, err?.message, err);
        throw err;
      }
    }
    return recaptchaVerifierRef.current;
  };

  const resetRecaptcha = () => {
    try { recaptchaVerifierRef.current?.clear(); } catch { /* noop */ }
    recaptchaVerifierRef.current = null;
    if (recaptchaContainerRef.current) recaptchaContainerRef.current.innerHTML = "";
  };

  // Tear down the verifier on unmount to avoid leaking the reCAPTCHA widget.
  useEffect(() => () => resetRecaptcha(), []);

  const sendFirebaseOtp = async (identifier) => {
    const phoneE164 = toE164(identifier);
    console.debug("[PasswordReset] sending Firebase SMS OTP to", phoneE164);
    try {
      const verifier = getRecaptchaVerifier();
      confirmationRef.current = await signInWithPhoneNumber(auth, phoneE164, verifier);
      console.debug("[PasswordReset] signInWithPhoneNumber resolved — confirmation ready");
    } catch (err) {
      console.error("[PasswordReset] signInWithPhoneNumber failed:", err?.code, err?.message, err);
      throw err;
    }
  };

  /**
   * Request a verification code. Backend picks the channel from the identifier
   * format; for the phone channel the SMS is sent by Firebase here. Returns
   * { channel, destination } and updates state. Throws on failure.
   */
  const requestCode = async (identifier) => {
    const { data } = await forgotPasswordApi({ identifier });
    setChannel(data.channel);
    setDestination(data.destination || "");
    if (data.channel === "phone") await sendFirebaseOtp(identifier);
    return { channel: data.channel, destination: data.destination || "" };
  };

  /** Re-send the code for the active channel. Throws on failure. */
  const resendCode = async (identifier, currentChannel = channel) => {
    if (currentChannel === "phone") {
      resetRecaptcha();
      await sendFirebaseOtp(identifier);
    } else {
      await forgotPasswordApi({ identifier });
    }
  };

  /**
   * Verify the 6-digit code. Phone → confirm via Firebase + verify the resulting
   * ID token server-side; Email → verify the OTP server-side. Returns (and
   * stores) the short-lived reset token. Throws on failure.
   */
  const verifyCode = async ({ identifier, code, currentChannel = channel }) => {
    let payload;
    if (currentChannel === "phone") {
      if (!confirmationRef.current) throw new Error("Please request a new code.");
      const credential = await confirmationRef.current.confirm(code);
      const firebaseIdToken = await credential.user.getIdToken();
      // Optional anti-automation hardening — server enforces only when configured.
      const appCheckToken = await getAppCheckToken();
      payload = {
        identifier,
        firebaseIdToken,
        ...(appCheckToken ? { appCheckToken } : {}),
      };
    } else {
      payload = { identifier, otp: code };
    }
    const { data } = await verifyResetOtpApi(payload);
    setResetToken(data.resetToken);
    return data.resetToken;
  };

  /** Set the new password using the issued reset token. Throws on failure. */
  const submitNewPassword = async ({ identifier, newPassword, token }) => {
    await resetPasswordApi({ identifier, resetToken: token ?? resetToken, newPassword });
  };

  /** Tear down all transient flow state (used when restarting the wizard). */
  const reset = () => {
    setChannel(null);
    setDestination("");
    setResetToken("");
    confirmationRef.current = null;
    resetRecaptcha();
  };

  return {
    recaptchaContainerRef,
    channel, setChannel,
    destination, setDestination,
    resetToken, setResetToken,
    requestCode, resendCode, verifyCode, submitNewPassword,
    resetRecaptcha, reset,
  };
}
