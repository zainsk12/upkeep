// server/services/recaptchaService.js
// Google reCAPTCHA v3 (invisible) server-side verification.
//
// The client runs grecaptcha.execute(siteKey, { action }) and sends the token.
// We POST it to Google's siteverify endpoint and enforce:
//   • success === true
//   • action matches the expected action (defends against token reuse elsewhere)
//   • score >= RECAPTCHA_MIN_SCORE (default 0.5)
//
// Required env vars:
//   RECAPTCHA_SECRET_KEY
//   RECAPTCHA_MIN_SCORE   (optional, default 0.5)

"use strict";

const axios = require("axios");

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/**
 * Verify a reCAPTCHA v3 token.
 * @param {string} token       - token from grecaptcha.execute()
 * @param {string} expectedAction - the action name the client used
 * @param {string} [remoteIp]   - end-user IP (optional)
 * @returns {Promise<{ success: boolean, score?: number, reason?: string }>}
 */
async function verifyRecaptcha(token, expectedAction, remoteIp) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    throw new Error("[RECAPTCHA CONFIG ERROR] RECAPTCHA_SECRET_KEY is not set in .env");
  }
  if (!token) {
    return { success: false, reason: "Missing reCAPTCHA token." };
  }

  const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || "0.5");

  const params = new URLSearchParams({ secret, response: token });
  if (remoteIp) params.append("remoteip", remoteIp);

  let data;
  try {
    const res = await axios.post(VERIFY_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000,
    });
    data = res.data;
  } catch (err) {
    console.error("reCAPTCHA network error:", err.message);
    return { success: false, reason: "Could not reach reCAPTCHA service." };
  }

  if (!data.success) {
    return { success: false, reason: "reCAPTCHA verification failed." };
  }
  if (expectedAction && data.action !== expectedAction) {
    return { success: false, reason: "reCAPTCHA action mismatch." };
  }
  if (typeof data.score === "number" && data.score < minScore) {
    return { success: false, score: data.score, reason: "Suspicious activity detected. Please try again." };
  }

  return { success: true, score: data.score };
}

module.exports = { verifyRecaptcha };
