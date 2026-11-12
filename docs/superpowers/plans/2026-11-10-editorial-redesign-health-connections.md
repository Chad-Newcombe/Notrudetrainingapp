# Editorial Redesign and Health Connections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3D/flat UI with an athletic editorial system and replace mock health sync with real Strava OAuth plus truthful Apple Health and Garmin availability.

**Architecture:** Coach visuals become static optimized PNG portraits rendered through existing React components. Global design tokens and shared components carry the new aesthetic across screens. Health provider metadata remains client-safe, while Strava authorization, refresh tokens, sync, and revocation live exclusively in Node routes backed by the existing SQLite account database.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, next/font, SQLite, Vitest, Strava API v3.

**Spec:** `docs/superpowers/specs/2026-11-10-editorial-redesign-health-connections-design.md`

## Global Constraints

- Do not store OAuth tokens in browser storage or return them to client code.
- Do not present Apple Health or Garmin as connectable from the current web runtime.
- Preserve all existing plans, profiles, chat history, logs, and coach behavior.
- Remove runtime WebGL/model-viewer dependence from coach presentation.
- Keep keyboard focus, 44px targets, safe areas, and reduced-motion support.

## Review Focus

- Missing Strava credentials must show unavailable state instead of starting a broken redirect.
- OAuth state must expire, be single-use, and remain bound to the signed-in user.
- Expired Strava access tokens must refresh before activity sync.
- Failed sync or revoke must not falsely mark the connection successful.
- Generated portraits must remain legible and uncropped across picker, avatar, and hero sizes.

---

### Task 1: Health provider contracts

**Files:**
- Modify: `tests/lib/health-registry.test.ts`
- Modify: `lib/health/types.ts`
- Modify: `lib/health/registry.ts`
- Create: `tests/lib/strava.test.ts`
- Create: `lib/health/strava.ts`

**Interfaces:**
- Produces: `HealthProviderDefinition`, `stravaAuthorizationUrl()`, `summarizeStravaActivities()`.

- [ ] Write failing tests for provider modes, OAuth URL parameters, and literal activity summaries.
- [ ] Run focused tests and confirm failures are caused by the missing contracts.
- [ ] Implement metadata-only providers and pure Strava helpers.
- [ ] Run focused and full tests.
- [ ] Commit.

### Task 2: Server-side Strava OAuth

**Files:**
- Modify: `lib/account/server.ts`
- Create: `lib/health/strava-server.ts`
- Create: `app/api/health/strava/connect/route.ts`
- Create: `app/api/health/strava/callback/route.ts`
- Create: `app/api/health/strava/status/route.ts`
- Create: `app/api/health/strava/sync/route.ts`
- Create: `app/api/health/strava/disconnect/route.ts`

**Interfaces:**
- Consumes: pure helpers from Task 1.
- Produces: authenticated OAuth, status, sync, and disconnect endpoints.

- [ ] Add failing tests for token-expiry and authorization-state decisions in the pure boundary helpers.
- [ ] Run focused tests and confirm RED.
- [ ] Add SQLite token/state tables and implement server-only provider operations.
- [ ] Add thin routes with session, origin, state-expiry, and error handling.
- [ ] Run focused and full tests.
- [ ] Commit.

### Task 3: Honest health connection UI

**Files:**
- Modify: `components/progress/HealthConnections.tsx`
- Delete: `lib/health/mock-apple.ts`
- Delete: `lib/health/mock-garmin.ts`
- Delete: `lib/health/mock-strava.ts`

**Interfaces:**
- Consumes: provider definitions and Strava endpoints.

- [ ] Write a failing component test covering sign-in, configured Strava, and unavailable native/partner providers.
- [ ] Run the component test and confirm RED.
- [ ] Implement connect, sync, disconnect, URL result messaging, and honest disabled states.
- [ ] Run component and full tests.
- [ ] Commit.

### Task 4: Coach art and editorial design system

**Files:**
- Add: `public/coaches/*-editorial.png`
- Modify: `components/coach/CoachAvatar.tsx`
- Modify: `components/coach/CoachStage.tsx`
- Delete: `components/coach/CoachModelPreview.tsx`
- Modify: `components/ui/Button.tsx`
- Modify: `components/shell/BottomTabs.tsx`
- Modify: `components/brand/NotrudeMark.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: core page components containing legacy violet styles.

**Interfaces:**
- Produces: shared editorial tokens, tactile controls, static coach portrait presentation.

- [ ] Add a failing render test proving CoachStage uses an image and exposes no 3D interaction.
- [ ] Run the test and confirm RED.
- [ ] Move generated portraits into the project and replace model-viewer rendering.
- [ ] Apply the compact token system and tactile shared controls.
- [ ] Remove unused 3D dependencies.
- [ ] Run tests, lint, and build.
- [ ] Inspect Today, Coach, Plan, More, and onboarding at mobile width; correct overflow, contrast, and cropping.
- [ ] Commit.

### Task 5: Final verification and review

**Files:**
- Modify only when a failing verification or review finding requires it.

- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.
- [ ] Exercise Strava unavailable and signed-out states without exposing secrets.
- [ ] Restart the local preview and visually verify the generated portraits and tactile controls.
- [ ] Request a fresh-context whole-branch review and address Critical/Important findings.
