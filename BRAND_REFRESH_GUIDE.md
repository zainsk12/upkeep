# BRAND_REFRESH_GUIDE.md — UpKeep by Austrum

**Status:** Visual Rebrand v2.0 — Strategy only. Nothing in this document has been implemented.
**Companion document:** `COLOR_SYSTEM.md` (full token ramps, hex values, contrast ratios)
**Scope:** Customer-facing UpKeep web app (client). Tokens are designed to extend cleanly to the admin console in a later phase.
**Constraints honored:** Hero image asset (`hero.jpg`) is unchanged. Existing functionality, layout, and component structure are unchanged. This is a visual-only pass: color, type, and surface treatment.

---

## 0. Why This Document Exists

The previous rebranding effort (Modules 4A–4E) did the content work well — "UpKeep," "by Austrum," and the new logo are correctly placed across navbar, hero, footer, auth screens, and metadata. But the visual layer was deliberately deferred, and the deferred audit confirmed what the brief already suspected: the live CSS tokens are still `#6B0F2A` Austrum burgundy end to end — navbar background, footer background, every primary button, every focus ring, the scrollbar, and the hero/auth gradient overlays. A user reading the copy sees "UpKeep." A user reading the color sees "Austrum." This guide closes that gap.

It also makes one decision the previous brand guide didn't fully commit to: rather than giving UpKeep its own primary color *while keeping maroon around as a "shared family accent,"* this guide removes burgundy from the live UI entirely. Partial removal is how it ended up everywhere in the first place — once a color token exists in the system, every future component reaches for it. A clean break is simpler to enforce and impossible to accidentally violate.

---

## 0.1 Relationship to `BRAND_GUIDE.md` v1.0

This guide **keeps** v1.0's best decision and **overrides** its weakest one:

- **Kept:** Navy (`#0E4A63`, sampled from the logo badge) as UpKeep's primary identity color. Sora as the single typeface. The basic radius/shadow grammar (`rounded-xl` for controls, `rounded-2xl` for cards).
- **Overridden:** v1.0 §3's "maroon as inherited accent, capped at ~10% of screen area" is retired. Maroon is replaced by a new, unrelated accent hue (copper — see §3 below) so there is no burgundy-family color anywhere in the live UI, at any cap percentage.

Everywhere this guide is silent on a detail v1.0 already covered correctly (e.g., the brand-hierarchy rules in v1.0 §2, or the "UpKeep first reference, then shorten" copy convention), v1.0 still applies. This document only changes color and the visual specifics built on top of it.

---

## 1. Primary Colors

**Harbor Navy**, sampled from the logo badge: `#0E4A63` (DEFAULT), with a hover at `#15607F` and a darker `#08354A` for navbar/footer surfaces. Full ramp and contrast data live in `COLOR_SYSTEM.md` §1.

Navy carries the weight of the brand: primary buttons, links, active nav/tab states, focus rings, default icon color, the app icon/favicon. It's the one color a user should associate with "this is UpKeep" within the first second of looking at any screen — which is exactly the job burgundy is currently and incorrectly doing.

---

## 2. Secondary Colors

**Graphite Slate** — a desaturated cool grey-blue: `#3F4F5C` (DEFAULT), tinting down to `#5C7282` for muted text and up to `#25313A` for pressed states. Full ramp in `COLOR_SYSTEM.md` §2.

This tier didn't really exist in v1.0 — there was navy, and then there was maroon for "everything else that needed emphasis." Graphite gives the UI a genuine second tonal layer (secondary buttons, less-prominent headings, structural chrome like dividers and inactive tab labels) that's clearly part of the same navy family rather than a competing brand color. It's the tier that should absorb most of what maroon used to get reached for out of habit.

---

## 3. Accent Colors

**Workshop Copper** — `#C16A21` for decorative use (icons, underlines, illustration fills), `#9C5418` for any solid fill carrying white text, and a pale tint `#FBE7D3` ("Sand") for soft backgrounds like CTA pills and avatar circles. Full ramp and the decorative-vs-text-safe split in `COLOR_SYSTEM.md` §3.

Copper takes over maroon's *function* — the one warm, attention-getting color in an otherwise cool, calm palette — without inheriting its *hue family*, so there's no visual ambiguity about whether it's "almost burgundy." It also fits the brand pillars already established in v1.0 (craft, trade competence, tools): copper reads as workshop/hardware-adjacent in a way maroon never did — maroon's resonance was always borrowed from Austrum's hospitality tone, not earned from UpKeep's own positioning.

**Usage discipline:** target ≤8% of any screen's visible color area — one badge, one rating-star fill, one "Verified" corner marker, the single nav CTA pill. If a screen has copper in three or four different components, that's the system regressing toward the same over-reach that happened with maroon.

---

## 4. Background Colors

| Surface | Light | Dark |
|---|---|---|
| Page background | `#F3F6F8` (cool, slightly blue-grey) | `#081821` |
| Card / modal / input | `#FFFFFF` | `#102531` |

Full table including text/muted/border tokens in `COLOR_SYSTEM.md` §4.

Austrum's background is a warm cream. UpKeep's is a cool off-white — close enough in *lightness* that the overall app still feels calm and uncluttered, but different enough in *temperature* that the two products read as siblings with distinct personalities rather than the same shell with a different logo. This separation matters most on pages with large background areas (landing page sections, settings, bookings list) where background color is doing a lot of the brand-signaling work even when no buttons or cards are in view.

---

## 5. Card Styles

Structure stays as already established (radius and shadow grammar unchanged); only the color references inside each card pattern change.

- **Base card:** white (light) / `#102531` (dark) surface, `rounded-2xl`, hairline `border` token, soft resting shadow tinted navy instead of black/burgundy — `rgba(8, 53, 74, 0.06)` resting, `rgba(8, 53, 74, 0.12)` on hover. The shift from a near-black or burgundy-tinted shadow to a navy-tinted one is subtle but reinforces brand color even in negative space.
- **Service / feature card:** on hover, lift `-translate-y-1` and brighten the border toward `primary/20` — unchanged behavior, navy instead of maroon-adjacent border tint.
- **Stat / highlight card:** centered content, same base card treatment; numerals in `text-primary`, label in `muted`.
- **Booking / status card:** left accent bar in the unchanged semantic colors (emerald/amber/red) — these were never part of the burgundy problem and stay exactly as they are today.
- **Featured / "Verified Pro" card:** this is the one card type that earns a touch of copper — a thin top border or a small corner badge in `accent-700`, capped at one such card per view. This directly replaces the old "maroon corner badge" pattern from v1.0 §6 with the new accent.

---

## 6. Button Styles

| Style | Fill | Text | Use |
|---|---|---|---|
| Primary | `primary-600`, hover `primary-500` | White | One per view/section, main CTA |
| Secondary | Outline or `secondary-100` fill, `secondary-600` border/text | `secondary-600` | Secondary actions ("Cancel," "View Details") |
| Accent (rare) | `accent-700` | White | Reserve for genuinely rare brand moments — not a general secondary style |
| Ghost / nav link | Transparent, `white/70–100` on navy surfaces | — | In-nav links, tertiary actions |

Rules carried forward from v1.0 unchanged: one primary CTA per view max; `rounded-xl` for rectangular contexts, `rounded-full` for pill CTAs in heroes/footers; disabled state at reduced opacity with no pointer events. The only change is the underlying color references — primary moves from burgundy to navy (already partly true in the deferred token system) and the rare "brand accent" button moves from maroon to `accent-700` copper, with the contrast-safe shade specifically chosen so white button labels stay readable.

---

## 7. Navbar Styling

- **Background:** `primary-800` (`#08354A`, exact logo navy), sticky, with a navy-tinted shadow (`rgba(8, 53, 74, 0.4)`) replacing the current hardcoded burgundy shadow.
- **Logo lockup:** unchanged placement and asset — circular mark + "UpKeep" wordmark in white, "by Austrum" shown at reduced opacity/size where width allows.
- **Active link:** `bg-white/15 text-white font-semibold`. **Inactive:** `text-white/70`, hover `text-white`. Unchanged from today's pattern — it was never burgundy-dependent.
- **Primary nav CTA ("Book Now"/"Sign Up"):** pill-shaped, `accent-100` ("Sand") background with `primary-800` text — this is the one nav element that gets the copper-family touch (via its pale tint, not the saturated copper itself), replacing the old blush-pill pattern with a warm tint that's no longer in the burgundy family.
- **Avatar / user menu:** circular, `secondary-100` background with `primary-700` text/border — deliberately *not* copper, so the accent color isn't repeated twice in the same persistent UI region.
- **Mobile:** hamburger menu, same color logic, full-width stacked links with icons — structurally unchanged.

---

## 8. Footer Styling

- **Background:** `primary-900` (`#031927`, exact logo-halo navy) — the deepest, most saturated brand surface in the app. Default text `white/45`, headings `white`, link hover → `accent-300` (a visible but non-text-safe-constrained shade, fine for link-sized text at this contrast level).
- **Brand column:** logo mark + "UpKeep" wordmark + "by Austrum" tagline, unchanged content, same asset.
- **Endorsement line:** the "by Austrum" mark stays the primary place the parent relationship is reinforced — this is carried by *text and the logo lockup*, not by reintroducing burgundy as a chromatic cue. That's the core move of this whole rebrand: the lineage is told through words and the (unchanged) logo artwork, not through shared paint.
- **Bottom bar:** copyright + "Part of the Austrum family" microcopy, `white/30`, unchanged.

*Implementation note, not a design decision:* the prior audit flagged the footer `<img>` still pointing at the old `/logo.jpg` asset (CF-01) — a content-rebrand bug, not a color one. It's outside this document's scope but should be fixed in the same pass as the token migration, since both touch the footer.

---

## 9. Typography Hierarchy

Single typeface, as v1.0 already specified — and this guide makes it absolute: **Playfair Display is fully retired from every UpKeep surface**, including the hero H1, section H2s, and the Services page heading that currently still use it. Sora carries the entire hierarchy on weight and size alone, which is enough range to do the job (Sora ships weights from ExtraLight through ExtraBold).

| Level | Size (desktop) | Weight | Notes |
|---|---|---|---|
| Hero H1 | 44–56px | 800 (ExtraBold) | Tight letter-spacing (-0.02em); this is where Sora's heaviest weight replaces the visual punch Playfair was providing |
| Section H2 | 32–36px | 700 | -0.01em |
| Card / subsection H3 | 20–22px | 600 | |
| Body | 15–16px | 400 | 1.6 line-height for readability |
| Small / meta | 13px | 500 | Used for timestamps, labels, helper text |
| Nav / button label | 14–15px | 600 | Slightly tighter line-height, no italics anywhere in the system |

Color pairing: headings in `text` (near-navy-black), body in `text`, secondary/meta copy in `muted`. No heading should ever render in raw `primary` at large sizes purely for decoration — navy is reserved for interactive and structural elements, not for large display text, so it doesn't compete with itself across a page.

---

## 10. Mobile Considerations

- **Navigation:** hamburger pattern stays; the nav CTA pill can shrink to an icon-only state below ~380px width rather than disappearing, so the primary action is never lost.
- **Touch targets:** all interactive elements (buttons, nav items, card actions) maintain a minimum 44×44px hit area regardless of visual size — this is a carry-forward standard, not new, but worth re-stating since color changes shouldn't be allowed to also shrink targets during implementation.
- **Type scale:** hero H1 steps down to roughly 32–36px on mobile; body text stays at 15–16px (don't shrink body copy below that for legibility).
- **Contrast at small sizes:** `muted` text (`#5C7282`) sits at ~5:1 against the light background, which is fine for body-size meta text but worth re-checking against any *smaller-than-13px* mobile labels — if anything dips below 13px, prefer `text` over `muted` rather than risk marginal contrast at small scale.
- **Hero/auth overlay legibility:** mobile crops the hero image tighter, which can shift how much of the busy floral background shows through. The overlay strategy in §11 below should be opacity-tested specifically at mobile crop ratios, not just desktop.
- **Footer:** collapse the three-column layout to a single stacked column with the brand block first, consistent with the existing responsive pattern — no new behavior, just confirming the new colors hold up at full-width stacked contrast.
- **Sticky elements:** if a sticky "Book Now" bottom bar is ever introduced for the booking flow, it should use the `primary-800` navbar treatment, not the copper accent — keep copper rare even under mobile space pressure, where the temptation to reach for "the colorful one" for visibility is highest.

---

## 11. Hero Image & Logo — Special Constraints

Two assets are explicitly out of scope for replacement, and both interact with this color system in ways worth naming directly rather than glossing over.

**The hero image (`hero.jpg`):** worth being transparent about what this file actually is — it's a pink/burgundy-toned forest photo with Austrum's old monogram "A" wreath mark composited directly into it, not a neutral or UpKeep-branded photo. Because the photo itself is fixed, the redesign has to happen entirely in the **overlay**, which today is a hardcoded `rgba(107,15,42,0.85)` burgundy gradient — itself a banned value under this system, separate from the underlying image.

Recommended direction: a navy-to-near-black duotone overlay (`primary-900` → `#0A0A0A`-range charcoal, ~0.88–0.92 opacity) strong enough to substantially neutralize the photo's pink/burgundy cast rather than blend with it. This is a CSS gradient change only — the image file itself never changes, satisfying the constraint, while ensuring the *rendered* hero no longer visually reads as a burgundy moment.

One thing worth flagging for awareness, not action: the visible "A" monogram inside the unchanged photo is a residual Austrum mark on UpKeep's own hero section. The overlay treatment above will reduce its visual prominence but can't fully erase it without touching the asset. If a future phase ever revisits hero imagery, this is the item to prioritize — but it's explicitly out of scope here per the brief.

**The logo (`upkeep_logo.png`):** stays exactly as-is, including its internal burgundy tool icons — per `COLOR_SYSTEM.md` §9, that's the one place the color is permitted to live, precisely because it's sealed inside a static image rather than exposed as a reusable token.

---

## 12. Rollout Sequencing (Reference Only — Not an Implementation Plan)

When this strategy moves to implementation, the lowest-risk order is roughly: (1) swap the core CSS variables and Tailwind literal palette, since nearly everything else inherits from those tokens; (2) fix the hardcoded `rgba(107,15,42,...)` instances called out in the prior audit (navbar shadow, hero/auth overlays, scrollbar, button shadow) since these don't inherit from variables and won't be caught by step 1; (3) retire `.landing-heading`'s Playfair Display reference; (4) introduce the new secondary and accent tokens where v1.0's maroon-based patterns currently sit (CTA pills, featured badges, avatar backgrounds); (5) mobile QA pass against §10 above. This sequencing isn't a commitment to *when* implementation happens — just a note for whoever picks this up next on where the highest-leverage, lowest-regression-risk first step is.

---

## At a Glance — Before / After

| Aspect | Current (Austrum-era, still live) | This Guide (UpKeep v2.0) |
|---|---|---|
| Primary UI color | Burgundy `#6B0F2A` | Harbor Navy `#0E4A63` |
| Secondary tier | None (maroon did double duty) | Graphite Slate `#3F4F5C` |
| Accent color | Maroon/blush `#7E2037` / `#E8A4AF` | Workshop Copper `#C16A21` / `#9C5418`, tint `#FBE7D3` |
| Page background | Warm cream `#F4F1EF` | Cool off-white `#F3F6F8` |
| Headings | Playfair Display (serif) | Sora ExtraBold (sans, same family as body) |
| Burgundy's only home | Everywhere | Inside the logo artwork only |
