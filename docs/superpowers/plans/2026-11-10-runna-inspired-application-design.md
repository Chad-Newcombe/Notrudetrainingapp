# Runna-Inspired Application Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Not Rude Training around a training-first mobile layout with coach-driven light/dark themes while restoring the existing 3D coach models and preserving all coaching, plan-update, account, and health behavior.

**Architecture:** A root theme provider translates the stored `coachId` and optional appearance preference into semantic CSS tokens shared by every route. The main shell is split into five stable destinations, while Today and Plan consume only reliable values from the existing one-week plan model. Existing 3D assets and model-viewer return as temporary coach presentation; new model design remains out of scope.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Figtree, motion/react, `@google/model-viewer`, IndexedDB, SQLite-backed account storage, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-10-runna-inspired-application-design.md`

## Global Constraints

- Preserve all existing plans, profiles, chat history, plan revisions, logs, accounts, and Strava behavior.
- Keep the current single-week `TrainingPlan`; do not add multi-week, pace, distance, or inferred workout-type data.
- Use only real stored metrics; missing metrics collapse instead of displaying guessed values.
- Keep coach choice and appearance mode independent; default appearance is `system` and pre-profile coach is River.
- Restore existing `/coaches/*.glb` models and remove rejected human editorial portraits from the product experience.
- Keep the coach composer empty until the user types; do not introduce preloaded or preemptive questions.
- Apple Health and Garmin remain honest unavailable states in the web runtime.
- Preserve 44px targets, safe-area padding, visible focus, reduced motion, and WCAG AA contrast across all coach/mode combinations.
- Apply the theme to every user-facing route; workout execution always uses the active coach's dark palette.

## Review Focus

- An older profile without `appearance` must load as `system` without data loss or a schema error.
- A plan with partial or missing step durations must never show an understated session or weekly duration.
- A user switching coach while dark mode is active must receive the new coach's dark palette without a reload.
- A browser without WebGL 2 must show the original static coach fallback and keep coach selection usable.
- Signed-out users and deployments without Strava credentials must see actionable unavailable states without an OAuth redirect attempt.

---

### Task 1: Theme domain, persistence, and root provider

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/account/records.ts`
- Modify: `lib/store/profile.ts`
- Create: `lib/theme.ts`
- Create: `components/theme/AppThemeProvider.tsx`
- Modify: `app/layout.tsx`
- Modify: `tests/lib/types-profile.test.ts`
- Modify: `tests/lib/store-profile.test.ts`
- Create: `tests/lib/theme.test.ts`
- Create: `tests/components/app-theme-provider.test.tsx`

**Interfaces:**
- Produces: `AppearanceMode = "system" | "light" | "dark"`.
- Produces: `ThemeSelection { coachId: CoachId; appearance: AppearanceMode }`.
- Produces: `themeSelection(profile?: Pick<UserProfile, "coachId" | "appearance"> | null): ThemeSelection`.
- Produces: `announceTheme(selection: ThemeSelection): void` using the `notrude-theme-change` browser event.
- Produces: `<AppThemeProvider>{children}</AppThemeProvider>` that sets `document.documentElement.dataset.coach` and `.dataset.appearance`.

- [ ] **Step 1: Write failing migration and theme-selection tests**

Add assertions that a profile record without `appearance` parses, `getProfile()` returns `appearance: "system"`, null profile resolves to `{ coachId: "river", appearance: "system" }`, and all four coach IDs survive selection. Render AppThemeProvider with a mocked stored Nova/dark profile, then announce River/dark and assert the document datasets update without navigation.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --run tests/lib/types-profile.test.ts tests/lib/store-profile.test.ts tests/lib/theme.test.ts tests/components/app-theme-provider.test.tsx`  
Expected: FAIL because `appearance`, `themeSelection`, and the default do not exist.

- [ ] **Step 3: Add the optional appearance field and pure theme helpers**

Add `appearance?: AppearanceMode` to `UserProfile`, accept it optionally in the account Zod schema, and normalize missing values to `system` in `getProfile()`. Implement `themeSelection()` and a browser-safe `announceTheme()`.

- [ ] **Step 4: Add `AppThemeProvider` and root defaults**

Wrap application content inside `AccountProvider` with `AppThemeProvider`. Set server-rendered defaults `data-coach="river" data-appearance="system"`; on mount load the account-aware profile, listen for `notrude-theme-change`, and update datasets without reload.

- [ ] **Step 5: Make profile saves announce theme changes**

After `saveProfile()` persists successfully, announce its normalized `coachId` and `appearance` so CoachSwitcher and onboarding update the visible theme immediately.

- [ ] **Step 6: Run focused and full tests**

Run: `npm test -- --run tests/lib/types-profile.test.ts tests/lib/store-profile.test.ts tests/lib/theme.test.ts tests/components/app-theme-provider.test.tsx && npm test`  
Expected: focused tests and full suite PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/account/records.ts lib/store/profile.ts lib/theme.ts components/theme/AppThemeProvider.tsx app/layout.tsx tests/lib/types-profile.test.ts tests/lib/store-profile.test.ts tests/lib/theme.test.ts tests/components/app-theme-provider.test.tsx
git commit -m "Add coach-aware appearance themes"
```

### Task 2: Stable five-destination shell and route ownership

**Files:**
- Modify: `components/shell/BottomTabs.tsx`
- Modify: `app/(main)/layout.tsx`
- Create: `app/(main)/more/page.tsx`
- Modify: `app/(main)/progress/page.tsx`
- Create: `tests/components/bottom-tabs.test.tsx`

**Interfaces:**
- Consumes: root semantic theme datasets from Task 1.
- Produces: bottom destinations `/today`, `/plan`, `/coach`, `/progress`, `/more` with labels Today, Plan, Coach, Progress, More.
- Produces: `/more` as settings/connections route; `/progress` remains progress-only.

- [ ] **Step 1: Write a failing bottom-navigation test**

Render `BottomTabs` with `usePathname()` mocked to `/progress`; assert the five labels and hrefs exactly, `Progress` has `aria-current="page"`, and no Inbox destination exists.

- [ ] **Step 2: Run the component test and verify RED**

Run: `npm test -- --run tests/components/bottom-tabs.test.tsx`  
Expected: FAIL because Inbox is present, Progress is labeled More, and `/more` is absent.

- [ ] **Step 3: Implement the five-destination shell**

Replace the tab configuration and remove the animated active pill. Use a restrained icon/color active state and keep safe-area clearance in the main layout.

- [ ] **Step 4: Split Progress and More page responsibilities**

Move account, CoachSwitcher, coaching-preferences link, and HealthConnections into the new More page. Leave streak, history, optional weight, and reflections on Progress. Preserve the current reflection behavior and storage calls.

- [ ] **Step 5: Run component and full tests**

Run: `npm test -- --run tests/components/bottom-tabs.test.tsx tests/components/health-connections.test.ts && npm test`  
Expected: all PASS; health behavior remains unchanged.

- [ ] **Step 6: Commit**

```bash
git add components/shell/BottomTabs.tsx 'app/(main)/layout.tsx' 'app/(main)/more/page.tsx' 'app/(main)/progress/page.tsx' tests/components/bottom-tabs.test.tsx
git commit -m "Split progress and settings navigation"
```

### Task 3: Semantic coach palettes and shared visual primitives

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `components/ui/Button.tsx`
- Modify: `components/ui/ChoiceCard.tsx`
- Modify: `components/ui/ProgressDots.tsx`
- Modify: `components/brand/NotrudeMark.tsx`
- Create: `tests/components/button.test.tsx`

**Interfaces:**
- Consumes: `data-coach` and `data-appearance` from Task 1.
- Produces: semantic variables `--app-canvas`, `--app-raised`, `--app-raised-strong`, `--app-text`, `--app-muted`, `--app-line`, `--app-accent`, `--app-on-accent`, and `--app-focus` for all eight palette combinations.
- Produces: shared `Button` primary and secondary surfaces with no offset shadow.

- [ ] **Step 1: Write failing primitive assertions**

Render primary and ghost Buttons; assert a minimum 44px target class, semantic accent/surface classes, visible focus classes, and absence of the old hard `shadow-[4px_4px...]` treatment.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --run tests/components/button.test.tsx`  
Expected: FAIL against the current editorial Button.

- [ ] **Step 3: Replace global tokens and typography**

Remove Barlow Condensed and the paper/ink editorial layer. Define the exact River, Jax, Sol, and Nova light/dark palette values from the spec, use Figtree throughout, support `system` with `prefers-color-scheme`, and retain `.theme-dark` as a route-level override that selects the active coach's dark tokens.

- [ ] **Step 4: Rebuild shared surfaces**

Update Button, ChoiceCard, ProgressDots, panels, inputs, focus states, and brand mark to use semantic tokens, 8–18px radii by hierarchy, subtle tonal elevation, and no hard offset shadows or tracked all-caps decoration.

- [ ] **Step 5: Run tests, lint, and CSS production compilation**

Run: `npm test -- --run tests/components/button.test.tsx && npm run lint && npm run build`  
Expected: PASS with no Tailwind/CSS compilation errors.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx components/ui/Button.tsx components/ui/ChoiceCard.tsx components/ui/ProgressDots.tsx components/brand/NotrudeMark.tsx tests/components/button.test.tsx
git commit -m "Replace editorial styling with coach themes"
```

### Task 4: Reliable plan metrics and training-first Today/Plan layouts

**Files:**
- Create: `lib/plan/metrics.ts`
- Create: `tests/lib/plan-metrics.test.ts`
- Modify: `components/today/TodaySession.tsx`
- Modify: `app/(main)/today/page.tsx`
- Modify: `components/plan/WeekPlan.tsx`
- Modify: `app/(main)/plan/page.tsx`
- Create: `tests/components/today-session.test.tsx`
- Create: `tests/components/week-plan.test.tsx`

**Interfaces:**
- Produces: `sessionDurationMin(session: PlanSession): number | null`, returning null unless every nonempty step has `durationMin`.
- Produces: `weeklyDurationMin(plan: TrainingPlan): number | null`, returning null unless every scheduled session has a reliable duration.
- Produces: `sessionMetrics(session: PlanSession): Array<{ label: string; value: string }>` using only duration, intensity, and step count.
- TodaySession now consumes `{ session: PlanSession | null; plan: TrainingPlan; logs: WorkoutLog[]; profile: UserProfile; loggedToday?: boolean; outsidePlanWeek?: boolean }`.
- WeekPlan now consumes `{ plan: TrainingPlan; logs: WorkoutLog[] }`.

- [ ] **Step 1: Write failing pure metric tests**

Cover complete durations, a partial-duration session, an empty step list, a mixed-reliability week, and metric labels that never include inferred distance or pace.

- [ ] **Step 2: Run metric tests and verify RED**

Run: `npm test -- --run tests/lib/plan-metrics.test.ts`  
Expected: FAIL because the helpers do not exist.

- [ ] **Step 3: Implement the metric boundary**

Add the three exact helpers without parsing titles or rationale text.

- [ ] **Step 4: Write failing Today and Plan render tests**

Today: assert one dominant workout heading, seven-day context, real metrics, primary Start/Review action, and a single compact coach note. Plan: assert seven date rows including Rest day rows, current/completed status from logs, a real weekly duration only when reliable, and no fabricated week selector.

- [ ] **Step 5: Run component tests and verify RED**

Run: `npm test -- --run tests/components/today-session.test.tsx tests/components/week-plan.test.tsx`  
Expected: FAIL against the current stage/card-stack layouts.

- [ ] **Step 6: Implement Today's training-first hierarchy**

Add plan/week context from the page, a compact seven-day strip, one dominant workout surface, conditional real metrics, one coach note, and the existing workout action. Keep rest/outside-week handling and logged state.

- [ ] **Step 7: Implement Plan as seven schedule rows**

Render each day of the stored week exactly once, use quiet Rest day rows when no session exists, show real duration/intensity/completion, and keep Manage plan links empty of preloaded chat content.

- [ ] **Step 8: Run focused and full tests**

Run: `npm test -- --run tests/lib/plan-metrics.test.ts tests/components/today-session.test.tsx tests/components/week-plan.test.tsx && npm test`  
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/plan/metrics.ts tests/lib/plan-metrics.test.ts components/today/TodaySession.tsx 'app/(main)/today/page.tsx' components/plan/WeekPlan.tsx 'app/(main)/plan/page.tsx' tests/components/today-session.test.tsx tests/components/week-plan.test.tsx
git commit -m "Redesign daily workout and weekly plan"
```

### Task 5: Restore temporary 3D coaches and coaching-area ownership

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `components/coach/CoachModelPreview.tsx`
- Modify: `components/coach/CoachAvatar.tsx`
- Modify: `components/coach/CoachStage.tsx`
- Modify: `components/coach/CoachSwitcher.tsx`
- Modify: `components/coach/CoachChat.tsx`
- Modify: `app/(main)/coach/page.tsx`
- Modify: `components/quiz/QuizWizard.tsx`
- Delete: `public/coaches/river-editorial.png`
- Delete: `public/coaches/jax-editorial.png`
- Delete: `public/coaches/sol-editorial.png`
- Delete: `public/coaches/nova-editorial.png`
- Modify: `tests/components/coach-stage.test.ts`
- Create: `tests/components/coach-navigation.test.tsx`

**Interfaces:**
- Consumes: existing `/coaches/{coachId}.glb` and `/coaches/{coachId}.webp` assets.
- Produces: `CoachModelPreview({ coach, presentation, replying })` with WebGL 2 detection, model-viewer, reduced-motion animation, and original static webp fallback.
- Produces: Coach screen Inbox link to `/inbox`.

- [ ] **Step 1: Rewrite the coach-stage test to require 3D with fallback**

Mock WebGL 2 and `@google/model-viewer`; assert the selected `.glb` source appears after load setup. In a no-WebGL case assert the original `.webp` fallback and usable text appear. Assert no `*-editorial.png` source appears.

- [ ] **Step 2: Add a failing coaching-navigation test**

Render the coaching header/area and assert an Inbox link targets `/inbox`; verify the message textbox starts with an empty value.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm test -- --run tests/components/coach-stage.test.ts tests/components/coach-navigation.test.tsx`  
Expected: FAIL because model-viewer is absent and Coach has no Inbox entry.

- [ ] **Step 4: Restore the model-viewer dependencies and component**

Install `@google/model-viewer@^4.4.0` and `three@^0.183.2`. Restore lazy viewer loading, reduced-motion behavior, Reply/Idle animation selection, drag interaction, and the WebGL fallback using existing original assets.

- [ ] **Step 5: Restore 3D presentation across Coach and selection flows**

Make CoachStage render CoachModelPreview; make CoachAvatar use original `.webp` assets; remove rejected editorial PNGs; keep onboarding selection lightweight and themed without human illustrations.

- [ ] **Step 6: Add Inbox ownership and preserve empty composer behavior**

Add the Inbox link within Coach, restyle chat with semantic surfaces, and do not add initial text, suggested prompts, or query-driven prefill.

- [ ] **Step 7: Run focused and full tests**

Run: `npm test -- --run tests/components/coach-stage.test.ts tests/components/coach-navigation.test.tsx tests/lib/plan-revision.test.ts && npm test`  
Expected: all PASS, including plan-update behavior.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json components/coach components/quiz/QuizWizard.tsx 'app/(main)/coach/page.tsx' public/coaches tests/components/coach-stage.test.ts tests/components/coach-navigation.test.tsx
git commit -m "Restore themed 3D coach experience"
```

### Task 6: More settings, appearance control, and progress surfaces

**Files:**
- Create: `components/theme/AppearanceControl.tsx`
- Modify: `app/(main)/more/page.tsx`
- Modify: `app/(main)/progress/page.tsx`
- Modify: `components/progress/HealthConnections.tsx`
- Modify: `components/progress/HistoryList.tsx`
- Modify: `components/progress/StreakBadge.tsx`
- Modify: `components/progress/WeightCheckIn.tsx`
- Create: `tests/components/appearance-control.test.tsx`
- Modify: `tests/components/health-connections.test.tsx`

**Interfaces:**
- Consumes: `AppearanceMode`, `saveProfile()`, and root theme announcement from Task 1.
- Produces: `AppearanceControl({ profile, onChanged })` with System, Light, Dark choices.

- [ ] **Step 1: Write a failing appearance-control test**

Assert three accessible choices, current selection, preservation of all other profile fields, `saveProfile()` with the new appearance, and immediate `onChanged` notification.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run tests/components/appearance-control.test.tsx`  
Expected: FAIL because the control does not exist.

- [ ] **Step 3: Implement More settings and appearance**

Add AppearanceControl alongside account, coach switcher, coaching preferences, and HealthConnections. Keep the page grouped with quiet section separation instead of identical heavy cards.

- [ ] **Step 4: Restyle Progress and health surfaces without behavior changes**

Apply semantic themes and the approved hierarchy. Preserve sign-in, unavailable, sync, disconnect, history, weight, and reflection logic exactly.

- [ ] **Step 5: Run focused and full tests**

Run: `npm test -- --run tests/components/appearance-control.test.tsx tests/components/health-connections.test.tsx && npm test`  
Expected: all PASS, including signed-out and unconfigured Strava states.

- [ ] **Step 6: Commit**

```bash
git add components/theme/AppearanceControl.tsx 'app/(main)/more/page.tsx' 'app/(main)/progress/page.tsx' components/progress tests/components/appearance-control.test.tsx tests/components/health-connections.test.tsx
git commit -m "Add appearance and settings hub"
```

### Task 7: Apply the approved system to onboarding, account, and workout routes

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/quiz/page.tsx`
- Modify: `components/quiz/QuizWizard.tsx`
- Modify: `components/quiz/IntakeConversation.tsx`
- Modify: `components/quiz/IntakeReview.tsx`
- Modify: `app/acknowledgment/page.tsx`
- Modify: `app/account/page.tsx`
- Modify: `app/workout/[sessionId]/page.tsx`
- Modify: `components/account/AccountProvider.tsx`
- Create: `tests/components/quiz-theme.test.tsx`

**Interfaces:**
- Consumes: `announceTheme()` and semantic CSS tokens.
- Produces: onboarding coach selection that previews the selected palette before profile save.
- Produces: workout route-level `.theme-dark` override using current coach palette.

- [ ] **Step 1: Write a failing onboarding-theme test**

Render the coach-selection step, select Nova, and assert `announceTheme({ coachId: "nova", appearance: "system" })`; assert no editorial portrait path or 3D preview-expansion copy appears.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --run tests/components/quiz-theme.test.tsx`  
Expected: FAIL because selection does not announce the draft theme.

- [ ] **Step 3: Theme welcome, onboarding, acknowledgment, and account**

Use River until the quiz selects a coach, announce draft coach changes immediately, and replace remaining editorial/violet/hard-shadow classes with semantic surfaces. Preserve the conversational intake and account behavior.

- [ ] **Step 4: Theme workout execution with the active dark palette**

Keep workout execution dark regardless of the global appearance setting, but use the selected coach's dark canvas, raised surface, accent, and focus tokens. Preserve logging and navigation behavior.

- [ ] **Step 5: Run focused and full tests**

Run: `npm test -- --run tests/components/quiz-theme.test.tsx tests/lib/intake.test.ts tests/lib/store-profile.test.ts && npm test`  
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/quiz/page.tsx components/quiz app/acknowledgment/page.tsx app/account/page.tsx 'app/workout/[sessionId]/page.tsx' components/account/AccountProvider.tsx tests/components/quiz-theme.test.tsx
git commit -m "Theme onboarding and workout flows"
```

### Task 8: Whole-application verification and visual correction

**Files:**
- Modify only files required by a failing verification or confirmed review finding.

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: verified production build and live preview.

- [ ] **Step 1: Run the complete automated gate**

Run: `npm test && npm run lint && npx tsc --noEmit && npm run build && git diff --check`  
Expected: 0 failures, 0 lint/type errors, successful production build, clean diff check.

- [ ] **Step 2: Verify theme and layout at mobile widths**

In the browser inspect 320px, 390px, and 430px widths for Today, Plan, Coach, Progress, More, Inbox, welcome, quiz, acknowledgment, account, and workout. Check no horizontal overflow, hidden actions, bottom-nav overlap, or clipped model.

- [ ] **Step 3: Verify all theme transitions**

For each coach, inspect light and dark appearance; verify coach switch updates immediately, system follows browser preference, pre-profile defaults to River, and workout remains coach-themed dark.

- [ ] **Step 4: Verify behavior and failure states**

Exercise empty coach composer, coach plan update reflected on Plan, undo/retry, Inbox access, WebGL fallback, signed-out health UI, unconfigured Strava, reduced motion, and existing stored-profile migration.

- [ ] **Step 5: Request a fresh-context whole-branch review**

Review the implementation against this plan and the spec. Address all Critical and Important findings, then rerun Step 1.

- [ ] **Step 6: Restart the live preview and commit any verification fixes**

Leave `http://127.0.0.1:4310` running on the verified commit and report any external setup still required for Strava, Apple Health, or Garmin.
