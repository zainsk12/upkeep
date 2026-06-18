# LOGO_INTEGRATION_PLAN.md — UpKeep by Austrum

**Role:** Senior Frontend Engineering & UX — Asset Integration Plan
**Reference:** `BRAND_GUIDE.md` v1.0, `CONTENT_REBRAND_PLAN.md`
**Source asset provided:** `upkeep_logo.png` (1254×1254px, RGB, no alpha — navy circular badge `#08354A` with white house silhouette + maroon `#7E2037` wrench/screwdriver, on a near-black `#031927` square background)
**Scope:** Asset/file inventory and integration strategy only. No code modified.

---

## 1. Logo Locations (Current Usage Inventory)

All current logo references point to a single file: **`/logo.jpg`** (served from `client/public/logo.jpg`, **457×457px JPEG**, square crop of the old Austrum mark). `admin-client` has **no `public/` directory at all**, so its `/logo.jpg` references currently resolve to a 404 (silently handled via `onError` fallbacks).

| # | File path | Line | Context | Rendered size (CSS) | Shape applied | Background behind logo |
|---|---|---|---|---|---|---|
| 1 | `client/src/components/Navbar.jsx` | 143–146 | Global top nav, every page | `h-8 w-8` (mobile) / `sm:h-9 sm:w-9` | `rounded-full`, `object-cover`, `border-2 border-blush/40` | `bg-primary` (navy navbar) |
| 2 | `client/src/pages/LandingPage.jsx` | 643–646 | Footer brand column | `h-10 w-10` | `rounded-full`, `object-cover`, `border border-blush/25` | `bg-primary-dark` (navy footer) |
| 3 | `client/src/pages/auth/SignupPage.jsx` | 82 | Desktop signup hero panel (large) | `w-24 h-24` | `rounded-full`, `object-cover`, `border-4 border-blush/35`, `shadow-2xl` | Hero photo + dark gradient overlay |
| 4 | `client/src/pages/auth/SignupPage.jsx` | 114 | Mobile signup branding (above form) | `w-16 h-16` | `rounded-full`, `object-cover`, `border-2 border-blush/50`, `shadow-lg shadow-primary/40` | Hero photo + dark gradient overlay |
| 5 | `client/src/pages/auth/LoginPage.jsx` | 93 | Desktop login hero panel (large) | `w-24 h-24` | Same as #3 | Same as #3 |
| 6 | `client/src/pages/auth/LoginPage.jsx` | 127 | Mobile login branding (above form) | `w-16 h-16` | Same as #4 | Same as #4 |
| 7 | `admin-client/src/components/Layout.jsx` | 35–38 | Admin mobile top header | `w-7 h-7` container, `w-full h-full` img | `rounded-full`, `object-cover`, container has `bg-white/10 border border-white/20` | Admin dark header bar |
| 8 | `admin-client/src/components/Sidebar.jsx` | 72–82 | Admin sidebar brand block | `w-9 h-9` container, `w-full h-full` img | `rounded-full`, `object-cover`; has a **text-fallback span ("A")** if image fails to load | Admin dark sidebar |

**Favicon / browser tab icon locations:** **None found.** Neither `client/index.html` nor `admin-client/index.html` contains a `<link rel="icon">` tag, and no `favicon.ico` exists in either project. Browsers currently request `/favicon.ico` by default and receive a 404.

**Social sharing assets (Open Graph / Twitter Card):** **None found.** No `<meta property="og:*">` or `<meta name="twitter:*">` tags exist in either `index.html`. Shared links currently render with no image and no description — only the bare page `<title>`.

**Web app manifest (PWA icons):** **None found.** No `manifest.json` / `site.webmanifest` referenced in either app.

---

## 2. Files Requiring Replacement

### 2.1 Existing files to replace

| File | Current | Action |
|---|---|---|
| `client/public/logo.jpg` | 457×457 JPEG, old Austrum mark | **Replace** with new UpKeep mark (see §3 for which variant). Recommend converting to **PNG with transparency** (`logo.png`) rather than JPEG — the current 8 usages all apply `rounded-full` over a square raster, which works but a transparent PNG avoids square-corner artifacts on any non-circular future use (e.g., square app icons, emails). |

### 2.2 New files to add — `client/public/`

| File | Purpose | Notes |
|---|---|---|
| `logo.png` (or keep `logo.jpg` name for zero code changes) | Primary in-app logo, used by inventory items #1–6 | See §3 for sizing/variant guidance |
| `favicon.ico` | Classic browser tab icon (multi-res .ico, 16/32/48px) | See §4 |
| `favicon-16x16.png` | Modern browsers, small | See §4 |
| `favicon-32x32.png` | Modern browsers, standard | See §4 |
| `apple-touch-icon.png` (180×180) | iOS home-screen / Safari pinned tab | See §4 |
| `android-chrome-192x192.png` | Android home-screen icon | See §4, manifest |
| `android-chrome-512x512.png` | Android splash/install icon | See §4, manifest |
| `site.webmanifest` | PWA manifest (name, icons, theme colors) | See §5 |
| `og-image.png` (1200×630) | Open Graph / link-preview image for social shares (WhatsApp, Facebook, LinkedIn, Slack) | **New design asset required** — see §6 |
| `twitter-image.png` (1200×600) *(optional — can reuse `og-image.png`)* | Twitter/X card image | See §6 |

### 2.3 New files to add — `admin-client/` (currently has no `public/` directory)

| File | Purpose | Notes |
|---|---|---|
| `admin-client/public/` | **New directory** — must be created; Vite serves this at root automatically | Required before any of the below can resolve |
| `admin-client/public/logo.png` | Fixes the currently-broken `/logo.jpg` references in Layout.jsx (#7) and Sidebar.jsx (#8) | Same asset as client, or the icon-only variant (see §3) |
| `admin-client/public/favicon.ico` + 16/32px PNGs | Admin console browser tab icon — recommend a **visually distinct variant** (e.g. desaturated/monochrome navy) so staff can tell customer app vs. admin console apart by tab icon alone | See §4 |
| `admin-client/public/apple-touch-icon.png` | iOS home-screen icon if admins use mobile Safari | Optional, lower priority |

---

## 3. Responsive Logo Strategy

### 3.1 Recommended asset variants (from the single source PNG)

The supplied `upkeep_logo.png` is a **full badge**: navy circle (`#08354A`) containing the white house + maroon tools + "UpKeep / by Austrum" wordmark, on a near-black square background. Two derived variants are needed for clean integration:

| Variant | Description | Where used |
|---|---|---|
| **A — Full Badge (current asset, cropped to circle)** | The navy circle with house/tools icon **and** the "UpKeep / by Austrum" text baked in. Export as a clean circle (transparent corners) at multiple resolutions. | **Auth screens (#3–#6)** — large/medium sizes where the wordmark is legible and reinforces brand on first-touch screens. |
| **B — Icon-Only Mark (new export needed)** | Just the house + wrench/screwdriver glyph (no circle background, no text), as a transparent PNG/SVG, in **white** and in **navy** color variants. | **Navbar (#1), Footer (#2), Admin header/sidebar (#7–#8)** — small sizes (28–40px) where the full wordmark would be illegible; the icon sits next to a separate text wordmark ("UpKeep") that's already rendered as live HTML text, per `BRAND_GUIDE.md` §8. |

> **Why split these:** At 28–40px (navbar/footer sizes), the "UpKeep by Austrum" text baked into Variant A becomes unreadable mush. The codebase already renders "Austrum"/"UpKeep" as a separate `<span>` next to the logo `<img>` (Navbar.jsx:148, LandingPage.jsx:648) — so the navbar/footer logo should be an **icon-only glyph**, letting the adjacent live text carry the wordmark crisply at any size. The auth screens, by contrast, show the logo large (64–96px) with no adjacent brand text, so the full badge (Variant A) works well there and reinforces the "by Austrum" endorsement at the most important first-impression moments.

### 3.2 Per-context sizing & background guidance

| Context | File(s) | Variant | Recommended export size | Background compatibility |
|---|---|---|---|---|
| Navbar icon | Navbar.jsx | B (icon-only, white or navy) | 72×72px source (renders 32–36px) | Sits on `bg-primary` (Navy `#0E4A63`). Use **white icon-only** variant so it reads clearly against navy — avoids the badge's own navy circle creating a visible mismatched disc against a slightly different navy shade. |
| Footer icon | LandingPage.jsx | B (icon-only, white) | 80×80px source (renders 40px) | Sits on `bg-primary-dark` (`#08354A` — matches the logo's own circle color exactly). White icon-only avoids any circle/edge mismatch. |
| Auth hero (desktop) | Signup/LoginPage.jsx | A (full badge) | 256×256px source (renders 96px @2x-ready) | Sits over hero photo + dark overlay — full badge with its own navy circle reads as a clean "sticker" against the photo. |
| Auth mobile branding | Signup/LoginPage.jsx | A (full badge) | 192×192px source (renders 64px @2x-ready) | Same as above. |
| Admin header | Layout.jsx | B (icon-only, white) | 56×56px source (renders 28px) | Sits on dark admin header bar; container already has `bg-white/10` — icon-only avoids double-circle look (container circle + logo circle). |
| Admin sidebar | Sidebar.jsx | B (icon-only, white) | 72×72px source (renders 36px) | Same reasoning as admin header; also has a text fallback ("A") that should be updated to "U" if it's ever shown (see §6). |

### 3.3 Resolution / density guidance
- Export all PNG variants at **2x (and ideally 3x) the largest rendered size** for retina displays (e.g., the 96px auth logo → export at 192–288px).
- Prefer **SVG** for the icon-only mark (Variant B) where possible — it's a simple geometric house/wrench/screwdriver glyph, scales perfectly at any size, and produces a much smaller file than PNG. PNG fallback only needed if SVG isn't provided by the designer.
- The full badge (Variant A) can remain PNG (it contains the photographic gradient look + fine wordmark detail), exported at a single high resolution (e.g. 512×512) and resized via CSS — no need for multiple PNG sizes for in-app use.

---

## 4. Favicon Strategy

**Current state:** Zero favicon assets or `<link>` tags in either app — both currently show a broken/default browser icon.

### 4.1 Required favicon set (per app)

Generate from **Variant A (full badge)** — favicons are small and circular/square badges read best as self-contained icons (no adjacent text needed, unlike the navbar).

| File | Size(s) | Purpose | `<link>` tag (for reference — not to be added now) |
|---|---|---|---|
| `favicon.ico` | 16, 32, 48px (multi-size .ico) | Legacy browsers, OS bookmarks | `<link rel="icon" href="/favicon.ico" sizes="any">` |
| `favicon-16x16.png` | 16×16 | Modern browser tabs (small) | `<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">` |
| `favicon-32x32.png` | 32×32 | Modern browser tabs (standard) | `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">` |
| `apple-touch-icon.png` | 180×180 | iOS Safari home screen / pinned tab | `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` |
| `android-chrome-192x192.png` | 192×192 | Android home screen | Referenced via `site.webmanifest` |
| `android-chrome-512x512.png` | 512×512 | Android splash/maskable icon | Referenced via `site.webmanifest` |

### 4.2 Client vs. Admin differentiation
- **`client/public/`** — full-color UpKeep badge (navy + white + maroon), as supplied.
- **`admin-client/public/`** (new directory) — recommend a **tonal variant** of the same badge (e.g., desaturated navy/grey, or with a small "ADMIN" corner tag) so staff working with both apps open in adjacent browser tabs can distinguish them at a glance. This is a **manual design task** (see §6) — functionally, the admin console can temporarily reuse the same favicon set as the client if a distinct variant isn't ready, but it's strongly recommended for an internal tool used alongside the customer app.

### 4.3 Implementation note (for future code session)
Both `index.html` files will need a new `<head>` block containing the favicon `<link>` tags above, plus `<link rel="manifest" href="/site.webmanifest">` and a `theme-color` meta tag (see §5). This is a single, contained addition to two files — flagged here, not executed.

---

## 5. Metadata Branding Strategy

### 5.1 Current state
Both `index.html` files contain only `<meta charset>`, `<meta viewport>`, and `<title>` — no description, no Open Graph, no Twitter Card, no theme-color, no manifest link. (Title changes themselves are already specified in `CONTENT_REBRAND_PLAN.md` §7–8 and are not repeated here — this section covers the **asset-backed** metadata.)

### 5.2 Recommended `<head>` additions — `client/index.html`

| Tag | Recommended value | Asset dependency |
|---|---|---|
| `<meta name="theme-color" content="#0E4A63">` | UpKeep Navy (`--primary`) | None — controls mobile browser chrome / Android task-switcher color |
| `<link rel="manifest" href="/site.webmanifest">` | — | Requires `site.webmanifest` (§5.4) + Android icons (§4) |
| `<meta property="og:type" content="website">` | — | None |
| `<meta property="og:site_name" content="UpKeep by Austrum">` | — | None |
| `<meta property="og:title" content="UpKeep by Austrum — Home Services in Nashik">` | Matches §7 of content plan | None |
| `<meta property="og:description" content="...">` | Matches §8 of content plan | None |
| `<meta property="og:image" content="/og-image.png">` | — | **Requires new `og-image.png`** (§6) |
| `<meta property="og:image:width" content="1200">` / `<meta property="og:image:height" content="630">` | — | Matches og-image dimensions |
| `<meta name="twitter:card" content="summary_large_image">` | — | None |
| `<meta name="twitter:image" content="/og-image.png">` | Can reuse og-image | Same asset as above |

### 5.3 Recommended `<head>` additions — `admin-client/index.html`
- `theme-color` (admin variant, e.g. a deeper navy `#08354A` to visually differentiate from the customer app)
- Favicon links (admin-specific set, §4.2)
- **No Open Graph/Twitter tags needed** — admin console is not a publicly shared/indexed surface.

### 5.4 `site.webmanifest` (new file, `client/public/`)
A new JSON file is required, containing:
- `"name": "UpKeep by Austrum"`, `"short_name": "UpKeep"`
- `"icons"`: references to `android-chrome-192x192.png` and `android-chrome-512x512.png`
- `"theme_color": "#0E4A63"` (Navy), `"background_color": "#F4F7F9"` (UpKeep light bg per Brand Guide §3)
- `"display": "standalone"`, `"start_url": "/"`

This is a small, self-contained JSON file — content can be authored once the Android icon PNGs (§2.2/§4) exist.

---

## 6. Manual Design Work Required

The supplied `upkeep_logo.png` is a **single flattened full-badge asset** (1254×1254, square canvas, no transparency). The following derivative assets **do not exist yet** and require a designer/design tool pass before engineering can integrate them:

1. **Icon-only mark, transparent background, two color variants** (Variant B, §3.1)
   - Isolate the house + wrench/screwdriver glyph from the navy circle and wordmark.
   - Export as **white-on-transparent** (for use on navy surfaces: navbar, footer, admin) and optionally **navy-on-transparent** (for any future light-surface placements).
   - **Preferred format: SVG** (scalable, tiny file size, crisp at all sizes) with PNG fallback at 2x/3x.
   - *Why needed:* Without this, the navbar/footer/admin logo will either show the full wordmark badge at illegible sizes, or show a mismatched navy-circle-on-navy-background artifact (see §3.2).

2. **Transparent-background circular crop of the full badge** (Variant A cleanup)
   - The supplied PNG has a near-black square background (`#031927`) around the navy circle. For use on photo backgrounds (auth screens) and as favicon source, the corners need to be removed (transparent) so only the circular badge remains — currently `rounded-full` CSS *visually* clips this, but a true transparent PNG is cleaner for favicon generation and any non-circular containers.

3. **Open Graph / social share image** (`og-image.png`, 1200×630px) — **net-new design**
   - Should combine the UpKeep badge/icon with the "UpKeep by Austrum" wordmark and a short value line (e.g. "Home Services in Nashik"), on the Navy/maroon palette per `BRAND_GUIDE.md` §3.
   - This image does not exist in any form today and must be composed from scratch (logo + typography + brand colors), ideally as a template so it can be reused/updated later.

4. **Admin console favicon variant** (§4.2) — optional but recommended
   - A tonal/desaturated or tagged version of the badge to distinguish the admin tab from the customer app tab.

5. **Multi-resolution favicon export pass**
   - Once items 1–2 exist, generating the `.ico` + PNG size set (§4.1) and Android/iOS icons (§2.2) is largely mechanical (can be automated via standard favicon-generation tooling), but should be run by whoever has the source vector/PNG to ensure correct padding and background color (note: `.ico`/PNG icons typically need the navy circle background retained — i.e., use Variant A's transparent-cropped circle, not the icon-only Variant B, since OS icon slots expect a filled shape).

6. **Sidebar text-fallback update** (`admin-client/src/components/Sidebar.jsx:81`)
   - Currently shows a hardcoded `"A"` letter avatar if `/logo.jpg` fails to load. Once the real UpKeep asset is in place this fallback should rarely trigger, but if it's ever updated, the letter should become `"U"`. *(Flagged for awareness only — this is a one-character code change, listed here per the "no code changes in this plan" constraint rather than executed.)*

---

## Summary Checklist (for handoff to implementation session)

- [ ] Designer exports: icon-only glyph (white + navy, SVG preferred) — Variant B
- [ ] Designer exports: full badge, transparent-cropped circle — Variant A cleanup
- [ ] Designer composes: `og-image.png` (1200×630)
- [ ] Designer (optional): admin-distinct favicon variant
- [ ] Generate favicon set (`.ico`, 16/32px PNG, apple-touch-icon, android icons) from Variant A
- [ ] Create `admin-client/public/` directory
- [ ] Place all final assets into `client/public/` and `admin-client/public/`
- [ ] Author `site.webmanifest`
- [ ] Add `<head>` tags to both `index.html` files (favicons, manifest, theme-color, OG/Twitter — client only)
- [ ] Swap `/logo.jpg` → new icon-only asset in Navbar.jsx, LandingPage.jsx footer, admin Layout.jsx, admin Sidebar.jsx
- [ ] Swap `/logo.jpg` → new full-badge asset in Signup/LoginPage.jsx (both desktop + mobile instances)
