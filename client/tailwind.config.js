/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class", // ← theme toggle via <html class="dark">
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (CSS variable–backed) ──────────────────
        bg:      "var(--bg)",
        card:    "var(--card)",
        text:    "var(--text)",
        muted:   "var(--muted)",
        primary: {
          DEFAULT: "var(--primary)",
          hover:   "var(--primary-hover)",
          dark:    "var(--primary-dark)",
        },
        blush:   "var(--blush)",
        border:  "var(--border)",   // ← border-border = adaptive border color
        accent:  "var(--accent)",   // ← text-accent / bg-accent

        // ── Literal palette (kept for one-off uses) ─────────────────
        burgundy: {
          DEFAULT: "#6B0F2A",
          light:   "#8B1A3A",
          dark:    "#4A0A1D",
        },
        cream:    "#F4F1EF",
        charcoal: "#1A1A1A",
      },
      fontFamily: {
        sans:    ["Sora", "Inter", "sans-serif"],
        display: ["Playfair Display", "serif"],
      },
    },
  },
  plugins: [],
};