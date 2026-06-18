/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class", // ← theme toggle via <html class="dark">
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (CSS variable–backed) ──────────────────
        // Values live in index.css :root / .dark — only names exposed here
        bg:      "var(--bg)",
        card:    "var(--card)",
        text:    "var(--text)",
        muted:   "var(--muted)",
        border:  "var(--border)",   // border-border = adaptive border color

        primary: {
          DEFAULT: "var(--primary)",
          hover:   "var(--primary-hover)",
          dark:    "var(--primary-dark)",
        },

        // Graphite Slate — new secondary tier (replaces maroon's structural role)
        secondary: {
          DEFAULT: "var(--secondary)",
          hover:   "var(--secondary-hover)",
        },

        // Workshop Copper accent — decorative, text-safe, and hover sub-tokens
        accent: {
          DEFAULT: "var(--accent)",         // bg-accent / text-accent → decorative copper
          hover:   "var(--accent-hover)",   // hover state for accent elements
          text:    "var(--accent-text)",    // text-safe shade (white label ≥4.5:1)
        },

        // "Sand" tint — kept on 'blush' name for JSX backward compatibility
        // (Navbar, auth screens, forms use bg-blush, border-blush/*, shadow-blush/*)
        blush:   "var(--blush)",

        // ── Literal palette — Harbor Navy scale ─────────────────────
        navy: {
          900: "#031927",
          800: "#08354A",   // exact logo-badge navy / navbar bg
          700: "#0A3A4E",
          600: "#0E4A63",
          500: "#15607F",
          300: "#6FA8BD",
          100: "#D8E8ED",
        },

        // ── Literal palette — Workshop Copper scale ──────────────────
        copper: {
          700: "#9C5418",   // text-safe (white label ≥5.7:1)
          600: "#C16A21",   // decorative — white label fails AA (3.9:1 only)
          500: "#D88A3E",
          300: "#E8A968",
          100: "#FBE7D3",   // "Sand" tint
        },

        // ── Literals retained for existing JSX usages ────────────────
        // charcoal: LoginPage.jsx uses lg:bg-charcoal for the auth split-screen
        charcoal: "#1A1A1A",
        // cream: legacy warm-cream; kept to avoid breakage (may be used in JSX)
        cream:    "#F4F1EF",
        // burgundy is RETIRED — removed from literal palette per COLOR_SYSTEM.md §8.
        // Any remaining bg-burgundy/text-burgundy in JSX is a defect; do not add back.
      },
      fontFamily: {
        sans:    ["Sora", "Inter", "sans-serif"],
        // display kept: ErrorBoundary.jsx (client) + admin Sidebar.jsx use font-display
        display: ["Playfair Display", "serif"],
      },
    },
  },
  plugins: [],
};