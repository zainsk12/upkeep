# BRAND_GUIDE.md — UpKeep by Austrum

**Status:** Brand foundation v1.0
**Scope:** UpKeep product (web app, client + admin). Defines tokens, components, and voice for all future implementation work.
**Stack assumed:** React + Tailwind (CSS variables in `index.css`, mapped in `tailwind.config.js`) — same architecture as the existing Austrum codebase.

> **How to use this doc (for AI sessions):** This is the single source of truth for UpKeep's visual and verbal identity. Before styling any UpKeep screen/component, check the relevant section here first. Do not invent new colors, fonts, or spacing scales — extend the tokens below. If a pattern isn't covered, follow the *spirit* of section 1 (Brand Positioning) and the closest analogous pattern in this doc.

---

## 0. Source Analysis Summary

**Logo analysis (`upkeep_logo.png`):**
- Deep navy circular badge (`#08354A`), darker navy/black halo behind it (`#031927`)
- White house/roofline silhouette (minimal, geometric, line-art) — represents "home"
- Maroon/burgundy wrench + screwdriver icons (`#7E2037`) inside the roofline — represents "service/repair," and visually inherits Austrum's burgundy DNA
- "UpKeep" wordmark: bold, geometric sans-serif, white
- "by Austrum" lockup: smaller, mixed-weight sans-serif with thin maroon divider rules — signals sub-brand relationship

**Existing Austrum codebase tokens (`client/src/index.css`):**
- Primary: burgundy `#6B0F2A` (hover `#8B1A3A`, dark `#4A0A1D`)
- Accent: blush `#E8A4AF`
- Light bg: cream `#F4F1EF`, text `#1A1A1A`
- Dark mode variants exist (`.dark` class toggle)
- Fonts: **Sora** (UI/body/nav), **Playfair Display** (landing display headings)
- Components use: `rounded-xl`/`rounded-2xl`, soft shadows, `card`/`btn-primary`/`input-base`/`section-label` utility classes, lucide-react icons

**Conclusion:** UpKeep is a **sibling sub-brand**, not a re-skin. It gets its **own primary color (Navy, from the logo)** for its own product surfaces, while **retaining Austrum's maroon as a shared "house" accent** — this is the visual thread that ties UpKeep back to its parent. Typography system (Sora) is inherited for consistency across the Austrum family; Playfair Display is retired for UpKeep (the logo has no serif influence — UpKeep should feel more utilitarian/trade-professional than Austrum's softer consumer-lifestyle tone).

---

## 1. Brand Positioning

**Brand name:** UpKeep by Austrum
**Category:** Home maintenance & repair services platform (booking, scheduling, verified professionals)
**Relationship to parent:** UpKeep is Austrum's dedicated **home services / handyman vertical** — the operational, trade-focused arm of the broader Austrum platform.

**Positioning statement:**
> UpKeep is the dependable way to get your home fixed, maintained, and cared for — backed by Austrum's trust and standards, delivered by verified local professionals in Nashik.

**Brand pillars:**
1. **Reliability** — "Upkeep" implies ongoing care, not one-off fixes. The brand should feel like a maintenance partner, not a marketplace gamble.
2. **Craft & competence** — wrench + screwdriver iconography signals real trade skill. Visuals should feel grounded, precise, professional — never flashy.
3. **Home-first warmth** — the house silhouette keeps the brand human and domestic, not industrial/corporate.
4. **Inherited trust** — the "by Austrum" endorsement borrows credibility from the parent. Never hide or visually bury this relationship.

**Tone in one line:** *Calm, competent, and dependable — like a trusted handyman who shows up on time and explains things clearly.*

**Differentiation vs. Austrum (parent) UI:**
| Aspect | Austrum (parent) | UpKeep (this product) |
|---|---|---|
| Primary color | Burgundy `#6B0F2A` | Navy `#0E4A63` |
| Mood | Warm, lifestyle, hospitality-adjacent | Practical, trade-professional, dependable |
| Display type | Playfair Display + Sora | Sora only |
| Shared accent | — | Austrum Maroon `#7E2037` (linking color) |

---

## 2. Brand Hierarchy

```
AUSTRUM (Parent / House Brand)
   │   — Burgundy identity, hospitality/lifestyle tone
   │
   └── UPKEEP (Sub-brand / Product)
          — Navy identity + inherited Maroon accent
          — "by Austrum" endorsement always visible
```

**Rules:**
- **Logo lockup:** "UpKeep" is always dominant (larger, primary color). "by Austrum" is always present but secondary — smaller text, lighter weight, separated by thin maroon rule lines (per the supplied logo).
- **Endorsement placement:** Footer and auth screens must show the "by Austrum" lockup. Navbar may show "UpKeep" alone if space-constrained (mobile), but the full lockup is preferred wherever width allows.
- **Color ownership:** Navy = UpKeep's primary identity color (do not use for Austrum). Maroon = shared family accent — used sparingly in UpKeep (icons, dividers, highlights, "by Austrum" text) to signal lineage, never as a dominant UI color.
- **Naming convention in copy:** First reference on a page = "UpKeep by Austrum." Subsequent references = "UpKeep." Never shorten to "Austrum" alone when referring to this product.
- **Icon/favicon:** Use the house+tools mark on navy circle as the standalone app icon/favicon.

---

## 3. Color Palette

### Design rationale
Navy is UpKeep's signature (from the logo's circular badge). Maroon is retained as the Austrum-family accent — used for highlights, the "by Austrum" endorsement, and small linking details (dividers, icon accents, focus states on secondary actions). Light theme uses a cool, neutral off-white (distinct from Austrum's warm cream) to keep UpKeep feeling crisp and professional.

### CSS Variables — drop into `index.css`

```css
/* ── UpKeep Design Tokens — Light theme (default) ── */
:root {
  --bg:            #F4F7F9;   /* cool off-white */
  --card:          #FFFFFF;
  --text:          #102A37;   /* deep navy-charcoal */
  --muted:         #5C7282;

  --primary:       #0E4A63;   /* UpKeep Navy */
  --primary-hover: #15607F;
  --primary-dark:  #08354A;   /* exact logo navy — use for footers, nav bg */

  --accent:        #7E2037;   /* Austrum Maroon (inherited, logo tools color) */
  --accent-hover:  #97304B;

  --blush:         #F0DCE1;   /* light maroon tint, replaces Austrum's pink blush */
  --border:        #E1E7EA;
}

/* ── UpKeep Design Tokens — Dark theme ── */
.dark {
  --bg:            #081B26;
  --card:          #0F3344;
  --text:          #E8F1F5;
  --muted:         #93A8B5;

  --primary:       #1C7A9C;
  --primary-hover: #2A93B8;
  --primary-dark:  #08354A;

  --accent:        #C8536B;
  --accent-hover:  #DA7589;

  --blush:         #3A2229;
  --border:        #1B4456;
}
```

### Tailwind config additions

```js
colors: {
  bg: "var(--bg)", card: "var(--card)", text: "var(--text)", muted: "var(--muted)",
  primary: { DEFAULT: "var(--primary)", hover: "var(--primary-hover)", dark: "var(--primary-dark)" },
  accent:  { DEFAULT: "var(--accent)",  hover: "var(--accent-hover)" },
  blush:   "var(--blush)",
  border:  "var(--border)",
  navy:    { DEFAULT: "#0E4A63", dark: "#08354A", light: "#1C7A9C" },
  maroon:  { DEFAULT: "#7E2037", light: "#97304B" },
}
```

### Usage rules
- **Navy** = primary actions, navbar, links, focus rings, active states, icons in their default state.
- **Maroon/accent** = secondary emphasis only: "by Austrum" text, divider rules, badge accents, occasional icon highlight, hover states on tertiary elements. **Cap at ~10% of any screen's color area.**
- **White/house silhouette equivalent** = use `--card` and `--text` for content surfaces; never place navy-on-navy or maroon-on-maroon text.
- Status colors (success/error/warning/info) follow Tailwind defaults (`emerald`, `red`, `amber`, `blue`) as already used in the Austrum codebase — do not redefine these for UpKeep.

---

## 4. Typography System

**Font family:** **Sora** for everything — headings, body, UI, navigation, buttons, forms. (Playfair Display is **not** used in UpKeep; it stays an Austrum-parent-only typeface.)

```css
fontFamily: {
  sans: ["Sora", "Inter", "sans-serif"],
}
```

### Scale & usage

| Role | Class pattern | Weight | Notes |
|---|---|---|---|
| Page hero / H1 | `text-3xl md:text-5xl font-bold` | 700 | `letter-spacing: -0.02em` |
| Section heading / H2 | `text-2xl md:text-3xl font-bold` | 700 | |
| Card title / H3 | `text-lg font-semibold` | 600 | |
| Body | `text-sm md:text-base` | 400 | `text-text` |
| Muted / supporting text | `text-sm` | 400 | `text-muted` |
| Nav brand wordmark | `.upkeep-brand` (see below) | 700 | matches logo wordmark weight |
| Label / overline | `text-xs font-semibold uppercase tracking-widest` | 600 | section labels, badges |
| Button text | `text-sm font-bold` | 700 | |

```css
.upkeep-brand {
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.upkeep-tagline {
  font-family: 'Sora', sans-serif;
  font-weight: 400;
  letter-spacing: 0;
  color: var(--accent); /* maroon, echoes "by Austrum" in logo */
}
```

---

## 5. Button Styles

Base shape language inherited from Austrum (`rounded-xl`/`rounded-full`, bold text, lift-on-hover), recolored to navy/maroon.

```css
/* Primary — main CTAs (Book Now, Confirm, Sign Up) */
.btn-primary {
  @apply inline-flex items-center justify-center gap-2
    px-6 py-3 rounded-xl
    bg-primary hover:bg-primary-hover
    text-white text-sm font-bold
    transition-all duration-200
    hover:-translate-y-0.5
    shadow-md
    focus:outline-none focus:ring-2 focus:ring-primary/30
    disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0;
  box-shadow: 0 4px 14px rgba(14, 74, 99, 0.25); /* navy glow */
}

/* Secondary — outlined, for "View Services", "Cancel" */
.btn-secondary {
  @apply inline-flex items-center justify-center gap-2
    px-6 py-3 rounded-xl
    bg-bg text-text font-semibold text-sm
    border border-border
    hover:bg-card hover:-translate-y-0.5
    transition-all duration-200;
}

/* Accent — rare, high-emphasis lineage moments (e.g. "Powered by Austrum" CTA) */
.btn-accent {
  @apply inline-flex items-center justify-center gap-2
    px-6 py-3 rounded-full
    bg-accent hover:bg-accent-hover
    text-white text-sm font-bold
    transition-all duration-200 hover:-translate-y-0.5
    shadow-md;
}

/* Ghost / nav links */
.btn-ghost {
  @apply text-sm font-medium text-white/80 hover:text-white
    hover:bg-white/10 px-3.5 py-2 rounded-xl transition-all;
}
```

**Rules:**
- One primary (navy) CTA per view/section max.
- `btn-accent` (maroon) is for rare lineage/brand moments only — not general secondary actions. Default secondary = `btn-secondary`.
- All buttons: `rounded-xl` (rectangular contexts) or `rounded-full` (pill CTAs in heroes/footers), never sharp corners.

---

## 6. Card Styles

```css
.card {
  @apply bg-card rounded-2xl border border-border;
}
.card-shadow       { box-shadow: 0 2px 12px rgba(8, 53, 74, 0.06); }
.card-shadow-hover { box-shadow: 0 8px 32px rgba(8, 53, 74, 0.12); }

/* Service / feature card */
.card-service {
  @apply card card-shadow p-6 transition-all duration-200
    hover:card-shadow-hover hover:-translate-y-1 hover:border-primary/20;
}

/* Stat / highlight card */
.card-stat {
  @apply card card-shadow p-5 text-center;
}

/* Booking / status card — left accent bar denotes status */
.card-booking {
  @apply card card-shadow p-5 border-l-4;
  /* status colors via Tailwind: border-l-emerald-500 (confirmed),
     border-l-amber-500 (pending), border-l-red-400 (cancelled) */
}
```

**Rules:**
- Default radius: `rounded-2xl` for cards, `rounded-xl` for inputs/buttons/nested elements — maintain this ratio for visual hierarchy.
- Card icons use navy (`text-primary`) by default; use the service-category colors already defined in `constants/services.js` for category-specific cards (unchanged from Austrum — do not recolor those).
- Maroon accent on cards limited to: small corner badges (e.g. "Verified"), thin top/left border on a single "featured" card, or icon backgrounds for "Austrum Promise"-type trust callouts.

---

## 7. Form Styles

```css
.input-base {
  @apply w-full px-4 py-3 rounded-xl border border-border text-sm
    text-text bg-bg hover:bg-card
    placeholder:text-muted
    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
    transition-all duration-200;
}

/* Inputs on dark/navy surfaces (auth screens, hero overlays) */
.input-on-dark {
  @apply w-full px-4 py-3 rounded-xl text-sm bg-white/10 backdrop-blur-sm text-white
    placeholder:text-white/35 border border-white/20
    focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60
    transition-all duration-200;
}

.form-label {
  @apply text-sm font-medium text-text mb-1.5 block; /* text-white/80 on dark surfaces */
}

.form-error {
  @apply text-xs text-red-500 mt-1; /* text-red-300 on dark surfaces */
}
```

**Rules:**
- Light-surface forms (settings, profile, booking modals): `.input-base`, navy focus ring.
- Dark/overlay forms (auth pages over hero images): `.input-on-dark`, **maroon focus ring** (`accent`) — this is one of the few places maroon is the dominant interactive color, deliberately echoing the "by Austrum" warmth on first-touch screens (login/signup).
- All inputs: `rounded-xl`, never smaller radius than buttons in the same context.

---

## 8. Navigation Guidelines

**Navbar:**
- Background: `bg-primary` (Navy `#0E4A63`), sticky top, subtle navy shadow: `box-shadow: 0 2px 20px rgba(8,53,74,0.4)`.
- Logo lockup: house+tools mark (40–44px circular) + `.upkeep-brand` wordmark "UpKeep" in white. On wider viewports, show "by Austrum" in small maroon-tinted text beneath/beside it.
- Active nav link: `bg-white/15 text-white font-semibold`. Inactive: `text-white/70 hover:text-white hover:bg-white/10`.
- Primary CTA in nav (e.g. "Book Now" / "Sign Up"): pill-shaped, `bg-blush text-primary` (light maroon tint background, navy text) — mirrors Austrum's blush-CTA pattern but recolored to the UpKeep palette.
- Avatar/user menu: circular, `bg-blush text-primary`, maroon-tinted border — small consistent touch of the accent color in persistent UI.
- Mobile: hamburger menu, same color logic, full-width nav links with icons (lucide-react, `strokeWidth={2.5}`, `size={14–16}`).

**Breadcrumbs / sub-nav (admin or multi-step booking flows):**
- Use `text-muted` for inactive steps, `text-primary font-semibold` for current step, maroon accent dot/line only as a progress indicator (not text color).

---

## 9. Footer Guidelines

- Background: `bg-primary-dark` (`#08354A`, exact logo navy) — text default `text-white/45`, headings `text-white`, links hover to `text-accent` (maroon) — replicating Austrum's blush-hover-link pattern but with maroon.
- **Required content blocks:**
  1. **Brand column:** house+tools mark + "UpKeep" wordmark + "by Austrum" tagline (maroon-tinted, small) + one-line description ("Reliable home maintenance, on your schedule — by Austrum.")
  2. **Quick Links** (Services, My Bookings, Login/Sign Up)
  3. **Contact** (city, phone, email — icons in maroon/accent at 60% opacity, matching Austrum's icon-accent pattern)
- **Endorsement line:** Footer must always carry a visible "by Austrum" mark — this is the primary place the parent relationship is reinforced for trust.
- Bottom bar (if present): copyright + "Part of the Austrum family" microcopy, centered, `text-white/30 text-xs`.

---

## 10. Brand Voice Guidelines

**Voice attributes:** Clear · Reassuring · Direct · Slightly warm (never cold/corporate)

**Do:**
- Use plain, everyday language about home problems ("leaky tap," "no hot water," "switch not working") rather than jargon.
- Lead with outcomes and reassurance: "Verified expert," "Done right," "We'll make it right."
- Use short, confident sentences. Active voice. Second person ("you," "your home").
- Reference Nashik / local context where relevant — UpKeep is locally rooted.
- When referencing the parent brand, use phrasing like *"backed by Austrum,"* *"part of the Austrum family,"* or *"the Austrum standard"* — confidence-building, not promotional.

**Don't:**
- Don't use hype language ("revolutionary," "game-changing," "disrupting home services").
- Don't be cutesy or jokey about home problems — people are often stressed (broken AC, no water). Tone should be calm and competent, not chirpy.
- Don't over-explain the Austrum relationship in body copy — one clear mention (nav/footer/about) is enough; don't repeat it in every sentence.
- Avoid superlatives without backing ("the best," "#1") — prefer specific, verifiable claims ("background-checked," "100% satisfaction guarantee," "same-day booking").

**Sample microcopy patterns (for consistency):**
- Empty state: "No bookings yet. When you book a service, it'll show up here."
- Success toast: "Booking confirmed — we'll see you then."
- Error toast: "Something went wrong on our end. Please try again in a moment."
- CTA copy: "Book a Service," "Find a Pro," "View My Bookings" — verb-first, concrete.
- Trust copy: "Verified Professionals," "Transparent Pricing," "100% Satisfaction Guarantee" (existing Austrum WHY_US copy is on-brand for UpKeep — reuse as-is).

---

## Quick Reference — Token Cheat Sheet

| Token | Light | Dark | Use for |
|---|---|---|---|
| `--primary` | `#0E4A63` | `#1C7A9C` | Buttons, links, nav, focus |
| `--primary-dark` | `#08354A` | `#08354A` | Navbar/footer bg, nav text on light |
| `--accent` | `#7E2037` | `#C8536B` | "by Austrum," dividers, badges (≤10% of UI) |
| `--blush` | `#F0DCE1` | `#3A2229` | CTA pill bg, avatar bg, soft highlights |
| `--bg` | `#F4F7F9` | `#081B26` | Page background |
| `--card` | `#FFFFFF` | `#0F3344` | Cards, inputs (light), modals |
| `--text` | `#102A37` | `#E8F1F5` | Primary text |
| `--muted` | `#5C7282` | `#93A8B5` | Secondary text |
| `--border` | `#E1E7EA` | `#1B4456` | Borders, dividers |

**Font:** Sora (all weights 400/500/600/700)
**Radius scale:** `rounded-xl` (12px) for buttons/inputs/nav items, `rounded-2xl` (16px) for cards, `rounded-full` for pills/avatars/hero CTAs
**Shadow scale:** `card-shadow` (resting), `card-shadow-hover` (elevated), navy glow on primary buttons (`rgba(14,74,99,0.25)`)
