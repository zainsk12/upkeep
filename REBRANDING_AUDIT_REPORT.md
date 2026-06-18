# REBRANDING_AUDIT_REPORT.md
## UpKeep by Austrum — Full Brand Compliance Audit

**Audit scope:** Modules 4A–4E (complete rebrand cycle)
**Reference docs reviewed:** BRAND_GUIDE.md, CONTENT_REBRAND_PLAN.md, LOGO_INTEGRATION_PLAN.md, IMPLEMENTATION_PROGRESS.md, UPDATED_FILE_MAP.md, FINAL_REBRANDING_REPORT.md
**Auditor role:** Senior QA Engineer / Product Designer / Frontend Architect / Accessibility Reviewer / Brand Compliance Auditor

---

## Executive Summary

The content-level rebrand (text strings, copy, alt-text, metadata) is **substantially complete and well-executed across Modules 4A–4E**. Product naming ("UpKeep"), parent-company endorsement ("by Austrum"), and brand hierarchy are consistently applied across Navbar, Hero, About, Footer, Settings, Auth, and meta tags.

However, the audit has identified **one Critical defect** (footer logo still pointing to the old asset), **five High-severity findings** (design token system, typography, hardcoded overlay colors, OTP/SMS templates, and a metadata dimension mismatch), and several Medium/Low issues.

**Overall Verdict: CONDITIONAL NO-GO for production release.**
The Critical finding (footer logo bug) is a one-line fix that must be resolved before deployment. The High finding regarding the color token system, though deliberately deferred, means the visible UI remains fully Austrum-branded despite the text changes — this gap should be acknowledged at the product level before any public launch that claims UpKeep branding.

---

## Critical Findings

### CF-01 — Footer logo still references old Austrum asset

| Field | Detail |
|---|---|
| **Severity** | Critical |
| **File** | `client/src/pages/LandingPage.jsx:646` |
| **Finding** | Footer `<img>` `src` was **not updated** during Module 4D. It still reads `src="/logo.jpg"` (the old 457×457 JPEG Austrum mark). The `alt` text was correctly updated to `"UpKeep by Austrum"` but the image source was missed, so every user who visits the Landing page sees the old Austrum logo in the footer brand lockup next to the "UpKeep / by Austrum" text. |
| **Impact** | Highest-visibility branding defect on the most visited page surface. Every authenticated and unauthenticated visitor sees a mismatched Austrum logo next to "UpKeep" text in the footer. Directly undermines the rebrand. Also an accessibility violation — the `alt` text ("UpKeep by Austrum") does not match the actual image displayed (old Austrum mark), violating WCAG 1.1.1 (non-text content). |
| **Remediation** | Change `src="/logo.jpg"` → `src="/upkeep_logo.png"` on `LandingPage.jsx:646`. One-line fix. |

---

## High Priority Findings

### HF-01 — Entire design token system remains Austrum burgundy

| Field | Detail |
|---|---|
| **Severity** | High |
| **File** | `client/src/index.css:6–32` |
| **Finding** | All CSS custom properties still carry Austrum-era values. `--primary: #6B0F2A` (burgundy), `--primary-dark: #4A0A1D` (deep burgundy), `--primary-hover: #8B1A3A`, `--blush: #E8A4AF` (pink blush), `--accent: #E8A4AF` (same as blush — not the maroon `#7E2037` Brand Guide §3 specifies), `--bg: #F4F1EF` (warm cream, not UpKeep's cool off-white `#F4F7F9`). These tokens drive: the navbar background color, footer background color, all primary button colors, all focus rings, all `.section-label` pills, `.page-hero` banners, and every link/icon default color across the entire app. The scrollbar (`index.css:66,70`) is also hardcoded to `rgba(107, 15, 42, ...)` — burgundy. Brand Guide §3 states navy (`#0E4A63`) = UpKeep's primary identity; burgundy = Austrum's identity only. |
| **Impact** | The entire visual UI reads "Austrum" despite all text reading "UpKeep." A user sees an UpKeep-branded navbar on a burgundy bar — a direct contradiction of Brand Guide §1's color-ownership rule. This is the most systemic visual brand violation remaining. |
| **Remediation** | Replace `:root` and `.dark` token blocks in `index.css` with UpKeep token set from Brand Guide §3. Add `navy`/`maroon` literal palette to `tailwind.config.js`. Add `.upkeep-brand`/`.upkeep-tagline` utility classes. Update scrollbar to navy equivalent. This is intentionally deferred "Module 4F" work — but must be completed before the rebrand can be called visually complete. |

### HF-02 — Playfair Display used throughout UpKeep headings

| Field | Detail |
|---|---|
| **Severity** | High |
| **File** | `client/src/index.css:88`, `client/src/pages/LandingPage.jsx:448,514,559,610`, `client/src/pages/ServicesPage.jsx:471` |
| **Finding** | The `.landing-heading` CSS class assigns `font-family: 'Playfair Display', Georgia, serif`. This class is applied to the hero H1 ("Premium Home Services, Done Right"), three section H2s ("How It Works", "Why Choose Us", reviews heading), the Services page H1 ("Our Services"), and other section headings. Brand Guide §4 is explicit: "Playfair Display is **NOT** used in UpKeep; it stays an Austrum-parent-only typeface." UpKeep's typography is Sora for everything. |
| **Impact** | The largest, most prominent text on every screen uses a typeface the Brand Guide explicitly prohibits for this product. This is visually the single clearest remaining indicator that the app is an Austrum product, not UpKeep. Typography is a primary brand identity signal. |
| **Remediation** | In `client/src/index.css`, update `.landing-heading` to `font-family: 'Sora', sans-serif; font-weight: 700; letter-spacing: -0.02em;` — or rename the class to avoid confusion. The `font-display: ["Playfair Display", "serif"]` entry in `tailwind.config.js` can be retained for potential future Austrum-parent surfaces but should not be applied to UpKeep headings. |

### HF-03 — Hardcoded Austrum burgundy overlay colors on hero and auth screens

| Field | Detail |
|---|---|
| **Severity** | High |
| **File** | `LandingPage.jsx:434`, `LoginPage.jsx:90,115`, `SignupPage.jsx:80,106` |
| **Finding** | All hero and auth-screen gradient overlays use hardcoded `rgba(107,15,42,...)` — Austrum's primary burgundy. These are inline `style` props, not CSS variable references, so they will **not be fixed** by the token migration in HF-01. Examples: hero overlay `"linear-gradient(135deg, rgba(107,15,42,0.85)..."`, both auth screens `"linear-gradient(160deg, rgba(107,15,42,0.82)..."`. |
| **Impact** | The hero (first thing a visitor sees) and both auth screens (first-impression moments, highest-visibility per Content Plan §9) render with a prominent burgundy colour wash. This is the most immediately visible Austrum visual identity signal on these surfaces. Customers subconsciously read the colour before they read the text. |
| **Remediation** | Replace `rgba(107,15,42,...)` with navy equivalents — e.g. `rgba(14,74,99,...)` (UpKeep Navy `--primary`) or `rgba(8,53,74,...)` (`--primary-dark`). Co-ordinate with token migration (HF-01) so the overlay shades align with the finalized palette. |

### HF-04 — Navbar shadow hardcoded to Austrum burgundy

| Field | Detail |
|---|---|
| **Severity** | High |
| **File** | `client/src/components/Navbar.jsx:135` |
| **Finding** | `style={{ boxShadow: "0 2px 20px rgba(107,15,42,0.4)" }}` — Austrum burgundy shadow. Brand Guide §8 specifies the UpKeep navbar shadow as `"0 2px 20px rgba(8,53,74,0.4)"` (deep navy). Also at Navbar.jsx:59, the user-avatar dropdown shadow is `rgba(107,15,42,0.15)` — same issue. |
| **Impact** | The navbar, the most persistent UI element on every page, casts a burgundy glow. On light-background pages this is visible as a warm purple/red fringe below the nav bar — another Austrum visual cue. |
| **Remediation** | Replace `rgba(107,15,42,0.4)` → `rgba(8,53,74,0.4)` on Navbar:135. Replace `rgba(107,15,42,0.15)` → `rgba(8,53,74,0.15)` on Navbar:59. |

### HF-05 — OTP/SMS messages still identify as "Austrum"

| Field | Detail |
|---|---|
| **Severity** | High |
| **File** | `server/services/otpService.js:122,187,221` |
| **Finding** | All three customer-facing OTP/SMS message paths still read "Your Austrum OTP is…", "Your Austrum OTP is…", and "Austrum Verification Code: …". These are transactional messages sent directly to customer phone numbers during signup and login — the first time many customers encounter the brand. |
| **Impact** | A customer signs up for "UpKeep" and immediately receives an SMS from "Austrum" — a complete brand mismatch at the most critical conversion moment (phone verification). Erodes trust, creates confusion about which product they signed up for, and could increase OTP abandonment if they don't recognise the brand name. |
| **Remediation** | Change all three strings from "Austrum OTP"/"Austrum Verification Code" → "UpKeep OTP"/"UpKeep Verification Code". **Important caveat from Content Plan §11:** If these SMS templates are DLT-registered with a telecom provider (e.g. MSG91 in India), the registered template text must be updated with the provider *first*. Flag for ops/compliance before making the code change. |

### HF-06 — `og:image` aspect ratio incompatible with `twitter:card: summary_large_image`

| Field | Detail |
|---|---|
| **Severity** | High |
| **File** | `client/index.html:21–26` |
| **Finding** | `og:image` is set to `/upkeep_logo.png` with declared dimensions 1254×1254 (1:1 square). `twitter:card` is set to `summary_large_image`, which expects a 2:1 landscape image (minimum 300×157, recommended 1200×600). Facebook and LinkedIn also optimise for 1200×630 (1.91:1). A 1:1 image on `summary_large_image` will be letterboxed, cropped, or rejected depending on the client. Additionally `twitter:title` and `twitter:description` tags are absent — Twitter does not always fall back to OG equivalents. |
| **Impact** | Every shared link preview on Twitter/X, WhatsApp, Facebook, LinkedIn, and Slack will render incorrectly or sub-optimally. This matters for word-of-mouth growth and operator sharing of the service. |
| **Remediation** | Short-term: change `twitter:card` to `"summary"` (which expects a 1:1 image and matches the current asset's shape). Add `<meta name="twitter:title">` and `<meta name="twitter:description">`. Long-term: follow LOGO_INTEGRATION_PLAN.md §6 to produce a dedicated 1200×630 `og-image.png` and revert to `summary_large_image`. |

---

## Medium Priority Findings

### MF-01 — `theme-color` navy conflicts with rendered burgundy navbar

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **File** | `client/index.html:8` |
| **Finding** | `<meta name="theme-color" content="#0E4A63">` (UpKeep Navy). But `--primary` is `#6B0F2A` (Austrum burgundy), so the actual rendered navbar is burgundy. On Android Chrome and iOS Safari, the browser chrome adopts `theme-color` — giving a navy browser bar above a burgundy app navbar. The mismatch is noticeable and confusing. |
| **Impact** | Visible colour inconsistency in mobile browsers between the browser chrome and the first visible UI element. |
| **Remediation** | Temporarily change `theme-color` to `#6B0F2A` (current actual navbar bg) until the token migration (HF-01) and overlay fixes (HF-03) are complete, then switch to `#0E4A63`. |

### MF-02 — Admin console logo and text fallback broken or stale

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **File** | `admin-client/src/components/Layout.jsx:35–41`, `admin-client/src/components/Sidebar.jsx:72–85` |
| **Finding** | Both files reference `src="/logo.jpg"`. `admin-client/public/` does not exist, so this path produces a 404 on every page load. Layout.jsx hides the broken image with no fallback (`onError` just sets display:none), leaving an empty circle. Sidebar.jsx shows the text fallback `"A"` — which should be `"U"` for UpKeep per LOGO_INTEGRATION_PLAN.md §6 — after the image 404s. The admin app browser tab title is now "UpKeep Admin — Austrum" (correctly updated) but all header/sidebar branding still says "Austrum". |
| **Impact** | Admin operators see a broken image, empty brand circle, and "Austrum" label — inconsistent with the title bar that now says "UpKeep Admin". Reduced operator confidence in the rebrand rollout. |
| **Remediation** | Create `admin-client/public/` directory. Copy `/upkeep_logo.png` into it. Update both `src="/logo.jpg"` references. Update the fallback letter "A" → "U". Update "Austrum" label text (Content Plan §13 — deferred module). |

### MF-03 — Missing `twitter:title` and `twitter:description`

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **File** | `client/index.html` |
| **Finding** | Only `twitter:card` and `twitter:image` are set. Twitter/X does not reliably inherit `og:title`/`og:description` — explicit `<meta name="twitter:title">` and `<meta name="twitter:description">` are required for correct card rendering across all clients and link-unfurling integrations (Slack, Teams, Discord). |
| **Impact** | Twitter/X card previews may show no title or description, reducing click-through rate and brand legibility. |
| **Remediation** | Add `<meta name="twitter:title" content="UpKeep by Austrum — Home Services in Nashik">` and `<meta name="twitter:description" content="UpKeep by Austrum — book trusted, verified home repair and maintenance professionals in Nashik...">`. |

### MF-04 — Missing `og:url` tag

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **File** | `client/index.html` |
| **Finding** | OG spec requires `og:url` for the canonical URL of the page. Without it, social crawlers may generate duplicate share entries or fail to consolidate engagement metrics across share events. |
| **Impact** | Social sharing may produce inconsistent preview cards across platforms. Share counts on social platforms may not consolidate. |
| **Remediation** | Add `<meta property="og:url" content="https://[production-domain]/">`. For a SPA, this should be the canonical root URL. |

### MF-05 — `site.webmanifest` missing `purpose` field on icon entry

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **File** | `client/public/site.webmanifest` |
| **Finding** | The icon entry has no `"purpose"` field. Per the Web App Manifest spec and Chrome's PWA requirements, icons should declare `"purpose": "any maskable"` or have separate entries for `"any"` and `"maskable"`. Without `"maskable"`, Android may not apply adaptive icon masking, which can result in a white square background behind the icon on some launchers. |
| **Impact** | Android home-screen icon may render incorrectly (no adaptive masking), appearing as a square rather than the device's preferred shape. |
| **Remediation** | Add `"purpose": "any"` to the existing icon entry (appropriate for a non-designed-for-masking asset). When a proper icon set is produced, add a separate `"purpose": "maskable"` entry with correct safe-zone padding. |

### MF-06 — Auth screen hero description copy is Austrum-era boilerplate

| Field | Detail |
|---|---|
| **Severity** | Medium |
| **File** | `client/src/pages/auth/SignupPage.jsx:88` |
| **Finding** | The desktop signup panel description reads "Premium home services, delivered with care and professionalism." This was not flagged in Content Plan §9 (the plan only specified the heading/logo/toast changes), but this string uses "Premium" — a word the Brand Voice Guide §10 implicitly avoids ("never flashy"). More importantly, it echoes the hero H1 ("Premium Home Services, Done Right") and neither line mentions UpKeep by name on the most important first-touch screen. |
| **Impact** | Minor brand-voice inconsistency. The auth screen is described in Brand Guide §8 as a surface for "home-first warmth" and "inherited trust" — "care and professionalism" is fine but generic; mentioning UpKeep by name would strengthen the brand moment. |
| **Remediation** | Recommended: "Your UpKeep account — verified professionals, delivered right to your door." Or: "Book trusted home services with UpKeep — backed by Austrum." Exact wording subject to copywriting approval. |

---

## Low Priority Findings

### LF-01 — `client/public/logo.jpg` is an orphaned asset

| Field | Detail |
|---|---|
| **Severity** | Low |
| **File** | `client/public/logo.jpg` |
| **Finding** | After CF-01 is fixed (footer logo updated to `/upkeep_logo.png`), `logo.jpg` will no longer be referenced by any file in the `client/` source. It will still be served at `/logo.jpg` in production (wasting bandwidth and potentially appearing in sitemaps or crawls), and still referenced by `admin-client` (which 404s on it anyway since `admin-client/public/` doesn't exist). |
| **Impact** | Minor: unnecessary asset in production bundle; stale resource accessible at a predictable URL. |
| **Remediation** | Delete `client/public/logo.jpg` once the admin console module is completed (it still acts as an intended — if broken — reference for admin). Not a blocker. |

### LF-02 — Admin console login still reads "Austrum Management Console"

| Field | Detail |
|---|---|
| **Severity** | Low |
| **File** | `admin-client/src/pages/LoginPage.jsx:70` |
| **Finding** | `<p>Austrum Management Console</p>` — admin login subtitle. Content Plan §13 recommends "UpKeep Admin Console — by Austrum". Not modified per standing "do not modify Admin Dashboard" instruction. Now that the browser tab reads "UpKeep Admin — Austrum", the on-screen heading saying "Austrum Management Console" is inconsistent with the tab title. |
| **Impact** | Inconsistent admin branding (tab title vs on-screen text). Internal tool only — low customer impact. |
| **Remediation** | Update to "UpKeep Admin Console — by Austrum" in a dedicated Admin Console branding module, per Content Plan §13. |

### LF-03 — Admin console has no favicon

| Field | Detail |
|---|---|
| **Severity** | Low |
| **File** | `admin-client/index.html` |
| **Finding** | `admin-client/index.html` has no `<link rel="icon">` tag and `admin-client/public/` does not exist. The admin console shows a broken browser favicon (default browser icon or nothing) on every tab. |
| **Impact** | Staff using both apps in adjacent tabs cannot distinguish them by favicon — reduced operator UX. Cosmetic only. |
| **Remediation** | Create `admin-client/public/`, add `<link rel="icon" href="/upkeep_logo.png">` (temporary, same approach as client), and copy the asset into the directory. A distinct admin-variant favicon (desaturated/monochrome per LOGO_INTEGRATION_PLAN §4.2) is ideal but optional. |

### LF-04 — `LandingPage.jsx` hero section box-shadow hardcoded to burgundy tint

| Field | Detail |
|---|---|
| **Severity** | Low |
| **File** | `client/src/pages/LandingPage.jsx:594,598` |
| **Finding** | Lines 594 and 598 contain `rgba(107,15,42,0.08)` and `rgba(107,15,42,0.05)` — Austrum burgundy at very low opacity used for sub-section card shadow and radial gradient effects on the Landing page (not in the hero section, in a lower card block). At low opacity they are subtle, but they are Austrum-era values. |
| **Impact** | Very subtle visual. Barely visible at <10% opacity. |
| **Remediation** | Replace with navy equivalents (`rgba(14,74,99,0.08)` etc.) as part of the token migration (HF-01). |

### LF-05 — Focus ring hardcoded to Austrum burgundy

| Field | Detail |
|---|---|
| **Severity** | Low |
| **File** | `client/src/index.css:53` |
| **Finding** | `:focus-visible { outline: 2px solid rgba(107, 15, 42, 0.4); }` — burgundy global focus ring. Brand Guide §3 specifies navy focus rings for UpKeep. This is an accessibility-relevant element (keyboard navigation) that should reflect brand identity. |
| **Impact** | Accessibility users navigating by keyboard see a burgundy focus indicator inconsistent with the UpKeep color system. Low visual impact at current; medium accessibility-brand alignment concern. |
| **Remediation** | Change to `rgba(14, 74, 99, 0.4)` (UpKeep Navy) as part of the token migration (HF-01). |

### LF-06 — `btn-primary` box-shadow hardcoded to Austrum burgundy

| Field | Detail |
|---|---|
| **Severity** | Low |
| **File** | `client/src/index.css:130` |
| **Finding** | `.btn-primary` has `box-shadow: 0 4px 14px rgba(107, 15, 42, 0.22)` — burgundy glow. Brand Guide §5 specifies the primary button shadow as `rgba(14,74,99,0.25)` (navy glow). |
| **Impact** | Every primary CTA button glows burgundy rather than navy. Subtle but contributes to the cumulative Austrum color impression. |
| **Remediation** | Replace value as part of token migration (HF-01). |

---

## Remaining Austrum References — Full Classification

| Reference | File / Location | Classification |
|---|---|---|
| `src="/logo.jpg"` | `LandingPage.jsx:646` (footer) | **Should Change** — CF-01 |
| `© {year} Austrum. All rights reserved.` | `LandingPage.jsx:687` | **Intentional** — legal/ownership |
| `tagline: "by Austrum"` | `LandingPage.jsx:414`, `configRoutes.js:26` | **Intentional** — endorsement string |
| `email: "support@austrum.in"` | `LandingPage.jsx:417`, `configRoutes.js:29` | **Intentional** — company domain |
| `"by Austrum"` hero + signup endorsement lines | `LandingPage.jsx:445`, `SignupPage.jsx:85` | **Intentional** — brand lockup |
| `alt="UpKeep by Austrum"` | Navbar, Footer, Login, Signup (×5) | **Intentional** — correct post-rebrand |
| `"Your Austrum OTP is..."` (×3) | `server/services/otpService.js:122,187,221` | **Should Change** (after ops/DLT coordination) |
| `alt="Austrum"` | `admin-client/Layout.jsx:36`, `Sidebar.jsx:73` | **Needs Review** — admin module |
| `>Austrum<` label text | `admin-client/Layout.jsx:41`, `Sidebar.jsx:85` | **Needs Review** — admin module |
| `"Austrum Management Console"` | `admin-client/LoginPage.jsx:70` | **Needs Review** — admin module |
| `placeholder="admin@austrum.com"` | `admin-client/LoginPage.jsx:97` | **Intentional** — company domain |
| `"Austrum API running ✅"` | `server/server.js:60` | **Intentional** — internal health-check only |
| `"Austrum Admin"` → now updated | `admin-client/index.html` | **Intentional** — updated in 4E |
| `"upkeep"` in service description | `client/src/constants/services.js:41` | **Intentional** — common English word, not brand ref |
| `"UpKeep by Austrum"` (all OG/meta) | `client/index.html` | **Intentional** — correct post-rebrand |
| `"UpKeep Admin — Austrum"` | `admin-client/index.html:6` | **Intentional** — correct post-rebrand |
| `src="/logo.jpg"` | `admin-client/Layout.jsx:35`, `Sidebar.jsx:72` | **Needs Review** — causes 404 (admin module) |
| `rgba(107,15,42,...)` hardcoded colours | Navbar:135,59 / LandingPage:434,594,598 / LoginPage:90,115 / SignupPage:80,106 / index.css:53,66,70,130 | **Should Change** — see HF-01–04, LF-04–06 |
| `--primary: #6B0F2A` and all burgundy tokens | `client/src/index.css:6–32` | **Should Change** — HF-01 |
| `font-family: 'Playfair Display'` in `.landing-heading` | `client/src/index.css:88` | **Should Change** — HF-02 |

---

## Recommended Fixes (Priority Order)

| Priority | Fix | File(s) | Effort |
|---|---|---|---|
| **1 — Immediate (blocker)** | Fix footer logo `src` `/logo.jpg` → `/upkeep_logo.png` | `LandingPage.jsx:646` | 1 line |
| **2 — Immediate** | Change `twitter:card` to `"summary"` + add `twitter:title`, `twitter:description` | `client/index.html` | 3 lines |
| **3 — Immediate** | Change `theme-color` to `#6B0F2A` (match actual UI) until token migration is complete | `client/index.html` | 1 line |
| **4 — Before launch** | Coordinate with ops/telecom to update DLT-registered OTP templates, then update `otpService.js` | `server/services/otpService.js` | 3 lines + ops |
| **5 — Module 4F** | Full CSS token migration: replace `:root`/`.dark` in `index.css`, update `tailwind.config.js`, add `.upkeep-brand`/`.upkeep-tagline` classes | `index.css`, `tailwind.config.js` | Medium |
| **6 — Module 4F** | Fix `.landing-heading` from Playfair Display → Sora | `index.css` | 1 line |
| **7 — Module 4F** | Replace all hardcoded `rgba(107,15,42,...)` overlays with navy equivalents | 5 files | 8 lines |
| **8 — Module 4F** | Fix navbar + button shadows to navy | `Navbar.jsx:135,59`, `index.css:130` | 3 lines |
| **9 — Admin module** | Create `admin-client/public/`, copy asset, fix logo refs, update "A"→"U" fallback, update "Austrum" label text, add favicon link | 3 admin files | Small |
| **10 — Admin module** | Update admin login subtitle to "UpKeep Admin Console — by Austrum" | `admin-client/LoginPage.jsx:70` | 1 line |
| **11 — Asset pass** | Add `og:url`, proper favicon set (16/32/ico), dedicated `og-image.png` (1200×630), `site.webmanifest` icon `"purpose"` | Multiple | Requires design assets |
| **12 — Cleanup** | Delete orphaned `client/public/logo.jpg` after admin module completes | — | 1 file delete |
| **13 — Copy review** | Update Signup desktop description from generic boilerplate | `SignupPage.jsx:88` | 1 line |

---

## Deployment Readiness Assessment

### What is complete and correct ✅

- **Navbar:** UpKeep logo (temp), correct alt text, "UpKeep" wordmark, TODO comment flagged — fully functional
- **Hero:** "UpKeep — Nashik's #1 Home Services Platform" eyebrow, "by Austrum" endorsement — correct
- **Hero H1 / subheading / CTAs:** Unchanged as intended (brand-neutral, on-voice)
- **About/Brand story:** "We built UpKeep around one idea..." — correct
- **Settings/FAQ/Appearance:** All four strings updated — correct
- **Login page:** Logo, alt text, mobile tagline — correct
- **Signup page:** Logo, alt text, heading+sub-line lockup, mobile tagline, success toast — correct
- **Footer text:** "UpKeep" wordmark / "by Austrum" tagline / updated description / "© Austrum" copyright — correct
- **Footer logo alt text:** "UpKeep by Austrum" — correct
- **`configRoutes.js` defaults:** "UpKeep" / "by Austrum" — correct
- **`client/index.html`:** Title, meta description, OG site_name/title/description, manifest link — all correct
- **`site.webmanifest`:** Name, short_name, theme_color, background_color — correct
- **`admin-client/index.html`:** Title, meta description — correct
- **All legal/ownership/company-domain "Austrum" references:** Correctly retained

### What is incomplete or defective ❌

| Item | Status | Blocker? |
|---|---|---|
| Footer logo `src` still `/logo.jpg` | Bug — missed in 4D | **Yes — Critical** |
| Color token system | Deliberately deferred | No (scoped decision), but brand-incomplete |
| Typography (Playfair Display in headings) | Deliberately deferred | No, but brand guide violation |
| Hardcoded burgundy overlays | Deliberately deferred | No, but visually obvious |
| OTP/SMS templates | Deferred (ops dependency) | No, but customer-facing |
| `twitter:card` / Twitter meta completeness | Implementation gap | No |
| `theme-color` vs actual UI mismatch | Implementation gap | No |
| Admin console UI branding | Out of scope | No |
| Proper favicon/OG asset set | Asset dependency | No (temp assets functional) |

---

## Final Go / No-Go Recommendation

### NO-GO — One blocker must be resolved before deployment

**The single deployment blocker is CF-01:** `LandingPage.jsx:646` must change `src="/logo.jpg"` → `src="/upkeep_logo.png"`. This is a one-line fix. With it unresolved, the footer — the most persistent trust element of the landing page — displays the old Austrum logo next to "UpKeep" text, directly undermining the rebrand and creating an accessibility violation.

**All other findings are non-blocking for initial deployment.** They are either deliberate scope decisions (token migration, typography, admin console), dependency-gated items (OTP/SMS, proper favicon set), or low-impact polish items.

### Recommended pre-launch steps (in order)

1. Fix CF-01 (footer logo src — 1 line, ~5 minutes)
2. Fix HF-06 Twitter meta (`twitter:card` → `"summary"`, add `twitter:title`/`twitter:description` — 3 lines)
3. Fix MF-01 (`theme-color` temporarily to `#6B0F2A` to match actual UI)
4. Coordinate with ops on OTP/SMS DLT templates (HF-05)

### Recommended post-launch modules

- **Module 4F:** Token migration + typography + hardcoded overlay/shadow fixes (addresses HF-01, HF-02, HF-03, HF-04, LF-04, LF-05, LF-06 in one session)
- **Module 4G:** Admin console branding (addresses MF-02, LF-02, LF-03)
- **Module 4H:** Asset & Favicon pass (proper favicon set, `og-image.png` 1200×630, Variant B icon-only mark)

After CF-01 is fixed and the three immediate items addressed, the UpKeep by Austrum rebrand is **viable for a soft launch** with known, tracked technical debt.

---

*Audit produced by: QA / Brand Compliance review of Modules 4A–4E, June 2026.*
