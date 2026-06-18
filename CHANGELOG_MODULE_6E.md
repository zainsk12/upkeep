# CHANGELOG_MODULE_6E.md — Hero Redesign
**Module:** 6E — Hero Redesign
**Based on:** `HERO_REDESIGN_PLAN.md`
**Constraint summary:** `hero.jpg` unchanged · logo assets unchanged · no new routes · no functional changes to booking flow

---

## Files Modified

| File | Change type |
|---|---|
| `client/src/pages/LandingPage.jsx` | Hero section full replacement |
| `client/src/index.css` | `.animate-in` fill-mode + `prefers-reduced-motion` rule |

---

## 1. `client/src/pages/LandingPage.jsx`

### 1.1 Hero section — structural change

**Before:** `<section>` used `grid lg:grid-cols-2` with content on the left and a stats grid on the right.

**After:** `<section className="relative flex flex-col overflow-hidden min-h-[85svh] sm:min-h-[90vh]">` — flex column layout: content area in the center, stat strip pinned below it. Follows the 8-layer information architecture hierarchy defined in `HERO_REDESIGN_PLAN.md §2`.

### 1.2 Background overlay

**Before:** `rgba(107,15,42,0.85)` single-color overlay (burgundy family — legacy Austrum).

**After:** Directional navy-charcoal duotone scrim per plan §8:
```
linear-gradient(110deg,
  rgba(5,15,25,0.96)  0%,    /* near-black — darkest over content column */
  rgba(8,53,74,0.91) 55%,    /* Harbor Navy primary-dark */
  rgba(8,53,74,0.83) 100%    /* slightly lighter toward image edge */
)
```
Rationale: color-neutralizes the photo's original burgundy/floral tones so the hero reads as a deep navy backdrop, without touching `hero.jpg`.

### 1.3 Brand lockup (Layer 2)

New element — staggered `animationDelay: "0ms"`:
- UpKeep logo mark (`/upkeep_logo.png`, `aria-hidden="true"`, 36×36 / 44×44 px)
- "UpKeep" wordmark — `text-xl sm:text-2xl font-bold nav-brand`
- "by Austrum" glass badge — `bg-white/[0.10] border border-white/[0.18] backdrop-blur-sm`, `text-[10px] uppercase tracking-widest` — glassmorphism per plan §10

### 1.4 Eyebrow line (Layer 3)

New element — `hidden sm:block`, `animationDelay: "70ms"`:
```
Home Services · Nashik, Maharashtra
```
`text-white/40 text-xs font-medium tracking-widest uppercase`
Collapsed on xs per plan §9 (eyebrow is "first to go" at narrow breakpoints).

### 1.5 Headline (Layer 4)

**Before:** "Premium Home Services, Done Right"

**After:** "The trusted way to keep your home running." — Headline option #4 from plan §3. Echoes the product name; avoids the unsubstantiated claims "premium" and "done right."

Typography: `text-[2.05rem] sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] tracking-tight landing-heading max-w-2xl` — `animationDelay: "140ms"`.

### 1.6 Subcopy (Layer 5)

**Before:** "Professional home services you can trust, right here in Nashik."

**After:** "Verified professionals, transparent pricing, and a satisfaction guarantee — backed by Austrum's standards." — Supporting copy option #1 from plan §4. Reinforces the parent-brand endorsement in body copy.

`text-white/60 text-sm sm:text-base leading-relaxed max-w-lg` — `animationDelay: "210ms"`.

### 1.7 Micro-trust row (Layer 6)

New element — immediately above CTAs, `animationDelay: "280ms"`:

| Icon | Label |
|---|---|
| `ShieldCheck` (emerald-400) | Verified Professionals |
| `BadgeCheck` (emerald-400) | Background-Checked |
| `ThumbsUp` (emerald-400) | 100% Satisfaction |

Three small inline badges, `flex flex-wrap gap-x-5 gap-y-2`, `text-white/55 text-xs font-medium`. No boxes or heavy borders — icons carry the visual weight per plan §6.

### 1.8 CTA cluster (Layer 7)

**Before:** Single primary button "Book Your Service" + a secondary "Get Started Free" → `/signup` (shown only on mobile).

**After:** Three elements per plan §5:

| Element | Breakpoint | Route | Style |
|---|---|---|---|
| "Book a Service" (primary) | All | `/services` | Sand fill (`bg-blush hover:bg-blush/85`), `text-primary-dark font-bold`, `rounded-full`, shadow |
| "View Services" (ghost) | `sm:` and up | `/services` | `bg-white/[0.08] border border-white/[0.20] backdrop-blur-sm`, `rounded-full` |
| "View Services" (text link) | `xs` only | `/services` | `sm:hidden text-white/50 hover:text-white/80` |

`animationDelay: "350ms"`. Secondary CTA collapses to plain text link on mobile per plan §9 to preserve vertical space above the fold.

### 1.9 Stat strip (Layer 8)

**Before:** `STATS` array of four equally-weighted boxed cards in a 2×2 grid.

**After:** Two responsive variants per plan §7:

**Desktop (`sm:` and up) — horizontal glass strip:**
- Container: `bg-white/[0.07] backdrop-blur-md border border-white/[0.12] rounded-2xl overflow-hidden`
- Dividers: `divide-x divide-white/[0.12]` (hairline per plan §10)
- Rating cell — featured: `text-3xl font-extrabold text-accent` (copper per plan §7 "sizing/hierarchy"), 5× `Star` icons (`text-amber-400 fill-amber-400`), "Average Rating" label + "10,000+ reviews" sub-line
- Three supporting stats at `text-2xl font-bold text-white`: "10,000+ Happy Homes", "500+ Verified Pros", "50+ Home Services"
- Cell hover: `hover:bg-white/[0.05] transition-colors duration-200`

**Mobile (`xs` only) — swipeable snap carousel:**
- `flex gap-2.5 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`
- Rating card: `w-[118px]`, copper `text-2xl font-extrabold text-accent`, 8px star icons
- Supporting cards: `w-[100px]`, `text-xl font-bold text-white`
- All cards: `bg-white/[0.10] backdrop-blur-md border border-white/[0.15] rounded-xl`

This eliminates the "CTA pushed below the fold" problem identified in plan §0 — the carousel adds no vertical height.

`animationDelay: "430ms"`.

### 1.10 Wave divider

SVG wave at `absolute bottom-0`, `fill="var(--bg)"` — transitions the hero into the page body without a hard edge. Unchanged from prior implementation.

### 1.11 New imports added to LandingPage.jsx

| Import | Source |
|---|---|
| `ShieldCheck` | `lucide-react` |
| `BadgeCheck` | `lucide-react` |
| `ThumbsUp` | `lucide-react` |
| `Star` | `lucide-react` |

### 1.12 Removed from LandingPage.jsx

| Removed | Reason |
|---|---|
| `const STATS = [...]` array | Replaced by inline stat strip per §7 |
| Old `eyebrowText`/badge pill | Replaced by brand lockup + plain eyebrow line |
| `grid lg:grid-cols-2` hero layout | Replaced by `flex flex-col` per plan §2 |
| `rgba(107,15,42,0.85)` overlay | Replaced by directional navy-charcoal gradient |

---

## 2. `client/src/index.css`

### 2.1 `.animate-in` fill-mode

**Before:** `animation: fadeInUp 0.22s ease-out forwards;`

**After:** `animation: fadeInUp 0.22s ease-out both;`

`both` = applies `from` state (opacity:0, translateY:6px) during the animation delay period, preventing a flash-of-content before each staggered item fires. `forwards` only applies fill after the animation ends, not before.

### 2.2 `prefers-reduced-motion` rule

Added per plan §10 ("respect `prefers-reduced-motion` throughout"):

```css
@media (prefers-reduced-motion: reduce) {
  .animate-in {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

Users with vestibular disorders or motion sensitivity get static render — no fade, no translate — at first paint.

---

## 3. Hard Constraints — Verified Clean

| Constraint | Status |
|---|---|
| `hero.jpg` not modified | ✅ File untouched — only CSS overlay above it changed |
| Logo assets not modified | ✅ `/upkeep_logo.png` referenced only via `src` attribute, asset itself unchanged |
| No new routes | ✅ All `<Link to="...">` destinations unchanged (`/services`, `/signup`) |
| No API calls changed | ✅ |
| No business logic changed | ✅ |
| No auth flows changed | ✅ |
| No booking flow changed | ✅ |

---

## 4. Responsive Behavior Summary

| Breakpoint | Eyebrow | Secondary CTA | Stat strip | Hero min-height |
|---|---|---|---|---|
| `< 640px` (xs) | Hidden | Plain text link | Swipeable carousel | `85svh` |
| `≥ 640px` (sm+) | Visible | Ghost button | Horizontal glass strip | `90vh` |
| `≥ 1024px` (lg) | Visible | Ghost button | Horizontal glass strip (max-w-5xl) | `90vh` |

Governing rule per plan §9: as viewport shrinks, hero sheds *proof* before it sheds *brand* — lockup, headline, and primary CTA stay above the fold at every breakpoint.
