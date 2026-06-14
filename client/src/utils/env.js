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
const REQUIRED_VARS = [];

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

// ─── Exported config ─────────────────────────────────────────────────────────
// Consumers import this object instead of calling import.meta.env directly.
const env = {
  /** Vite build mode — "development" | "production" | "test" */
  mode:   import.meta.env.MODE,
  /** True when running under the Vite dev server */
  isDev:  import.meta.env.DEV  === true,
  /** True in a production build */
  isProd: import.meta.env.PROD === true,

  // ── Add future variables here as they are introduced ──────────────────────
  // Example:
  //   apiUrl: import.meta.env.VITE_API_URL,
};

export default env;