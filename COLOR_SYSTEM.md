# COLOR_SYSTEM.md — UpKeep by Austrum

**Status:** Visual Rebrand v2.0 — Strategy / Specification (not yet implemented)
**Companion document:** `BRAND_REFRESH_GUIDE.md` (narrative rationale, components, typography, mobile)
**Supersedes:** `BRAND_GUIDE.md` v1.0 §3 (Color Palette) — the "Maroon as shared family accent" model is retired. See §9 below.
**Audience:** Design + engineering. This is the source of truth for every color token used on UpKeep customer-facing surfaces (and, by extension, the admin console).

---

## 0. The One Rule Everything Else Follows

> **Burgundy/maroon — the entire `#6B0F2A` family — is retired from UpKeep's UI.** Not as primary, not as secondary, not as a 5%-cap accent. It does not appear in any CSS token, Tailwind class, inline style, gradient, shadow, or focus ring on any UpKeep screen.
>
> The **only** place it may exist is baked into the static `upkeep_logo.png` artwork itself (the wrench/screwdriver glyphs and the "by Austrum" divider rules), because that is a fixed brand asset, not a live UI color. Nobody should ever sample that red from the logo and reuse it as a hex value anywhere else.

This is a stricter rule than v1.0's "maroon as inherited accent, capped at 10% of screen area." That model is why the previous rebrand audit found the UI "still reads Austrum" — once a color is in the system at all, it creeps. The fix is to remove it entirely and give UpKeep a complete, self-sufficient palette that doesn't need to borrow from the parent's color identity to feel connected to it (the connection is carried by the logo lockup and the "by Austrum" text endorsement instead — see Brand Refresh Guide §7–8).

---

## 1. Primary — "Harbor Navy"

Sampled directly from the logo's circular badge, so the product's dominant UI color and its app icon/favicon are the same color family — free continuity, zero new asset risk.

| Token | Hex | Use |
|---|---|---|
| `primary-100` | `#D8E8ED` | Tint washes, section-label pill backgrounds, selected-row backgrounds |
| `primary-300` | `#6FA8BD` | Disabled primary buttons, light icon accents |
| `primary-500` | `#15607F` | Hover state for primary actions |
| `primary-600` **(DEFAULT)** | `#0E4A63` | Primary buttons, links, active nav state, focus rings, default icon color |
| `primary-700` | `#0A3A4E` | Pressed/active button state |
| `primary-800` | `#08354A` | Navbar background, exact logo-badge navy |
| `primary-900` | `#031927` | Footer background, deepest overlays — exact logo-halo navy |

**Validated contrast:** white text on `primary-600` = **9.6:1** (AAA). White text on `primary-500` = **7.0:1** (AAA). Both comfortably exceed the 4.5:1 AA minimum for body-size text.

**Rationale:** Navy was already the right call in v1.0 — it's literally in the approved logo, it reads as trade/professional/dependable rather than warm-hospitality (which is Austrum's lane), and it's a clean hue family with no relationship to burgundy. This document keeps that decision and tightens its execution.

---

## 2. Secondary — "Graphite Slate"

A cool, desaturated blue-grey. This is new — v1.0 had no true secondary tier, which is part of why maroon kept getting reached for whenever something needed "more than navy but not a full CTA." Graphite fills that gap without introducing a second brand hue.

| Token | Hex | Use |
|---|---|---|
| `secondary-100` | `#E6EBEE` | Subtle dividers, secondary chip backgrounds |
| `secondary-300` | `#B7C2CB` | Placeholder icons, disabled text |
| `secondary-500` | `#5C7282` | Body-secondary text, muted labels (also used as the `--muted` token) |
| `secondary-600` **(DEFAULT)** | `#3F4F5C` | Secondary button fill, secondary headings, structural UI |
| `secondary-800` | `#25313A` | Secondary button hover/pressed |

**Validated contrast:** white text on `secondary-600` = **8.5:1**. `secondary-500` text on white `bg` = **5.0:1** — passes AA for normal body text.

**Rationale:** Graphite is a desaturated step toward navy, not a separate hue — visually it reads as "the same family, lower volume," which is exactly the job a secondary tier should do. It gives every screen a second tonal layer for hierarchy (secondary buttons, less-important headings, structural chrome) without ever competing with navy or accent for attention.

---

## 3. Accent — "Workshop Copper"

This replaces maroon's *role* (the one warm, energetic, "notice me" color) without replacing its *hue family*. Copper is orange-based, burgundy is red-violet-based — there's no risk of someone mistaking one for a faded version of the other, and no slippery slope back to burgundy.

| Token | Hex | Use |
|---|---|---|
| `accent-100` ("Sand") | `#FBE7D3` | CTA pill backgrounds, avatar backgrounds, soft highlight surfaces — replaces the old "blush" tint |
| `accent-300` | `#E8A968` | Badge borders, icon highlight states |
| `accent-500` | `#D88A3E` | Hover state for accent elements |
| `accent-600` | `#C16A21` | **Decorative only** — icon accents, underlines, illustration fills, thin borders. Not for solid fills carrying white text. |
| `accent-700` | `#9C5418` | **Text-safe** — use this shade for any solid copper fill that carries white/light text (badges, the rare accent button) |

**Validated contrast:** white text on `accent-600` = **3.9:1** — fails AA for normal-size text, fine only for large/bold display use. White text on `accent-700` = **5.7:1** — passes AA. This is why the ramp splits into a decorative shade and a text-safe shade; don't substitute one for the other.

**Rationale & usage cap:** Copper is the *only* warm color in the system and should be treated the way maroon should have been treated in v1.0 but wasn't — genuinely rare. Target **≤8% of any given screen's color area**: one badge, one underline, one rating-star fill, one "featured" corner marker. If copper starts appearing in more than one or two spots per screen, that's the signal it's being used as a second primary, which is the exact failure mode this rebrand is correcting.

---

## 4. Background & Surface Neutrals

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#F3F6F8` | `#081821` | Page background |
| `card` | `#FFFFFF` | `#102531` | Cards, modals, inputs, dropdowns |
| `text` | `#15222B` | `#E7EEF2` | Primary text |
| `muted` | `#5C7282` | `#93A8B5` | Secondary/meta text |
| `border` | `#E2E8EC` | `#1C3645` | Dividers, card borders, input borders |

**Rationale:** Austrum's background is a *warm* cream (`#F4F1EF`). UpKeep's is a deliberately *cool*, slightly blue-grey off-white. Side by side, the two products should feel like siblings with different temperaments, not like the same screen with a different logo pasted on — this is the background-level version of the same separation the color system enforces everywhere else.

---

## 5. Semantic / Status Colors — Unchanged

Booking status, toasts, and form validation keep using standard Tailwind defaults, exactly as today. These were never part of the burgundy problem and don't need to change:

| Status | Token |
|---|---|
| Success | `emerald-500` `#10B981` |
| Warning | `amber-500` `#F59E0B` |
| Error | `red-500` `#EF4444` |
| Info | `blue-500` `#3B82F6` |

Leaving these alone also reduces implementation risk — no regression testing needed on booking-status logic, which is functionality the project explicitly wants left untouched.

---

## 6. Dark Theme Reference

| Token | Hex | Note |
|---|---|---|
| `primary` (text/icons on dark) | `#3AA0C4` | Lightened navy for sufficient contrast against dark bg |
| `primary-hover` | `#57B4D6` | |
| `primary` (solid button fill on dark) | `#15607F` | Reuses light-theme's `primary-500` — already verified at 7.0:1 with white text |
| `secondary` | `#8FA0AC` | |
| `accent` | `#E2A569` | Lightened copper for dark-surface visibility |

Dark-mode exact values should get a final pass with a contrast-checking tool at implementation time (e.g. Stark, axe) against the *actual* rendered surfaces — the values above are directionally correct and methodology-consistent with the light-theme ramps, but dark-mode perceptual tuning benefits from checking in situ.

---

## 7. Token Naming — For Engineering Handoff (Reference Only)

Not an implementation instruction — just the mapping so engineering can adopt this without re-deriving names:

```
--bg, --card, --text, --muted, --border
--primary, --primary-hover, --primary-dark        (existing names, new values)
--secondary, --secondary-hover                     (new)
--accent, --accent-decorative                       (renamed from old --accent / --blush)
--sand                                              (replaces --blush)
```

The existing token *names* in `index.css` / `tailwind.config.js` can largely stay as-is — only the hex values they point to change, plus two new tokens (`--secondary`, `--sand`) for the tier that didn't exist before. This keeps the eventual implementation diff small and low-risk.

---

## 8. What This Retires

These hex values and patterns are no longer permitted anywhere in UpKeep's live UI, including inline `style` props and hardcoded `rgba()` strings:

```
#6B0F2A   (burgundy primary)
#8B1A3A   (burgundy hover)
#4A0A1D   (burgundy dark)
#7E2037   (maroon — logo tool-icon color, UI-banned)
#97304B   (maroon hover)
#C8536B   (dark-mode maroon)
#E8A4AF   (blush / pink tint)
rgba(107, 15, 42, *)   — any opacity, any usage (overlays, shadows, scrollbar, focus ring)
```

If any of these are found in the codebase post-implementation (hero/auth overlays, navbar shadow, scrollbar, focus ring, `.section-label`, `btn-primary` box-shadow are the known current locations per the prior audit), they are defects against this spec, full stop — regardless of how small or "just a shadow" they seem.

---

## 9. Where Burgundy Is Still Allowed

Exactly one place: **inside the `upkeep_logo.png` (and any future vector version of it) as static artwork** — the wrench/screwdriver icons and the thin divider rules around "by Austrum." This is intentional and stays. It's the one deliberate, contained nod to the parent brand's DNA, and because it lives inside a fixed image asset rather than a CSS token, it can never "leak" into the rest of the UI the way the old `--accent`/`--blush` tokens did.

If the logo is ever redrawn as inline SVG instead of a flattened PNG, the burgundy paths inside that SVG are still exempt from this rule — they're logo artwork, not UI chrome — but nothing outside the logo's own `<svg>`/`<img>` boundary may reference that color.
