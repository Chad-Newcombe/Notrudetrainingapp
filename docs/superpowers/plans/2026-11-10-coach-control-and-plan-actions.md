# Coach Control and Plan Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make coach replies defer to explicit user choices, allow coach switching during use, and automatically apply explicit chat-requested plan changes with a visible Undo action.

**Architecture:** Pure helpers classify plan-change intent, describe plan differences, and update coach profiles so behavior is deterministic and testable. CoachChat owns the active profile and plan state, triggers plan generation only after explicit user requests finish receiving a coach reply, saves the revision, and retains the previous plan for one-level Undo. A reusable CoachSwitcher persists coach selection without clearing other stored data.

**Tech Stack:** Next.js 15, React 19, TypeScript, AI SDK, IndexedDB/account storage, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-10-coach-control-and-plan-actions-design.md`

## Global Constraints

- User instructions and saved preferences outrank coach personality.
- No starter prompts, suggested questions, quick chips, prefilled text, or unsolicited coach message.
- Automatic plan mutation occurs only after an explicit user plan-change request.
- Logged sessions remain unchanged and revisions contain no more than four scheduled sessions.
- Every successful automatic update shows its changes and one-level Undo.
- Coach switching preserves profile data, plan, logs, progress, Inbox, and conversation.
- No new dependency.

## Review Focus

- A vague complaint must not mutate the plan; Task 1 tests discussion intent separately from explicit requests.
- Words such as “change” outside training-plan context must not trigger a plan update; Task 1 tests the required action-plus-plan-context contract.
- A failed plan save must leave the old plan active; Task 2 verifies the save-before-state ordering through the controller helper.
- Undo after a successful update must restore the exact prior plan; Task 2 tests the plan transition round trip.
- Switching coaches must change only `coachId`; Task 3 tests that every other profile field remains equal.

---

### Task 1: User-priority coach rules and plan intent

**Files:**
- Modify: `lib/coaches/voice.ts`
- Modify: `lib/coach/plan-revision.ts`
- Modify: `tests/lib/coach-voice.test.ts`
- Modify: `tests/lib/plan-revision.test.ts`

**Interfaces:**
- Produces: `classifyPlanIntent(text: string): "explicit" | "discussion"`
- Produces: stronger `coachVoiceInstructions(profile)` priority and pushback rules.

- [ ] **Step 1: Write failing behavior tests**

Add literal cases proving explicit duration/day/activity/session changes classify as `explicit`, vague difficulty and unrelated uses of “change” classify as `discussion`, and coach instructions state that explicit user choices outrank coach style while allowing one safety pushback.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/lib/coach-voice.test.ts tests/lib/plan-revision.test.ts`
Expected: FAIL because `classifyPlanIntent` and the user-priority contract do not exist.

- [ ] **Step 3: Implement minimal helpers and instruction changes**

Implement deterministic action-plus-plan-context classification and update voice rules. Do not add model-based intent classification.

- [ ] **Step 4: Run focused and full tests**

Run: `npm test -- tests/lib/coach-voice.test.ts tests/lib/plan-revision.test.ts && npm test`
Expected: PASS.

### Task 2: Automatic saved plan updates and Undo

**Files:**
- Modify: `lib/coach/plan-revision.ts`
- Create: `components/coach/PlanUpdateStatus.tsx`
- Modify: `components/coach/CoachChat.tsx`
- Remove: `components/coach/PlanRevision.tsx`
- Modify: `tests/lib/plan-revision.test.ts`

**Interfaces:**
- Consumes: `classifyPlanIntent` from Task 1.
- Produces: `describePlanChanges(previous, next): PlanChange[]`.
- Produces: `planTransition(previous, next)` and `undoPlanTransition(transition)` state helpers.
- Produces: automatic `/api/plan` request, `savePlan`, visible change summary, and Undo in CoachChat.

- [ ] **Step 1: Write failing transition and diff tests**

Test changed, added, and removed sessions with hand-written expected labels. Test that Undo returns the exact previous plan object and that failed transitions do not replace active state.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- tests/lib/plan-revision.test.ts`
Expected: FAIL because change descriptions and transitions do not exist.

- [ ] **Step 3: Implement pure transition helpers**

Keep storage calls in the component; helpers model the state and visible change list without browser dependencies.

- [ ] **Step 4: Replace manual draft UI with automatic apply flow**

After a reply finishes, if its latest user message is explicit and has not already been handled, call `/api/plan`, save the returned plan, update active state, and render `Plan updated`, change lines, `See plan`, and `Undo`. On failure, keep the old plan and show retry. Do not render any plan action for discussion messages.

- [ ] **Step 5: Run focused tests and type verification**

Run: `npm test -- tests/lib/plan-revision.test.ts && npm run lint && npm run build`
Expected: PASS.

### Task 3: Mid-use coach switching

**Files:**
- Create: `lib/coaches/switch.ts`
- Create: `components/coach/CoachSwitcher.tsx`
- Modify: `components/coach/CoachChat.tsx`
- Modify: `app/(main)/coach/page.tsx`
- Modify: `app/(main)/progress/page.tsx`
- Create: `tests/lib/coach-switch.test.ts`

**Interfaces:**
- Produces: `profileWithCoach(profile: UserProfile, coachId: CoachId): UserProfile`.
- Produces: `CoachSwitcher({ profile, onChanged })` that persists via `saveProfile` and reports the full updated profile.
- CoachChat consumes the changed profile immediately for stage rendering and subsequent API requests.

- [ ] **Step 1: Write failing profile preservation tests**

Assert changing from River to Nova changes only `coachId`, preserves nested intake notes and preferences, and returns the original object for the already-selected coach.

- [ ] **Step 2: Run test to verify RED**

Run: `npm test -- tests/lib/coach-switch.test.ts`
Expected: FAIL because `profileWithCoach` does not exist.

- [ ] **Step 3: Implement profile helper and switcher**

Render four coach options with names and communication descriptions. Save selection and update the current view without adding a chat message.

- [ ] **Step 4: Add switcher entry points**

Place `Change coach` on Coach and More. CoachChat must use active profile state after a selection.

- [ ] **Step 5: Run all verification**

Run: `npm test && npm run lint && npm run build`
Expected: all tests pass, lint exits 0, build exits 0.
