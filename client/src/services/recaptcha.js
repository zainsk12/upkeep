// client/src/services/recaptcha.js
// Google reCAPTCHA v3 (invisible) — used to protect booking confirmation.
//
// The v3 script is loaded lazily on first use (so it isn't fetched for users who
// never confirm a booking). VITE_RECAPTCHA_SITE_KEY is the public site key.

import env from "../utils/env";

const SITE_KEY = env.recaptchaSiteKey;

let loadPromise = null;

function loadScript() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!SITE_KEY) {
      reject(new Error("VITE_RECAPTCHA_SITE_KEY is not configured."));
      return;
    }
    if (window.grecaptcha && window.grecaptcha.execute) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src   = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA."));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Execute reCAPTCHA v3 and return a token for the given action.
 * @param {string} action - e.g. "confirm_booking"
 * @returns {Promise<string>}
 */
export async function executeRecaptcha(action) {
  await loadScript();
  await new Promise((resolve) => window.grecaptcha.ready(resolve));
  return window.grecaptcha.execute(SITE_KEY, { action });
}
