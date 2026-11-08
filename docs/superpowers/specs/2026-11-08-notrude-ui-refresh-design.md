# Notrude UI Refresh — Rivian-inspired + Whimsy

**Date:** 2026-11-08  
**Status:** Approved direction; pending user review of written spec  
**Branch:** `cursor/notrude-ui-refresh-d2a4`  
**Scope:** Visual / interaction redesign of existing v1 flows. No new product features.

## 1. Intent

Replace the sparse dark-green shell with a **Rivian-inspired dual-canvas system**: cinematic dark bands, bright open product surfaces, architectural typography, and a single solar-yellow CTA voltage — plus a little fun so Notrude still feels like an empathetic coach, not a vehicle brochure.

## 2. Inspiration → adaptation

| Rivian | Notrude |
|---|---|
| Dual canvas (dark tech / white product) | Same: dark Welcome/workout focus; light Today/Plan/Progress |
| Solar yellow `#FFAC00` CTAs only | Same — primary buttons only; black label on yellow |
| Huge Adventure type, tight tracking | Open substitute: **Space Grotesk** (display + UI), **Figtree** (body) |
| Photography-led hero | CSS atmospheric full-bleed plane (mist + soft terrain wash); no stock car photos |
| Borders over shadows | Same |
| Pill CTAs | Soft pills; whimsy via motion + copy, not emoji piles |

## 3. Design tokens

```css
:root {
  /* Dual canvas */
  --canvas-light: #ffffff;
  --canvas-soft: #f3f3f1;
  --canvas-dark: #121212;
  --canvas-mid: #1c1c1c;

  /* Ink */
  --ink: #151515;
  --ink-soft: #2a2a2a;
  --ink-muted: #5c5c5c;
  --ink-on-dark: #f5f5f3;
  --ink-muted-on-dark: #a8a8a3;

  /* Voltage — CTA only */
  --voltage: #ffac00;
  --voltage-hover: #ffc733;
  --on-voltage: #000000;

  /* Nature accents (sparing) */
  --sage: #629b5c;
  --sky: #77afd8;
  --stone: #bc9c8a;

  /* Structure */
  --hairline: #e5e5e2;
  --hairline-on-dark: rgba(255,255,255,0.12);
  --radius-pill: 999px;
  --radius-panel: 20px;
  --space: 8px;
}
```

**Rules**
- Yellow appears on primary CTAs only (Start quiz, Start workout, Send, Generate…).
- Ghost / secondary actions use hairline borders on the current canvas — never second yellow.
- No multi-layer drop shadows; elevation = border + subtle surface shift.
- Avoid purple gradients, cream+#terracotta cliché, and flat single-color pages.

## 4. Typography

- **Display / UI chrome:** Space Grotesk, weights 500–700, display tracking on large sizes (`-0.03em` to `-0.05em`).
- **Body / coaching copy:** Figtree, 400–500, comfortable line-height (~1.5).
- Welcome brand wordmark: display, ≥ clamp(3.5rem, 12vw, 5.5rem) — hero-level, not nav-sized.
- Section labels: 11–12px uppercase / wide tracking optional for Rivian-like “TODAY” meta — use sparingly.

## 5. Screen treatments

### 5.1 Welcome (dark cinema band)
- Full-bleed dark atmospheric background (radial mist + soft sage wash — not flat).
- Composition budget: **Notrude** wordmark, one headline, one supporting sentence, one yellow CTA, demo seeds as quiet ghost pills underneath.
- No stats, no cards in the hero.
- Motion: wordmark fade-up; CTA settle-in after ~200ms.

### 5.2 Quiz / Acknowledgment
- Light canvas; one question per step; ProgressDots as hairline segments.
- Choice cards: bordered panels (`--radius-panel`), selected state = dark ink fill + light text (not yellow fill).
- Acknowledgment: generous type, soft fade-in; primary yellow “Start my first week”.

### 5.3 App shell (light product)
- Soft canvas background (`--canvas-soft`).
- Bottom tabs on white/elevated bar with hairline top border; active = ink underline (not yellow underline everywhere — yellow reserved for actions). Optional tiny voltage dot on active tab only if it stays subtle.
- Phone column max-width ~430px centered.

### 5.4 Today / Plan / Workout
- Today: large session title, short rationale, step list in bordered panel, yellow Start.
- Rest / outside-week: whimsical but kind empty line (e.g. “The trail can wait — today is for easy breath.”).
- Workout play: may flip to dark band for focus; Done = yellow; Skip stays ghost + never-shame copy.

### 5.5 Coach
- Light shell; chat bubbles: user = soft gray panel, coach = white + hairline.
- Quick chips = ghost pills; Send = yellow.
- Empty state with a small whimsical line under the prompt.

### 5.6 Progress
- Light canvas; streak as typographic number (big), not a trophy card farm.
- Sections separated by hairlines / spacing, not nested card stacks.
- Health connect / drafts: interaction panels only where tapping happens.

## 6. Motion (ship 3)

1. Welcome / page enter: 280ms ease-out fade + 8–12px rise.
2. Quiz step change: horizontal soft slide (160–200ms).
3. Coach message / primary CTA: opacity + slight settle.

Respect `prefers-reduced-motion`.

## 7. Whimsy guardrails

- Allowed: playful empty-state copy, soft motion, one unexpected friendly line in coach empty state.
- Not allowed: emoji rows, stickers on hero, confetti, meme tone, shame-wrapped “jokes.”

## 8. Out of scope

- New features, auth, real health OAuth, copy rewrite of empathy rules.
- Native iOS shell.
- Pixel-perfect Rivian asset cloning / Adventure font licensing.

## 9. Success criteria

- First viewport brand test: removing nav, it still reads as Notrude (not a generic fitness template).
- Yellow appears only as action voltage.
- Dual canvas readable on iPhone-width viewport.
- All existing flows still work (quiz, demo seeds, today, coach, progress) with no regression in `npm test` / build.
