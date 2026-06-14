/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (CSS variable–backed) ──────────────────
        bg:      "var(--bg)",
        card:    "var(--card)",
        text:    "var(--text)",
        muted:   "var(--muted)",
        primary: {
          DEFAULT: "rgb(var(--primary-rgb) / <alpha-value>)",
          hover:   "rgb(var(--primary-hover-rgb) / <alpha-value>)",
          dark:    "rgb(var(--primary-dark-rgb) / <alpha-value>)",
          deeper:  "rgb(var(--primary-deeper-rgb) / <alpha-value>)",
        },
        blush:   "var(--blush)",

        // ── Literal palette (kept for one-off uses) ─────────────────
        burgundy: {
          DEFAULT: "#6B0F2A",
          light:   "#8B1A3A",
          dark:    "#4A0A1D",
          deeper:  "#3D0817",
        },
        cream:    "#F4F1EF",
        charcoal: "#1A1A1A",
      },
      fontFamily: {
        sans:    ["Sora", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        display: ["Playfair Display", "Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};