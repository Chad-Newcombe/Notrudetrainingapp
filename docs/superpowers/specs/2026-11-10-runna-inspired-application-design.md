# Runna-Inspired Application Design and Coach Theme System

**Date:** 2026-11-10  
**Status:** Awaiting final approval  
**Reference:** Runna is an information-hierarchy reference, not a visual template to copy.

## Intent

Not Rude Training should feel like a focused training application rather than a stack of decorated cards. The current hard borders, offset shadows, condensed editorial typography, and illustrated human coach portraits are rejected. The approved direction uses Runna's training-first hierarchy as inspiration: one dominant next workout, compact weekly context, a schedule-like plan, quiet supporting surfaces, and stable navigation.

The selected coach supplies the application's personality. River, Jax, Sol, and Nova each own a coordinated palette and voice. Switching coaches changes the emotional temperature across both light and dark themes without changing the layout or forcing the user to relearn the application.

The coach character remains a stylized 3D modeled character. New character art is explicitly out of scope for this phase. The existing `.glb` models return as temporary assets; the rejected 2D human portraits are removed from the product experience. A later character project will improve the 3D models and their tone-specific motion.

## Goals

- Make Today answer one question immediately: “What am I doing today?”
- Make Plan read as a schedule, not a vertical pile of independent cards.
- Keep Coach central while moving Inbox out of permanent bottom navigation.
- Give Progress its own destination and move settings, accounts, appearance, coach selection, and health connections into More.
- Make coach selection change a coordinated light/dark token system immediately.
- Apply the visual and theme system across every user-facing route, including welcome, onboarding, acknowledgment, account, and workout execution.
- Preserve all existing plans, profiles, chat history, plan-revision behavior, logs, account behavior, and real Strava integration.
- Keep the application calm, legible, responsive, and native-feeling at mobile width.

## Non-goals

- Designing or producing new 3D coach models.
- Photorealistic or illustrated human coaches.
- GPS run recording, maps, live audio cues, or smartwatch workout execution.
- Expanding the current one-week plan engine into a multi-week plan data model.
- Adding new structured distance, pace, or workout-type fields to the AI plan contract in this phase.
- Native Apple Health or Garmin implementations in the web application.
- Copying Runna's logo, exact colors, proprietary content, or screen composition.
- Rewriting coach voices, adding preloaded chat prompts, or weakening the user's authority over plan changes.
- Adding drag-and-drop schedule editing in this phase.

## Product Structure

### Bottom navigation

The persistent navigation has five stable destinations:

1. **Today** — the next workout and immediate weekly context.
2. **Plan** — weekly schedule and plan-management entry points.
3. **Coach** — 3D coach presence, conversation, coach switching, and Inbox access.
4. **Progress** — completed workouts, streak context, weight check-ins, and reflections.
5. **More** — account, coaching preferences, appearance, connected apps, and health integrations.

The current Inbox route remains available so existing links and stored messages continue to work, but it is reached from Coach rather than occupying a bottom-navigation position.

### Route responsibilities

- `/today`: focused daily dashboard.
- `/plan`: plan overview and weekly schedule.
- `/coach`: coach presence and conversation, with an Inbox entry point.
- `/inbox`: existing message history and communication tools, linked from Coach.
- `/progress`: training history and personal progress only.
- `/more`: account, coach selection, preferences, appearance, and health connections.

## Screen Design

### Today

Today uses a single vertical hierarchy:

```text
brand / profile
plan name + week progress
compact seven-day strip

TODAY'S WORKOUT
large workout visual/status field
distance or duration
workout name + short rationale
three useful metrics
primary Start / Review action

one compact coach note
bottom navigation
```

The workout is the memorable visual element. Supporting information is quiet and secondary. The coach does not dominate this screen and does not ask a preemptive question. On rest days, the same dominant region clearly communicates rest and offers an optional route to Coach.

### Plan

Plan uses a compact schedule:

- Plan goal and current week date range at the top. Do not invent a plan end date or number of remaining weeks.
- The current product renders its one stored week. The layout may reserve a future week-selector position, but no selector is shown until real multi-week data exists.
- Scheduled-minutes total and session count when duration data is available; otherwise show session count without a fabricated total.
- Each day is one row with date, a narrow status/intensity marker, title, available duration, intensity, and completion state.
- Rest days remain visible but visually quiet.
- “Manage plan” opens clear actions: discuss changes with the coach or update coaching/training preferences. It does not preload text into the chat.

### Coach

- Restore the existing interactive 3D model viewer and `.glb` assets as the temporary character presentation.
- Keep a graceful static fallback when WebGL is unavailable.
- Use the selected coach's theme tokens for the scene, focus states, and primary actions.
- Keep coach switching available without leaving the coaching area; changing coach updates the application theme immediately.
- Keep the message composer empty until the user types.
- Preserve actual plan mutation, undo, and retry behavior already implemented.
- Add an Inbox entry point in the header or immediately below the coach stage.

### Progress

Progress contains only progress-related information:

- Current streak presented without judgment.
- Workout history and completion state.
- Optional weight check-in.
- Reflections and past reflections.
- Future performance charts can use this route without mixing in account settings.

### More

More is the settings and connections hub:

- Account and sign-in state.
- Change coach.
- Coaching preferences and onboarding answers.
- Appearance: System, Light, or Dark.
- Health connections: real Strava OAuth and honest Apple Health/Garmin requirements.
- Any future device connections or notification settings.

## Visual System

### Layout and surfaces

- Mobile-first application width remains approximately 430px on desktop preview.
- Use generous page margins, but reduce large gaps that fragment related information.
- Use hierarchy and spacing before containers.
- Raised surfaces use subtle tonal separation, not a border-and-shadow on every block.
- Primary cards use approximately 16–18px corner radii; controls use approximately 8–10px.
- Borders are reserved for state, focus, input boundaries, and true separation.
- Remove hard offset shadows, paper texture, diagonal hatching, tracked all-caps metadata, and the editorial display treatment.

### Typography

- Use Figtree as the primary family for headings, body, metrics, and controls.
- Headings use weight and scale rather than condensed type or decorative tracking.
- Labels use sentence case wherever possible.
- Large workout distance/duration may use heavier numeric styling, but not a separate novelty typeface.
- Body copy remains short and comfortably legible.

### Coach theme tokens

Every coach defines semantic tokens rather than one accent color:

| Coach | Personality | Light canvas | Light raised | Light accent | Dark canvas | Dark raised | Dark accent |
|---|---|---:|---:|---:|---:|---:|---:|
| River | grounded, unhurried, gentle | `#F1F6F3` | `#FFFFFF` | `#5B9C8B` | `#0E1714` | `#19241F` | `#7CC9B4` |
| Jax | upbeat, social, concrete | `#F8F5ED` | `#FFFFFF` | `#E8A62D` | `#17140D` | `#262116` | `#F3B94C` |
| Sol | direct, composed, warm | `#F8F2EF` | `#FFFFFF` | `#D9653C` | `#180F0D` | `#291B17` | `#F08058` |
| Nova | curious, inventive, lightly playful | `#F4F3F9` | `#FFFFFF` | `#7975D8` | `#11101D` | `#211F34` | `#A09BF1` |

Each palette also supplies semantic text, muted text, border, focus, and accent-foreground values that meet accessible contrast requirements. Workout status colors remain semantically consistent across coaches; they are not remapped in a way that makes completion, rest, or warnings ambiguous.

### Theme behavior

- Coach selection and appearance are independent axes.
- Appearance supports `system`, `light`, and `dark`; `system` is the default.
- The current coach ID selects the palette family.
- The appearance setting selects the light or dark member of that family.
- Switching coaches updates visible theme tokens without a page reload.
- The appearance preference is optional in stored profile data so older profiles migrate safely to `system`.
- Avoid a bright flash during startup; the shell uses the system theme until the stored coach preference becomes available.
- Before a coach has been chosen, welcome and onboarding use River as the calm default palette. Coach selection updates the onboarding palette immediately.
- Workout execution remains dark for outdoor legibility but uses the active coach's dark palette and accent rather than a separate unrelated dark theme.

### Existing plan-data boundary

The redesign consumes the plan data that already exists; it does not broaden the training-generation contract:

- Duration is the sum of step durations only when those durations are present.
- The three Today metrics are conditional slots using real values such as scheduled duration, intensity, and step count. Missing metrics collapse rather than displaying placeholders or inferred numbers.
- Plan schedule markers use completion state and intensity. They do not infer a workout type from title text.
- Distance and pace appear only when the existing stored content explicitly supplies them in a reliable structured form in a future phase; this redesign does not parse prose to manufacture metrics.
- Weekly totals never combine guessed values.

## Interaction and Motion

- Motion answers user actions: tab changes, coach changes, plan updates, and expanding details.
- Remove decorative page-by-page entrance animation.
- Bottom-navigation active state uses color and a restrained indicator, not a moving pill with heavy decoration.
- Buttons use a slight pressed-state change without large translation or hard shadows.
- Respect `prefers-reduced-motion` for model animation and UI transitions.
- Preserve 44px minimum targets, safe-area spacing, and visible keyboard focus.

## Content Rules

- Today copy is action-oriented and concise.
- Coach notes contain one useful observation or next move, not a speech.
- Empty and error states explain the next available action.
- The application does not preemptively populate the coach composer or invent a question for the user.
- Plan updates shown in chat must remain reflected in the saved Plan screen.

## Data and Compatibility

- Existing IndexedDB and account-backed data remain intact.
- Add an optional appearance field rather than replacing or invalidating stored profiles.
- Existing `/inbox` links remain valid.
- Existing coach IDs and `.glb` asset paths remain stable.
- Strava tokens remain server-only; the visual redesign does not change the OAuth security model.
- Apple Health and Garmin remain visibly unavailable until their native or partner requirements are met.

## Accessibility and Quality Bar

- Meet WCAG AA contrast for text and actionable controls in all eight coach/mode combinations.
- Do not rely on coach color alone for workout type, completion state, or selected navigation.
- Provide meaningful button and navigation labels.
- Ensure keyboard access to coach switching, appearance selection, plan actions, chat, and health controls.
- Verify at 320px, 390px, and 430px widths with no horizontal overflow.
- Verify welcome, onboarding, acknowledgment, account, workout execution, and all five tab destinations in both display modes across the relevant coach palettes.
- Verify model fallback, pre-profile River default, signed-out health state, missing Strava credentials, reduced motion, and system-theme changes.

## Acceptance Criteria

- Today clearly prioritizes the current workout and contains a compact weekly strip.
- Plan renders sessions as schedule rows and no longer resembles a stack of identical cards.
- Plan remains compatible with the existing single-week data model and never invents multi-week or distance data.
- Bottom navigation reads Today, Plan, Coach, Progress, More.
- Inbox is accessible from Coach and its route/data still work.
- Progress contains progress features; More contains preferences, accounts, and health connections.
- Switching coach updates the full palette across the active screen without changing layout.
- All four coach palettes pass in light and dark modes.
- Welcome, onboarding, acknowledgment, account, and workout execution participate in the same theme system; pre-profile screens default to River.
- Appearance supports system, light, and dark and persists safely.
- Existing 3D models appear again; rejected human portrait art does not appear in the application.
- Chat starts empty, coach plan changes still update the saved plan, and undo/retry continue working.
- Existing tests pass, new structural/theme behavior is tested, lint and production build pass, and core screens are visually verified at mobile width.

## Builder Calls

- Exact animation easing and durations may be chosen during implementation, within the motion constraints above.
- The specific icon set remains Lucide unless an existing icon cannot express the destination.
- The builder may choose the smallest migration-safe location for the optional appearance preference.
- The temporary 3D model scene may be simplified for performance, but must preserve interaction, reduced motion, and fallback behavior.
