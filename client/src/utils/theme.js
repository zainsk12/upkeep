// client/src/utils/theme.js
// ─── Theme utility — light / dark mode ────────────────────────────────────
// Applies a "dark" class to <html> and persists the choice in localStorage.
// Usage:
//   initializeTheme()         — call once in App.jsx on mount
//   setTheme("dark"|"light")  — toggle from any component
//   getTheme()                — read current stored theme

const STORAGE_KEY = "theme";

/**
 * Read the saved theme from localStorage.
 * Falls back to "light" if nothing is stored.
 */
export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || "light";
}

/**
 * Apply a theme by toggling the "dark" class on <html>
 * and persisting the choice to localStorage.
 * @param {"light"|"dark"} theme
 */
export function setTheme(theme) {
  const root = document.documentElement; // <html>
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Read the stored theme and apply it immediately.
 * Call this once on app startup to avoid a flash of wrong theme.
 */
export function initializeTheme() {
  setTheme(getTheme());
}