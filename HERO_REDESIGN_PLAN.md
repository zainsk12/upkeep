# HERO_REDESIGN_PLAN.md — UpKeep by Austrum

**Status:** Strategy only — no code, no file changes, no implementation.
**Builds on:** `BRAND_REFRESH_GUIDE.md` §11 (brand lockup hierarchy) and `COLOR_SYSTEM.md` (token reference). This document goes deeper into copy, conversion architecture, the stat cards, the overlay, and responsive behavior — the layers §11 didn't fully cover.
**Hard constraints honored throughout:** `hero.jpg` unchanged. Logo asset unchanged. No new routes. No functional changes — booking flow, links, and destinations stay exactly as they are today.

---

## 0. Current State Audit

**Hero weaknesses.** The headline — "Premium Home Services, Done Right" — could belong to almost any home-services product in any city; it asserts quality ("premium," "done right") instead of demonstrating it. The four stat cards are styled like a generic admin dashboard widget that got transplanted into a hero, not a piece of brand storytelling. And the hero's compositional center of gravity is still the old background photo: a dense, busy forest image with the legacy Austrum "A" monogram visible through the overlay, which is doing more visual work than anything UpKeep-specific.

**Brand alignment issues.** The color tokens are correct (Harbor Navy, Copper, the Sand CTA) but color alone doesn't make something feel like a distinct brand — composition does. Right now the hero would still read as "a home services company" with the colors swapped, not specifically as "UpKeep, backed by Austrum." The parent endorsement is present but under-weighted (addressed in the prior brand-lockup work); the *product* story — what makes UpKeep specifically trustworthy and premium — isn't told anywhere in the hero at all.

**UX issues.** There is exactly one path forward (the primary CTA) and no lower-commitment option for a visitor who isn't ready to book yet — a meaningful share of first-time visitors on a local services platform want to browse before they commit, and right now they have nowhere to go but away. The stat cards also compete with the headline for attention rather than supporting it, since they're roughly the same visual weight.

**Conversion issues.** Trust signals are backloaded into stat cards that sit visually distant from the CTA, so by the time a visitor reaches the moment of deciding whether to click "Book a Service," the reassurance they just read is already out of short-term visual memory. Good conversion design puts a thin layer of trust *immediately adjacent* to the action, not several inches above it.

**Mobile issues.** Four stat cards in a 2×2 grid consume a large share of vertical space on a phone, frequently pushing the CTA below the fold on first paint — the single worst outcome for a hero on a conversion-driven page. The current design doesn't appear to have a mobile-specific content strategy; it's the desktop layout compressed, not redesigned.

**Visual hierarchy issues.** Eyebrow pill, "by Austrum" caption, headline, subcopy, CTA, and four equally-weighted stat cards are all competing at similar visual volumes. Nothing tells the eye "look here first, then here, then here" — which is the textbook definition of weak hierarchy, regardless of how good the individual colors and components look in isolation.

---

## 1. Hero Design Goals

1. Make UpKeep read as a specific, premium, trustworthy brand — not a generic local-services template — within the first three seconds.
2. Give every element exactly one job, and make sure no two elements are fighting for the same attention budget.
3. Move trust from "a stat block you read eventually" to "a felt sense, reinforced at the exact moment of decision."
4. Give every visitor a next step, not just the visitors ready to book right now.
5. Visually neutralize the legacy photo's color and composition without touching the file itself.
6. Design mobile as its own composition with its own priorities — not a squeezed desktop layout.

---

## 2. Information Architecture

Order, top to bottom, and the single job each layer does:

| Order | Element | Job |
|---|---|---|
| 1 | Background photo + overlay (foundation, not content) | Sets mood; gets out of the way of everything on top of it |
| 2 | Brand lockup — logo mark + "UpKeep" + "by Austrum" badge | Identity: who is this, and who backs it |
| 3 | Eyebrow line (short, plain — category/location) | Context: what kind of product, where |
| 4 | Headline | Emotional + functional promise |
| 5 | Subcopy (one to two lines) | Makes the promise concrete |
| 6 | Micro-trust row (2–3 small inline badges) | Reduces last-second doubt, sits right before the ask |
| 7 | CTA cluster — primary + secondary | The ask, with an off-ramp for not-yet-ready visitors |
| 8 | Stat proof strip | Reinforces after the ask, for visitors who want more before scrolling on |

The logic: identity and promise come first (you can't trust a brand you don't recognize), concrete trust comes immediately before the action (that's where doubt peaks), and quantified proof comes after the action is visible (it's reinforcement, not a prerequisite — a visitor shouldn't have to read four statistics before they're allowed to see the button).

---

## 3. New Headline Concepts

| # | Headline | Direction | Best for |
|---|---|---|---|
| 1 | **"Your home, handled."** | Minimal, confident, ownership-style | Visitors who want speed and simplicity over detail |
| 2 | **"Home care you don't have to think about."** | Relief from a real pain point (mental load of home upkeep) | Emotionally resonant; differentiates from transactional competitors |
| 3 | **"Verified pros. Real fixes. No drama."** | Plainspoken, trust-first, on-voice with the existing "calm, competent" brand tone | Visitors who are skeptical of local-services marketplaces generally |
| 4 | **"The trusted way to keep your home running."** | Echoes the product name ("upkeep" = the act of keeping something running) without being cute about it | Strongest tie-in to brand name; good default recommendation |
| 5 | **"Nashik's homes, looked after properly."** | Local-first, craft/care emphasis | Strong if local pride/identity is a meaningful driver for this audience |

All five intentionally avoid the words "premium" and "done right" — claims like that are more persuasive when demonstrated by the trust layer and stat strip than asserted in the headline itself.

---

## 4. New Supporting Copy

| # | Supporting line | Pairs especially well with |
|---|---|---|
| 1 | "Verified professionals, transparent pricing, and a satisfaction guarantee — backed by Austrum's standards." | Headline #4 (parent endorsement reinforced in copy, not just the badge) |
| 2 | "From a leaky tap to a full home refresh, book a vetted local pro in under a minute." | Headline #1 (speed/simplicity pairing) |
| 3 | "Every UpKeep professional is background-checked, rated, and held to the Austrum standard of care." | Headline #3 (credential-forward, matches "no drama" tone) |
| 4 | "No call centers, no guesswork — just real help, on your schedule." | Headline #2 (relief/anti-friction pairing) |
| 5 | "Nashik's most-booked home services platform, trusted by 10,000+ households." | Headline #5 (social-proof-led, local pairing) |

---

## 5. CTA Strategy

**Primary CTA: "Book a Service."** Kept as-is rather than reworded, deliberately — it already routes to the existing booking flow and changing the verb risks implying a functional change that isn't happening. The redesign's job here is visual, not verbal: solid Sand-tint fill, navy text, full weight as the single most prominent interactive element in the hero, with nothing else competing at the same visual volume.

**Secondary CTA: "View Services" (outline/ghost style, linking to the existing Services page).** This is the addition that matters most for conversion. Today's hero forces a binary of "book now" or "leave" — a visitor still evaluating whether this product is for them has no lower-commitment path. An outline-style secondary button, visually subordinate to the primary (no fill, thin border, lower-contrast text), captures that browsing intent without diluting the primary CTA's prominence. On mobile this collapses to a plain text link beneath the primary button to preserve vertical space — see §9.

**Why not a third CTA (e.g. "How It Works"):** a hero with three competing actions dilutes all three. One primary, one clearly subordinate secondary is the ceiling for a hero this information-dense already.

---

## 6. Trust Layer Strategy

Two tiers, each with a distinct job:

**Micro-trust (inline, right before the CTA):** three small badges, icon + short label, no boxes or heavy borders — "Verified Professionals," "Background-Checked," "100% Satisfaction Guarantee." These exist specifically to neutralize doubt in the seconds right before someone decides whether to click — placement matters more than content here, which is why they sit between the subcopy and the CTA cluster rather than anywhere else.

**Macro-trust (the stat strip, after the CTA):** quantified, scannable proof for visitors who want more evidence before moving on — customer count, expert count, rating, services offered. Redesigned in detail in §7.

**The endorsement badge itself ("by Austrum") is also a trust signal, not just brand decoration** — inherited credibility from an established parent company is one of the strongest trust cues available and should be thought of as part of this layer, not separately from it.

One thing deliberately *not* added: a generic "Same-Day Service" badge, unless it's actually true for most service categories today — a trust badge that's only sometimes accurate does more damage than good the first time a visitor discovers it doesn't apply to their booking.

---

## 7. Stat Card Redesign

**Layout:** Move away from four equally-sized boxed cards in a 2×2 grid (which reads as a transplanted dashboard widget) toward a single horizontal strip with thin vertical dividers between items, in the spirit of an editorial masthead stat line rather than an admin panel. On screens where a 2×2 still makes more sense (narrow tablet), the cards become lightweight glass panels rather than heavy boxed cards.

**Sizing/hierarchy:** Not all four stats are equally persuasive — a star rating is emotionally stronger evidence than a services count. Give the rating stat the largest type size and the only use of copper color in the strip; the other three share a smaller, consistent size. This breaks the "four identical boxes" monotony and tells the eye which number matters most.

**Copy:** Tighten labels to be more vivid and on-brand: "10,000+ Happy Homes" (not "Happy Customers" — ties to the home theme), "500+ Verified Pros" (matches the trade-professional voice already established), "4.9★ Average Rating" with a smaller "(10,000+ reviews)" sub-line, "50+ Home Services."

**Interaction:** On desktop, a subtle hover lift and border brighten — consistent with the `.card-service` hover pattern already used elsewhere in the app, so the hero doesn't introduce a one-off interaction language. On mobile, the strip becomes horizontally swipeable with scroll-snap rather than stacking vertically, which is the single biggest fix for the "CTA pushed below the fold" problem identified in §0.

---

## 8. Hero Overlay Strategy

The photo itself never changes. Everything below is overlay-layer (CSS), sitting on top of the unchanged `hero.jpg`.

**Color neutralization:** a deep navy-to-near-black duotone scrim (`primary-900` blended toward charcoal) at high opacity (roughly 88–92%) — strong enough that the photo's pink/burgundy floral tones stop registering as their original hue and instead read as a deep, desaturated navy-charcoal backdrop. This is a color-correction move, not just a darkening one: the goal is to shift what color the eye perceives the photo as being, not merely how bright it is.

**Directional weighting:** the scrim should be darkest exactly where text sits (typically the left/content side) and can ease slightly lighter toward the area with the least foreground content, so contrast is spent where it's needed rather than flattened uniformly across the whole image.

**Handling the legacy "A" monogram specifically:** since it's part of the fixed photo, the strongest point of the scrim should sit directly over wherever the monogram falls in the current composition, so it recedes toward invisibility rather than competing with the new UpKeep lockup. It's also worth confirming the new brand lockup isn't positioned where it would partially overlap the old mark even at low visibility — two circular brand marks in the same visual field, even one faint and one prominent, reads as visual clutter.

**Optional reinforcement layer:** a very faint (4–6% opacity), large-scale graphic motif echoing the logo's house silhouette, placed in the negative space of the photo, gives the eye a new large-scale brand cue to settle on instead of the old wreath/monogram — purely optional, worth doing if there's design bandwidth, skippable if not.

---

## 9. Mobile Hero Strategy

**Above 1024px (current desktop target):** full layout as described in §2 — lockup at full scale, eyebrow, headline, subcopy at full size, primary + secondary CTA side by side, micro-trust inline, stat strip as a four-item horizontal row.

**768–1023px:** single-column, full-width content. The stat strip compresses to a horizontally scrollable row rather than trying to fit four items at full size in a narrower space. CTA cluster may stack (primary full-width, secondary as a smaller link beneath) if side-by-side starts to feel cramped. Lockup stays at near-full scale; if width gets tight, the "by Austrum" badge is allowed to wrap to its own line below the wordmark, but it never shrinks back down to caption-style text.

**481–767px:** hero height itself should shrink — a near-full-viewport hero is a desktop convention, not a mobile one, and on a conversion page the goal is to get the CTA into the first viewport, not to maximize photo drama. The eyebrow line can be dropped entirely here (it's redundant with the headline). Headline drops to a tighter, smaller scale. Micro-trust row may condense to a single combined line. Stat strip becomes a swipeable carousel of compact cards, or collapses to one combined trust statement ("4.9★ from 10,000+ happy homes") with the full breakdown deferred to the section just below the hero rather than crammed above the fold. Secondary CTA becomes a plain text link, not a full button, to save vertical space.

**480px and below:** the most aggressive compression — lockup, one-line headline, one combined trust line, and the primary CTA are the only guaranteed above-the-fold elements. Everything else (secondary CTA, full stat detail, micro-trust badges) is still on the page, just immediately below the fold rather than inside the hero's fixed viewport allotment.

**The governing rule across every breakpoint:** as the viewport shrinks, the hero sheds *proof* before it sheds *brand*. The lockup and one clear path forward survive at every size; stats, secondary actions, and supporting detail are what compress or defer first.

---

## 10. Premium Visual Enhancements

| Technique | Use it? | How |
|---|---|---|
| Gradients | Yes, restrained | A single directional scrim gradient over the photo (§8); a subtle depth gradient on the primary CTA at hover only. No decorative multi-color gradients anywhere — would undercut the calm, competent brand voice. |
| Glassmorphism | Yes, on small bounded elements | Frosted/translucent navy treatment (semi-transparent fill, blur, thin light border) on the stat cards and the "by Austrum" badge — reads premium against a photographic background. Not on large text containers; keep it to chrome, not content. |
| Shadows | Minimal | Soft, navy-tinted shadows (never black, never any leftover burgundy tint) under the CTA and stat cards, just enough to lift them off the busy photo. No heavy dramatic drop-shadows. |
| Dividers | Yes, sparingly | One thin vertical divider inside the brand lockup; thin hairline dividers between stat-strip items if that layout is used. Always low-opacity, never bold. |
| Badges | Yes — central to this whole plan | The endorsement badge, the micro-trust badges, and the rating callout are all legitimate uses. Cap it at 3–4 visible badges at once so the hero doesn't turn into a wall of pills. |
| Animation | Light and functional only | A soft staggered fade-up on load (lockup, then headline, then CTA, then stats, ~80–120ms apart) for polish without gimmickry; a gentle hover lift on cards/buttons, consistent with patterns already used elsewhere in the app. No parallax on the hero image, no auto-playing carousels, no looping decorative motion — and respect `prefers-reduced-motion` throughout. |

---

## 11. Final Recommended Hero

Putting every section together into one coherent direction (other options from §3–4 remain valid alternates for testing, not discarded):

The hero opens on the existing `hero.jpg`, now sitting under a navy-charcoal duotone scrim that's darkest behind the content column and positioned so the legacy monogram falls into the darkest part of the frame. At the top of the content column, the brand lockup — logo mark, "UpKeep" wordmark, and a bordered "by Austrum" badge — establishes identity in one glance, followed by a short plain eyebrow line for category/location context. The headline reads **"The trusted way to keep your home running,"** paired with the supporting line **"Verified professionals, transparent pricing, and a satisfaction guarantee — backed by Austrum's standards."** — together carrying both the brand-name echo and the parent endorsement without either feeling forced.

Directly beneath that, a compact row of three micro-trust badges (Verified Professionals, Background-Checked, Satisfaction Guarantee) sits immediately above the CTA cluster: a solid Sand-fill "Book a Service" as the primary action, with an outline "View Services" beside it for visitors not ready to commit. Below the fold-line of the main message, the stat strip closes the hero — "4.9★ Average Rating" given the largest, copper-accented treatment as the strongest piece of social proof, flanked by "10,000+ Happy Homes," "500+ Verified Pros," and "50+ Home Services" at a smaller, consistent size, styled as light glass panels with a subtle hover lift rather than heavy dashboard cards.

On tablet and mobile, this same hierarchy holds but compresses in a fixed order — eyebrow line first to go, then the stat strip collapses to a swipeable row or a single combined trust line, then the secondary CTA reduces to a text link — while the lockup, headline, and primary CTA remain visible above the fold at every breakpoint down to 480px. Nothing about this requires touching `hero.jpg`, the logo asset, routing, or any existing booking functionality — every change described here lives in layout, type, color treatment, copy, and CSS-level overlay work.
