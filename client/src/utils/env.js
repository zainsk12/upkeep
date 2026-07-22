// client/src/utils/env.js
//
// Single source of truth for all Vite environment variables.
//
// REQUIRED_VARS — any variable listed here will cause a hard error at
// startup if it is absent or empty.  Add to this list as the app grows.
//
// OPTIONAL_VARS — variables that have safe defaults; listed here purely
// for documentation and discoverability.
//
// All access to import.meta.env in the app should go through this module
// so that missing/misspelled variables surface immediately rather than
// silently producing `undefined` deep inside a component.

// ─── Required ────────────────────────────────────────────────────────────────
// No required variables at this time.
// The client uses relative API paths (/api/*) routed via Vite's dev proxy
// (see vite.config.js) and a reverse-proxy in production — no VITE_API_URL
// is needed.  Add entries here as new required vars are introduced:
//
//   "VITE_EXAMPLE_KEY",
//
const REQUIRED_VARS = [
  // Firebase Phone Authentication (signup)
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
  // Google reCAPTCHA v3 (booking confirmation)
  "VITE_RECAPTCHA_SITE_KEY",
];

// ─── Startup validation ───────────────────────────────────────────────────────
// Runs once at module evaluation time (before the React tree mounts) so a
// misconfigured deployment is caught immediately, not during a user action.
const missing = REQUIRED_VARS.filter(
  (key) => !import.meta.env[key] || String(import.meta.env[key]).trim() === ""
);

if (missing.length > 0) {
  throw new Error(
    `[env] Missing required environment variable(s): ${missing.join(", ")}\n` +
    `Copy client/.env.example → client/.env and supply the missing values.`
  );
}

// ─── API base URL resolution ──────────────────────────────────────────────────
// Priority:
//   1. VITE_API_URL — set per-environment (Vercel dashboard / .env).
//   2. Production build with no VITE_API_URL → fall back to the deployed Railway
//      backend so the app still works even if the env var was never injected at
//      build time (this was the cause of the relative-path 404s on /api/*).
//   3. Development → "" → relative /api/* paths via the Vite proxy (vite.config.js).
// Any trailing slash or accidental "/api" suffix is stripped so requests resolve
// to exactly `<origin>/api/...` (guards against trailing-slash / double-/api bugs).
const PROD_API_FALLBACK = "https://upkeep-0hq4.onrender.com";

function resolveApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_URL || "").trim();
  const base = raw || (import.meta.env.PROD ? PROD_API_FALLBACK : "");
  return base.replace(/\/+$/, "").replace(/\/api$/i, "");
}

// ─── Exported config ─────────────────────────────────────────────────────────
// Consumers import this object instead of calling import.meta.env directly.
const env = {
  /** Vite build mode — "development" | "production" | "test" */
  mode:   import.meta.env.MODE,
  /** True when running under the Vite dev server */
  isDev:  import.meta.env.DEV  === true,
  /** True in a production build */
  isProd: import.meta.env.PROD === true,

  // ── API base URL ──────────────────────────────────────────────────────────
  // See resolveApiBaseUrl() above. Empty in dev (relative paths via proxy);
  // VITE_API_URL or the Railway fallback in production.
  apiBaseUrl: resolveApiBaseUrl(),

  // ── Firebase (Phone Authentication) ───────────────────────────────────────
  firebase: {
    apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId:      import.meta.env.VITE_FIREBASE_APP_ID,
    // Present in .env and the Console SDK snippet — pass them through so the web
    // app config matches Firebase exactly (incomplete configs are a known source
    // of subtle SDK init issues). Optional for phone auth; safe to be undefined.
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    // OPTIONAL — Firebase App Check (reCAPTCHA v3 site key registered for App
    // Check). When set, App Check is initialized and a token is attached to the
    // phone password-reset verification. Absent → App Check is skipped (the flow
    // still works; server-side enforcement is likewise opt-in).
    appCheckKey: import.meta.env.VITE_FIREBASE_APP_CHECK_KEY || "",
  },

  // ── Google reCAPTCHA v3 (booking confirmation) ────────────────────────────
  recaptchaSiteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,

  // ── Razorpay Checkout (cancellation fee — Test Mode) ──────────────────────
  // Publishable key id only (rzp_test_…) — NOT a secret; the key secret lives
  // exclusively on the server. OPTIONAL because the pay endpoint returns the
  // key id alongside the order; this env value is the client-side fallback.
  razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID || "",
};

export default env;