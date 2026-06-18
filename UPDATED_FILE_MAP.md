# UPDATED_FILE_MAP.md — UpKeep by Austrum Rebrand

Lists every file touched by implementation modules, its status, purpose, and which module modified it. Reverse-chronological by module.

---

## Module 6E — Hero Redesign

| File path | Status | Purpose | Module modified in |
|---|---|---|---|
| `client/src/pages/LandingPage.jsx` | Modified | Full hero section replacement: directional navy-charcoal overlay; brand lockup (logo + wordmark + glass "by Austrum" badge); plain eyebrow line (hidden xs); new headline "The trusted way to keep your home running."; new subcopy; micro-trust row (ShieldCheck / BadgeCheck / ThumbsUp); CTA cluster — "Book a Service" (Sand fill primary) + "View Services" (ghost sm+, text-link xs); stat strip — featured copper Rating cell + 3 supporting stats in horizontal glass strip (sm+) and swipeable snap carousel (xs); SVG wave divider. Staggered `animate-in` with 5 delay steps (0→430ms). Legacy `STATS` array removed. | 6E (also 4B/4C/4D/6C for prior changes) |
| `client/src/index.css` | Modified | `.animate-in` fill-mode updated `forwards` → `both` (prevents flash-of-content during stagger delay). `@media (prefers-reduced-motion: reduce)` rule added to disable animation for accessibility. | 6E (also 6B for token rewrite) |
| `CHANGELOG_MODULE_6E.md` | Added (new) | Full change log for Module 6E — per-file diff narrative, constraint verification table, responsive behavior summary. | 6E |

---

## Module 6C — Global Component Refresh

| File path | Status | Purpose | Module modified in |
|---|---|---|---|
| `client/src/App.jsx` | Modified | Sonner toast inline style: border `rgba(232,164,175,0.20)` → `rgba(255,255,255,0.12)` glass; text `#f5e8eb` → `#e8f2f6`; box-shadow → navy rgba | 6C |
| `client/src/components/Navbar.jsx` | Modified | Nav shadow → navy `rgba(8,53,74,0.45)`; avatar dropdown shadow → navy; logo lockup → two-line "UpKeep / by Austrum"; nav item `gap-0.5` → `gap-1`; active state `bg-white/15` → `bg-white/[0.18]`; logo border refined | 6C |
| `client/src/pages/LandingPage.jsx` | Modified | Hero overlay → dark-navy gradient (burgundy eliminated); CTA section outer shadow → navy; CTA radial gradients → navy + sand; **CF-01 footer logo `src="/logo.jpg"` → `src="/upkeep_logo.png"` (critical bug fix)**; ghost button `hover:border-blush/50` → `hover:border-primary/25 hover:text-primary` (×3); service card hover shadow/border → navy; footer full redesign: two-line brand lockup, copper accent icons, improved Quick Links/Contact column headers, split copyright bar | 6C (also 4B/4C/4D for prior content) |
| `client/src/pages/ServicesPage.jsx` | Modified | Booking modal shadow → navy rgba; service card `hover:shadow-black/20` → `hover:shadow-primary/[0.12]`; card border on hover → navy | 6C |
| `client/src/pages/auth/LoginPage.jsx` | Modified | Left panel gradient overlay → dark-navy; mobile bg overlay → dark-navy | 6C (also 4E) |
| `client/src/pages/auth/SignupPage.jsx` | Modified | Left panel gradient overlay → dark-navy; mobile bg overlay → dark-navy | 6C (also 4E) |
| `client/src/pages/SettingsPage.jsx` | Modified | Settings page heading `font-display` → `font-sans`; light theme swatch bg `#F4F1EF` → `#F3F6F8`; light description "Warm cream & maroon" → "Cool off-white & navy"; dark swatch bg `#0D2B2E` → `#081821`; dark description "Deep teal & maroon" → "Midnight navy & slate" | 6C |
| `client/src/components/RescheduleModal.jsx` | Modified | Modal shadow `rgba(107,15,42,0.20)` → navy rgba | 6C |
| `client/src/pages/MyBookingsPage.jsx` | Modified | Two modal shadows `rgba(107,15,42,0.20/0.22)` → navy rgba | 6C |

---

## Module 6B — Design System Migration

| File path | Status | Purpose | Module modified in |
|---|---|---|---|
| `client/src/index.css` | Modified | Full color token rewrite: all Austrum burgundy values replaced with Harbor Navy / Graphite Slate / Workshop Copper per `COLOR_SYSTEM.md`. New `--secondary`, `--accent-hover`, `--accent-text` tokens added. All hardcoded `rgba(107,15,42,*)` in focus ring, scrollbar, card shadows, `.btn-primary` box-shadow replaced with navy rgba. `.landing-heading` migrated from Playfair Display to Sora. New `.upkeep-brand` and `.upkeep-tagline` utility classes added. `.dark` block fully updated. | 6B |
| `client/tailwind.config.js` | Modified | `burgundy` literal palette removed. `accent` expanded to `{DEFAULT, hover, text}` object (backward compatible). New `secondary: {DEFAULT, hover}` token added. New `navy` and `copper` literal palettes added. All other tokens (`blush`, `charcoal`, `cream`, `font-display`) retained for JSX backward compatibility. | 6B |

---

## Module 4E — Final Rebrand Completion

| File path | Status | Purpose | Module modified in |
|---|---|---|---|
| `client/src/pages/auth/LoginPage.jsx` | Modified | Desktop/mobile logo → `/upkeep_logo.png` + `alt="UpKeep by Austrum"`; mobile tagline → "UpKeep — Nashik's Trusted Home Services" | 4E |
| `client/src/pages/auth/SignupPage.jsx` | Modified | Desktop/mobile logo → `/upkeep_logo.png` + `alt="UpKeep by Austrum"`; heading "Austrum" → "UpKeep" + new "by Austrum" sub-line; mobile tagline updated; success toast → "Welcome to UpKeep! 🎉" | 4E |
| `client/index.html` | Modified | Title, meta description, theme-color, favicon/apple-touch-icon (temporary), manifest link, OG + Twitter tags | 4E |
| `client/public/site.webmanifest` | Added (new) | PWA manifest — name "UpKeep by Austrum", icon `/upkeep_logo.png`, navy theme/bg colors | 4E |
| `admin-client/index.html` | Modified | Title → "UpKeep Admin — Austrum"; added meta description (metadata-only, approved exception to admin-scope exclusion) | 4E |

---

## Module 4D — Footer / Company Info / Contact Branding

| File path | Status | Purpose | Module modified in |
|---|---|---|---|
| `client/src/pages/LandingPage.jsx` | Modified | Footer brand lockup: `siteConfig.businessName` → "UpKeep", `siteConfig.tagline` → "by Austrum", footer logo `alt` → "UpKeep by Austrum", footer description copy updated, copyright line hardcoded to "© {year} Austrum." | 4D (also 4B hero, 4C about section) |
| `server/routes/configRoutes.js` | Modified | `/api/config/site` fallback defaults: `businessName` → "UpKeep", `tagline` → "by Austrum". `email` (support@austrum.in) unchanged. No route/response-shape/logic changes | 4D |

---

## Module 4C — Service Pages + Booking Pages + Customer-Facing Content

| File path | Status | Purpose | Module modified in |
|---|---|---|---|
| `client/src/pages/LandingPage.jsx` | Modified | About/Brand Story line ("We built UpKeep around one idea...") | 4C (also 4B for hero) |
| `client/src/pages/SettingsPage.jsx` | Modified | Customer-facing Help/FAQ/Appearance copy (4 strings: "Getting started with UpKeep", technician verification FAQ, theme subheading, Help & FAQs subheading) — all "Austrum" → "UpKeep" | 4C |
| `client/src/pages/ServicesPage.jsx` | Audited, no change | Service listing/booking modal — no "Austrum" text present; brand-neutral per Content Plan §4 | 4C (audit only) |
| `client/src/pages/MyBookingsPage.jsx` | Audited, no change | Bookings list/detail/OTP/review UI — no "Austrum" text present | 4C (audit only) |

---

## Module 4B — Hero Branding & Messaging

| File path | Status | Purpose | Module modified in |
|---|---|---|---|
| `client/src/pages/LandingPage.jsx` | Modified | Hero eyebrow badge → "UpKeep — Nashik's #1 Home Services Platform"; added "by Austrum" endorsement line beneath it. Headline, subheading, CTAs, hero image, overlay, stats grid, layout/animations unchanged | 4B |

---

## Module 4A — Logo Infrastructure + Navbar Branding

| File path | Status | Purpose | Module modified in |
|---|---|---|---|
| `client/src/components/Navbar.jsx` | Modified | Logo image → `/upkeep_logo.png`, `alt` → "UpKeep by Austrum", nav wordmark "Austrum" → "UpKeep". TODO added for future icon-only Variant B asset | 4A |

---

## Assets Added (pre-existing in repo, not generated by these modules)

| File path | Status | Purpose | Module modified in |
|---|---|---|---|
| `client/public/upkeep_logo.png` | Added (pre-supplied) | UpKeep full-badge logo asset (1254×1254 PNG, no transparency) — used as temporary logo in 4A/4B | 4A |

---

## Not Yet Modified

| File path | Status | Purpose | Module modified in |
|---|---|---|---|
| `client/public/logo.jpg` | Not modified, now unused in `client/` | Old Austrum mark — still referenced (broken) by admin-client | — |
| `admin-client/src/components/Layout.jsx` | Not modified | Admin header branding — out of scope per standing instruction | — |
| `admin-client/src/components/Sidebar.jsx` | Not modified | Admin sidebar branding — out of scope per standing instruction | — |
| `admin-client/src/pages/LoginPage.jsx` | Not modified | Admin login branding (title) — out of scope; `admin@austrum.com` placeholder intentionally retained | — |
| `server/services/otpService.js` | Not modified | OTP/SMS templates — requires telecom/DLT coordination per Content Plan §11 | — |
| `server/server.js` | Not modified | Health-check string — intentionally retained (internal, not customer-facing) | — |
