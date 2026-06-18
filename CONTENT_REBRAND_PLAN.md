# CONTENT_REBRAND_PLAN.md — UpKeep by Austrum

**Role:** UX Writing & Brand Strategy — Content Migration Plan
**Reference:** `BRAND_GUIDE.md` v1.0 (Brand Hierarchy §2, Brand Voice §10)
**Scope:** All customer-facing copy across `client/` (user app), `admin-client/` (operations console), and customer-facing strings in `server/` (SMS/OTP templates, public config defaults).
**Out of scope:** No code changes performed. This document is a content map for future implementation sessions.

---

## How to read this document

| Column | Meaning |
|---|---|
| **File path** | Exact file and line(s) containing the string |
| **Existing text** | Current customer-facing copy |
| **Recommended replacement** | New copy per Brand Guide §1–2, §10 |
| **Reason** | Why the change is made (or not made) |

**Per Brand Hierarchy (§2):**
- First brand mention on a screen → **"UpKeep by Austrum"**
- Subsequent mentions on the same screen → **"UpKeep"**
- "Austrum" alone is **retained only** for: legal/copyright lines, ownership statements, company-domain identifiers (e.g. email domains), and internal/operator-facing labels where the parent company is the actor, not the product.

---

## 1. Navbar

| File path | Existing text | Recommended replacement | Reason |
|---|---|---|---|
| `client/src/components/Navbar.jsx:144` | `alt="Austrum"` (logo image) | `alt="UpKeep by Austrum"` | Logo alt text is the first brand signal on every page; should name the product + endorsement for accessibility/SEO crawlers. |
| `client/src/components/Navbar.jsx:148` | `<span className="... nav-brand">Austrum</span>` | `UpKeep` | This is the primary wordmark in the global nav — per Brand Hierarchy, "UpKeep" is the dominant identity in product UI. "by Austrum" endorsement lives in the footer/auth screens, not repeated in the persistent nav (keeps nav compact, avoids redundancy). |

---

## 2. Hero

| File path | Existing text | Recommended replacement | Reason |
|---|---|---|---|
| `client/src/pages/LandingPage.jsx:442` | `Nashik's #1 Home Services Platform` (hero eyebrow badge) | `UpKeep — Nashik's #1 Home Services Platform` | No literal "Austrum" present, but this is the first text a visitor reads — it should anchor the product name immediately, satisfying the "first mention = brand name" rule before any Austrum reference appears later (footer). |
| `client/src/pages/LandingPage.jsx:445–448` | `Premium Home Services, Done Right` | *No change* | Generic, brand-agnostic headline — works for UpKeep as-is. |
| `client/src/pages/LandingPage.jsx:450–452` | `Trusted, verified professionals for every corner of your home. Book in seconds, results guaranteed.` | *No change* | Brand-agnostic, on-voice (per §10 "Do": outcome-led, plain language). |

---

## 3. About / Brand Story

| File path | Existing text | Recommended replacement | Reason |
|---|---|---|---|
| `client/src/pages/LandingPage.jsx:556` | `Why Choose Us` (section heading) | *No change* | Generic, retains. |
| `client/src/pages/LandingPage.jsx:558` | `We built Austrum around one idea — home services should be stress-free.` | `We built UpKeep around one idea — home services should be stress-free.` | This is the platform's "why we exist" statement — it describes the **product**, not the parent company, so it should reference UpKeep. Per Brand Voice §10, the Austrum relationship doesn't need restating here since the footer already carries the "by Austrum" endorsement on the same page. |
| `client/src/pages/LandingPage.jsx:570–602` (WHY_US cards: "Verified Professionals," "Transparent Pricing," etc.) | *(no Austrum references)* | *No change* | Already brand-agnostic, on-voice trust copy — directly reusable per Brand Guide §10. |

---

## 4. Services

| File path | Existing text | Recommended replacement | Reason |
|---|---|---|---|
| `client/src/constants/services.js` (all entries) | Service names/descriptions (Electrical, Plumbing, Cleaning, etc.) | *No change* | No "Austrum" references found. Category names and descriptions are product-feature copy, brand-neutral, and consistent with UpKeep's "craft & competence" pillar — retain as-is. |
| `client/src/pages/ServicesPage.jsx` | Address placeholder: `House no., street, area, Nashik` | *No change* | Location-only string, no brand reference. |

---

## 5. Footer

| File path | Existing text | Recommended replacement | Reason |
|---|---|---|---|
| `client/src/pages/LandingPage.jsx:413` | `businessName: "Austrum"` (siteConfig default) | `businessName: "UpKeep"` | Drives the visible footer brand name (column heading). The footer brand column should show "UpKeep" as the primary wordmark, per Brand Hierarchy §2. |
| `client/src/pages/LandingPage.jsx:414` | `tagline: "Nashik's Trusted Home Services"` | `tagline: "by Austrum"` | Per Brand Guide §9, the footer brand column must carry a visible "by Austrum" endorsement directly beneath the wordmark (mirrors the supplied logo lockup, using the maroon accent color per §3/§9). The displaced descriptor ("Nashik's Trusted Home Services") moves into the footer's body description line (see next row) so the local-trust message isn't lost. |
| `client/src/pages/LandingPage.jsx:644` | `alt="Austrum"` (footer logo image) | `alt="UpKeep by Austrum"` | Same accessibility/SEO reasoning as Navbar logo. |
| `client/src/pages/LandingPage.jsx:648` | `<div className="text-white nav-brand">{siteConfig.businessName}</div>` | Renders `UpKeep` (via updated `businessName`) | See row 1 — wordmark now reads "UpKeep". |
| `client/src/pages/LandingPage.jsx:649` | `<div className="text-blush/50 text-xs">{siteConfig.tagline}</div>` | Renders `by Austrum` (via updated `tagline`), styled with `--accent` (maroon) per §3 | Implements the required endorsement lockup directly under the "UpKeep" wordmark. |
| `client/src/pages/LandingPage.jsx:653` | `Quality home services delivered with professionalism and care.` | `Nashik's trusted home services — delivered with professionalism and care.` | Folds in the local-trust descriptor that previously lived in `tagline`, keeping the "Nashik's Trusted" message visible without crowding the brand lockup. |
| `client/src/pages/LandingPage.jsx:684` | `© {new Date().getFullYear()} {siteConfig.businessName}. All rights reserved.` | `© {new Date().getFullYear()} Austrum. All rights reserved.` | **Legal/ownership reference — retain "Austrum."** Copyright denotes the legal entity that owns the product, not the product name. Since `businessName` is being repointed to "UpKeep" (row 1), this line must no longer read it directly — either hardcode "Austrum" here or introduce a separate `siteConfig.legalEntity = "Austrum"` field so copyright stays accurate independent of the product wordmark. |

---

## 6. Contact

| File path | Existing text | Recommended replacement | Reason |
|---|---|---|---|
| `client/src/pages/LandingPage.jsx:415` | `city: "Nashik, Maharashtra"` | *No change* | Geographic fact, no brand reference. |
| `client/src/pages/LandingPage.jsx:416` | `phone: "+91 98765 43210"` | *No change* | Contact data, no brand reference. |
| `client/src/pages/LandingPage.jsx:417` | `email: "support@austrum.in"` | **Retain** `support@austrum.in` *(or, optionally, migrate to a UpKeep-branded sub-address, e.g. `support@upkeep.austrum.in`, if that mailbox/domain is provisioned)* | The email domain (`austrum.in`) is a **company/ownership identifier**, not customer-facing brand naming — retain per the "company references" exception. A sub-brand mailbox is a nice-to-have for reinforcing UpKeep identity but requires infra setup, so flagged as optional, not required for this content pass. |

---

## 7. Meta Titles

| File path | Existing text | Recommended replacement | Reason |
|---|---|---|---|
| `client/index.html:6` | `<title>Austrum</title>` | `<title>UpKeep by Austrum — Home Services in Nashik</title>` | Browser tab title and primary SEO signal for the customer-facing app. Leads with the product name (first mention = full "UpKeep by Austrum" lockup, per Brand Hierarchy), includes category + location for search relevance. |
| `admin-client/index.html:6` | `<title>Austrum Admin</title>` | `<title>UpKeep Admin — Austrum</title>` | Internal/operator tool, not a customer-facing surface, but should still reflect that this console manages the **UpKeep** product. "Austrum" retained as the operating company reference (operator context, per the "company references" exception). |

---

## 8. Meta Descriptions

**Finding:** Neither `client/index.html` nor `admin-client/index.html` currently contains a `<meta name="description">` tag. This is a content gap, not a rename — recommendations below are **additions**.

| File path | Existing text | Recommended replacement (new tag) | Reason |
|---|---|---|---|
| `client/index.html` (inside `<head>`, after `<title>`) | *(none present)* | `<meta name="description" content="UpKeep by Austrum — book trusted, verified home repair and maintenance professionals in Nashik. Transparent pricing, easy scheduling, satisfaction guaranteed." />` | Provides search engines and link previews with brand-accurate, customer-facing description. Leads with full "UpKeep by Austrum" lockup (first/only mention), then focuses on product value (per Brand Voice §10: outcomes, plain language, no hype). |
| `admin-client/index.html` (inside `<head>`, after `<title>`) | *(none present)* | `<meta name="description" content="UpKeep Admin — internal operations console for managing bookings, technicians, and services. Austrum-operated." />` | Low-priority (admin tool is not publicly indexed/shared), but included for consistency. Notes Austrum as operator, consistent with the "company reference" exception. |

---

## 9. Authentication Screens (Login / Signup)

> These are high-visibility, first-impression "hero-style" screens and warrant their own section.

| File path | Existing text | Recommended replacement | Reason |
|---|---|---|---|
| `client/src/pages/auth/SignupPage.jsx:82` | `alt="Austrum"` (desktop hero logo) | `alt="UpKeep by Austrum"` | Logo alt text — first brand mention on this screen, full lockup. |
| `client/src/pages/auth/SignupPage.jsx:83` | `<h2 className="... auth-heading">Austrum</h2>` | `UpKeep` (with a smaller `by Austrum` sub-line beneath, styled per Brand Guide §9/§4 "upkeep-tagline") | This is the largest brand text on the signup screen. Per Brand Hierarchy, "UpKeep" should be the dominant wordmark here, with the maroon-accented "by Austrum" endorsement directly underneath — mirroring the supplied logo lockup exactly. |
| `client/src/pages/auth/SignupPage.jsx:114` | `alt="Austrum"` (mobile logo) | `alt="UpKeep by Austrum"` | Same as above, mobile variant. |
| `client/src/pages/auth/SignupPage.jsx:211` | `toast.success("Welcome to Austrum! 🎉", ...)` | `toast.success("Welcome to UpKeep! 🎉", ...)` | This toast confirms successful account creation **on the UpKeep platform** — should welcome the user to the product they signed up for. |
| `client/src/pages/auth/LoginPage.jsx:93` | `alt="Austrum"` (desktop hero logo) | `alt="UpKeep by Austrum"` | Logo alt text, full lockup, first mention on screen. |
| `client/src/pages/auth/LoginPage.jsx:127` | `alt="Austrum"` (mobile logo) | `alt="UpKeep by Austrum"` | Same, mobile variant. |
| `client/src/pages/auth/LoginPage.jsx:128` | `Nashik's Trusted Home Services` (mobile tagline under logo) | `UpKeep — Nashik's Trusted Home Services` | No literal "Austrum" present, but this is the mobile login screen's brand-reinforcement line directly under the logo — should name the product explicitly since the desktop equivalent (row above) now does via alt text + lockup. |

---

## 10. Settings & Help / FAQ

| File path | Existing text | Recommended replacement | Reason |
|---|---|---|---|
| `client/src/pages/SettingsPage.jsx:27` | `label: "Getting started with Austrum"` | `Getting started with UpKeep` | This is an in-app help menu item describing how to use the **product** (booking, managing services) — refers to UpKeep, not the parent company. |
| `client/src/pages/SettingsPage.jsx:53` | `"All Austrum technicians go through a background verification process..."` | `"All UpKeep technicians go through a background verification process..."` | FAQ answer about the workforce/quality standards of **this platform's** technicians — a UpKeep operational claim. |
| `client/src/pages/SettingsPage.jsx:151` | `Choose how Austrum looks to you` (Appearance/theme panel subheading) | `Choose how UpKeep looks to you` | Refers to the app's visual theme (light/dark mode) — a product-level setting. |
| `client/src/pages/SettingsPage.jsx:228` | `subheading = "Everything you need to know about using Austrum"` | `Everything you need to know about using UpKeep` | Help & FAQs page subheading — describes using the product. |

---

## 11. Transactional Messages (OTP / SMS — customer-facing)

| File path | Existing text | Recommended replacement | Reason |
|---|---|---|---|
| `server/services/otpService.js:122` | `` `Your Austrum OTP is ${otp}. Valid for 10 minutes. Do NOT share with anyone.` `` | `` `Your UpKeep OTP is ${otp}. Valid for 10 minutes. Do NOT share with anyone.` `` | SMS sent directly to the customer's phone during signup/login on the UpKeep app — sender identity should match the product the customer is using. |
| `server/services/otpService.js:187` | `` `Your Austrum OTP is ${otp}. Valid for 10 minutes. Do NOT share with anyone.` `` | `` `Your UpKeep OTP is ${otp}. Valid for 10 minutes. Do NOT share with anyone.` `` | Same as above (alternate provider path — keep both in sync). |
| `server/services/otpService.js:221` | `` `Austrum Verification Code: ${otp}\n...` `` | `` `UpKeep Verification Code: ${otp}\n...` `` | Same reasoning — DLT/SMS template sender name should read "UpKeep" to match the customer-facing app. *Note: if this template is registered with a telecom provider (e.g. MSG91 DLT template in India), the registered template text must be updated with the provider first — flag for ops/compliance before code change.* |

---

## 12. Backend Site Config Defaults (drive Footer/Contact at runtime)

| File path | Existing text | Recommended replacement | Reason |
|---|---|---|---|
| `server/routes/configRoutes.js:25` | `businessName: process.env.SITE_BUSINESS_NAME \|\| "Austrum"` | `... \|\| "UpKeep"` | Fallback value for the footer brand name (consumed by `LandingPage.jsx` `siteConfig.businessName` — see §5). Should default to the product name. |
| `server/routes/configRoutes.js:26` | `tagline: process.env.SITE_TAGLINE \|\| "Nashik's Trusted Home Services"` | `... \|\| "by Austrum"` | Fallback for the footer endorsement line (see §5 rationale). |
| `server/routes/configRoutes.js:29` | `email: process.env.SITE_EMAIL \|\| "support@austrum.in"` | **Retain** `"support@austrum.in"` | Company-domain identifier — ownership reference, not product branding (see §6). |
| *(new field, optional)* | — | Add `legalEntity: process.env.SITE_LEGAL_ENTITY \|\| "Austrum"` | Supports the footer copyright line (§5) so "Austrum" remains correct for legal text even after `businessName` becomes "UpKeep." |

---

## 13. Admin Console (Internal / Operator-Facing — not customer-facing)

> Included for completeness since the brand is being introduced platform-wide, but these screens are used by Austrum staff, not customers. Lower priority than §1–11.

| File path | Existing text | Recommended replacement | Reason |
|---|---|---|---|
| `admin-client/src/components/Layout.jsx:36` | `alt="Austrum"` (header logo) | `alt="UpKeep by Austrum"` | Consistency with the icon/lockup defined in the brand guide; internal users still benefit from a recognizable, consistent mark. |
| `admin-client/src/components/Layout.jsx:41` | `<p>...">Austrum</p>` (header label) | `UpKeep Admin` | Clarifies to operators which product's data they're managing — "Austrum" is the company running multiple things; this console is specifically for UpKeep. |
| `admin-client/src/components/Sidebar.jsx:73` | `alt="Austrum"` (sidebar logo) | `alt="UpKeep by Austrum"` | Same as Layout.jsx logo. |
| `admin-client/src/components/Sidebar.jsx:85` | `Austrum` (sidebar brand label, with separate "Admin Console" sub-line already present) | `UpKeep` | Sidebar brand wordmark — pairs with existing "Admin Console" sub-line for a "UpKeep / Admin Console" lockup. |
| `admin-client/src/pages/LoginPage.jsx:70` | `Austrum Management Console` | `UpKeep Admin Console — by Austrum` | Admin login screen subtitle — names the product being managed, with company attribution retained for operator clarity (this *is* a legitimate "company reference" context — staff need to know which company/product they're logging into). |
| `admin-client/src/pages/LoginPage.jsx:97` | `placeholder="admin@austrum.com"` | **Retain** `admin@austrum.com` *(or update only if/when a dedicated admin email domain for UpKeep is provisioned)* | Email placeholder reflects the company's actual admin email domain — ownership/company reference, retain per exception. |
| `admin-client/index.html:6` | `<title>Austrum Admin</title>` | See §7 | Already covered above. |

---

## 14. Items Explicitly Retained (Legal / Ownership / Company References)

These contain "Austrum" and **should NOT be changed** — listed here to confirm they were reviewed, not missed.

| File path | Text | Reason for retention |
|---|---|---|
| `client/src/pages/LandingPage.jsx:684` (after edit) | `© {year} Austrum. All rights reserved.` | Legal copyright — names the owning legal entity. |
| `client/src/pages/LandingPage.jsx:417` / `server/routes/configRoutes.js:29` | `support@austrum.in` | Company email domain — ownership reference. |
| `admin-client/src/pages/LoginPage.jsx:97` | `admin@austrum.com` | Company email domain — ownership/operator reference. |
| `admin-client/src/pages/LoginPage.jsx:70` (after edit) | `...— by Austrum` | Operator/company attribution on an internal staff tool. |
| `server/server.js:60` | `res.json({ status: "Austrum API running ✅" })` | Internal API health-check response, not visible to customers — out of scope for content rebrand. |
| `client/package.json:2`, `admin-client/package.json:2` | `"name": "austrum"`, `"name": "austrum-admin"` | npm package identifiers — code-level configuration, not customer-facing content; excluded per "Do not modify code." |

---

## 15. Implementation Priority

1. **Tier 1 — Highest visibility (do first):** Navbar wordmark (§1), Footer brand lockup + copyright (§5), Auth screen branding (§9), Meta titles/descriptions (§7–8).
2. **Tier 2 — Product voice consistency:** About statement (§3), Settings/FAQ copy (§10), Hero eyebrow badge (§2).
3. **Tier 3 — Transactional & backend defaults:** OTP/SMS templates (§11 — coordinate with telecom provider if DLT-registered), config fallback values (§12).
4. **Tier 4 — Internal tooling (lowest priority):** Admin console (§13) — can be scheduled independently of the customer-facing rebrand.

**Cross-cutting check:** After implementing §5 and §12 together, confirm the footer renders as: **"UpKeep"** (wordmark) → **"by Austrum"** (maroon endorsement, directly beneath) → description line → **"© [year] Austrum. All rights reserved."** This is the canonical UpKeep brand lockup per `BRAND_GUIDE.md` §2 and §9.
