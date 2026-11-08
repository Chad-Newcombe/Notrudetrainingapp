# Notrude UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or implement inline). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Notrude’s visual system to a Rivian-inspired dual-canvas UI with solar-yellow CTA voltage and light whimsy, without changing product behavior.

**Architecture:** Replace global tokens/fonts/motion; restyle shared primitives (Button, tabs, mark); then restyle each route surface to light/dark canvas rules from the spec.

**Tech Stack:** Next.js App Router, Tailwind CSS 4, `next/font` (Space Grotesk + Figtree).

## Global Constraints

- Yellow `#FFAC00` on primary CTAs only; black label on yellow.
- Dual canvas: dark Welcome/workout focus; light app product surfaces.
- Space Grotesk display/UI + Figtree body; tight tracking on large type.
- Borders over shadows; no purple/cream-terracotta clichés.
- Preserve all existing flows and tests; no new product features.
- Whimsy via motion + empty-state copy only — no emoji spam.
- Spec: `docs/superpowers/specs/2026-11-08-notrude-ui-refresh-design.md`

---

### Task 1: Tokens, fonts, motion, primitives

**Files:** `app/globals.css`, `app/layout.tsx`, `components/ui/Button.tsx`, `components/brand/NotrudeMark.tsx`, `components/ui/ChoiceCard.tsx`, `components/ui/ProgressDots.tsx`, `components/shell/BottomTabs.tsx`, `public/manifest.webmanifest`

- [ ] Replace CSS variables with dual-canvas token set from spec
- [ ] Switch fonts to Space Grotesk + Figtree; themeColor `#121212`
- [ ] Button: primary = voltage yellow / on-voltage black; ghost = hairline on current canvas
- [ ] BottomTabs: light elevated bar, ink active underline
- [ ] Motion keyframes: page-enter, quiz-step (slide), reduced-motion media query
- [ ] Commit: `style: dual-canvas tokens, fonts, and primitives`

### Task 2: Welcome + Quiz + Acknowledgment

**Files:** `app/page.tsx`, `app/quiz/page.tsx`, `components/quiz/QuizWizard.tsx`, `app/acknowledgment/page.tsx`

- [ ] Welcome dark cinema band + huge wordmark + yellow CTA + ghost demos
- [ ] Quiz/ack on light canvas; choice selected = ink fill
- [ ] Commit: `style: welcome, quiz, and acknowledgment surfaces`

### Task 3: Main app surfaces

**Files:** `app/(main)/layout.tsx`, today/plan/coach/progress pages + related components, `app/workout/[sessionId]/page.tsx`

- [ ] Soft light canvas for tabbed app; dark focus for workout play
- [ ] Today/Plan/Coach/Progress restyled per spec; whimsical rest empty copy
- [ ] Commit: `style: today, plan, coach, progress, and workout`

### Task 4: Verify

- [ ] `npm test` + `npm run build`
- [ ] Browser smoke: Welcome → demo → Today → Coach
- [ ] Push + update PR
