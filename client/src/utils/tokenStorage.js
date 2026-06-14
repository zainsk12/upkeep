// client/src/utils/tokenStorage.js
//
// Centralised token storage utility.
//
// WHY sessionStorage OVER localStorage:
//   localStorage persists indefinitely across browser restarts, meaning a token
//   left on a shared/public computer is exposed until it naturally expires.
//   sessionStorage is scoped to the browser tab and is automatically cleared
//   when the tab or window is closed, significantly reducing the window of
//   exposure for a stolen token without any change to the auth flow.
//
// All token reads and writes in the app go through this module so the
// backing store can be changed in one place if requirements evolve.

const KEY = "token";

/** Read the current token. Returns null when absent. */
export function getToken() {
  return sessionStorage.getItem(KEY);
}

/** Persist a new token. */
export function setToken(value) {
  sessionStorage.setItem(KEY, value);
}

/** Remove the token (logout / 401 cleanup). */
export function clearToken() {
  sessionStorage.removeItem(KEY);
  // Also wipe any legacy localStorage token that may be present from a
  // previous version of the app so old tokens do not linger on the device.
  try { localStorage.removeItem(KEY); } catch { /* sandboxed env — ignore */ }
}