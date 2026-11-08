# Notrude Empathetic Training App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an iOS-first PWA that onboards via an open-ended goal quiz, generates an empathetic AI training week, and supports Today / Plan / Coach / Progress with mock health sync and message outlines.

**Architecture:** Next.js App Router client holds all user data in IndexedDB; thin Route Handlers use Vercel AI SDK (v6) for plan generation, reflections, streaming coach chat, and message composition, with deterministic fixtures when no API key is set.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Vercel AI SDK (`ai` v6), Zod, `idb` for IndexedDB, Vitest for unit tests, PWA manifest.

## Global Constraints

- Brand name **Notrude** must be hero-level on Welcome (not nav-only).
- Never shame weight, missed days, or “falling behind” in any UI copy or prompt.
- Weight fields and Progress weight UI only appear when `profile.trackWeight === true`.
- Goals are fully open-ended — plans must adapt (ultra vs cautious start), not one template.
- No accounts / cloud sync in v1 — IndexedDB is source of truth.
- No real SMS/email send; compose drafts only.
- No real HealthKit/Strava/Garmin OAuth; mock adapters + `HealthSource` interface only.
- AI: use AI Gateway model string (e.g. `model: "openai/gpt-4.1-mini"`) via `ai` package; if no key, use fixtures.
- iOS-first mobile layout: bottom tabs, safe-area padding, max-width phone column.
- Empathy/safety rules from `lib/ai/empathy.ts` must be included in every AI system prompt.
- Prefer small focused files; one responsibility per module.

---

## File Structure

```
package.json
vitest.config.ts
.next / node_modules (generated)
public/
  icons/icon-192.png
  icons/icon-512.png
app/
  globals.css
  layout.tsx
  page.tsx                          # Welcome
  quiz/page.tsx
  acknowledgment/page.tsx
  workout/[sessionId]/page.tsx
  (main)/
    layout.tsx                      # Bottom tab shell
    today/page.tsx
    plan/page.tsx
    coach/page.tsx
    progress/page.tsx
  api/
    coach/route.ts
    plan/route.ts
    reflect/route.ts
    compose-message/route.ts
lib/
  types.ts
  ids.ts
  dates.ts
  ai/
    empathy.ts
    model.ts
    fixtures.ts
    schemas.ts
  store/
    db.ts
    profile.ts
    plan.ts
    logs.ts
    chat.ts
    progress.ts
    health.ts
    messages.ts
    index.ts
  health/
    types.ts
    registry.ts
    mock-strava.ts
    mock-garmin.ts
    mock-apple.ts
  progress/
    streaks.ts
  hooks/
    useNotrudeStore.ts
components/
  brand/NotrudeMark.tsx
  quiz/QuizWizard.tsx
  today/TodaySession.tsx
  plan/WeekPlan.tsx
  coach/CoachChat.tsx
  coach/QuickChips.tsx
  progress/HistoryList.tsx
  progress/StreakBadge.tsx
  progress/WeightCheckIn.tsx
  progress/MessageDrafts.tsx
  progress/HealthConnections.tsx
  shell/BottomTabs.tsx
  ui/Button.tsx
  ui/ChoiceCard.tsx
  ui/ProgressDots.tsx
tests/
  lib/types-profile.test.ts
  lib/store-profile.test.ts
  lib/streaks.test.ts
  lib/fixtures-plan.test.ts
  lib/health-registry.test.ts
  lib/empathy.test.ts
  lib/compose-fixture.test.ts
```

---

### Task 1: Scaffold Next.js app, tokens, PWA shell, Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `public/manifest.webmanifest`, `components/brand/NotrudeMark.tsx`, `components/ui/Button.tsx`
- Test: `tests/lib/empathy.test.ts` (created empty empathy stub tested in Task 2 — for this task test Welcome renders brand via a simple component test optional; primary verify: `npm run build`)

**Interfaces:**
- Consumes: none
- Produces: runnable Next app; CSS variables `--bg0`, `--bg1`, `--ink`, `--muted`, `--accent`, `--accent-soft`, `--danger-soft`; font stack via Google fonts `Fraunces` + `Source Sans 3`

- [ ] **Step 1: Create Next.js app in repo root**

```bash
cd /workspace
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack --yes
```

If the non-empty README blocks create-next-app, scaffold manually: write `package.json` with `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `@tailwindcss/postcss`, then `npm install`.

- [ ] **Step 2: Install app dependencies**

```bash
npm install ai zod idb
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Design tokens + root layout**

`app/globals.css` — atmospheric background, no flat single color; avoid purple-default and cream+terracotta clichés. Use deep forest-teal + warm sand ink:

```css
@import "tailwindcss";

:root {
  --bg0: #0f2a24;
  --bg1: #1a3d34;
  --ink: #f3efe6;
  --muted: #b7c4be;
  --accent: #e2b15a;
  --accent-soft: rgba(226, 177, 90, 0.18);
  --surface: rgba(255, 255, 255, 0.06);
  --danger-soft: #f0c7b4;
  --font-display: "Fraunces", serif;
  --font-body: "Source Sans 3", system-ui, sans-serif;
}

html, body {
  min-height: 100%;
  background:
    radial-gradient(120% 80% at 10% -10%, #2a5a4c 0%, transparent 55%),
    radial-gradient(90% 60% at 100% 0%, #3d4a2e 0%, transparent 45%),
    linear-gradient(165deg, var(--bg0), var(--bg1));
  color: var(--ink);
  font-family: var(--font-body);
}

.font-display { font-family: var(--font-display); }

.app-shell {
  max-width: 430px;
  margin: 0 auto;
  min-height: 100dvh;
  padding-bottom: calc(4.5rem + env(safe-area-inset-bottom));
}
```

`app/layout.tsx` — load Fraunces + Source Sans 3, set metadata title `Notrude`, link manifest, theme-color `#0f2a24`.

- [ ] **Step 5: Welcome page + Button + brand mark**

`components/brand/NotrudeMark.tsx` — large display wordmark “Notrude”.

`app/page.tsx` — one composition: brand, headline “Training that meets you where you are.”, one supporting sentence, one CTA linking to `/quiz`. No stats, no cards in hero.

`public/manifest.webmanifest`:

```json
{
  "name": "Notrude",
  "short_name": "Notrude",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f2a24",
  "theme_color": "#0f2a24",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Create simple solid-color PNGs for icons (or SVG converted) under `public/icons/`.

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: success.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Notrude Next.js PWA shell and design tokens"
```

---

### Task 2: Domain types, empathy rules, ID/date helpers

**Files:**
- Create: `lib/types.ts`, `lib/ids.ts`, `lib/dates.ts`, `lib/ai/empathy.ts`
- Test: `tests/lib/types-profile.test.ts`, `tests/lib/empathy.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - Types: `UserProfile`, `TrainingPlan`, `PlanSession`, `WorkoutLog`, `ChatMessage`, `ProgressSnapshot`, `HealthConnection`, `ComposedMessage`, engagement unions from spec §8
  - `createId(): string`
  - `weekStartIso(d?: Date): string`
  - `EMPATHY_SYSTEM_RULES: string`
  - `assertNoShameCopy(text: string): boolean` helper used in tests

- [ ] **Step 1: Write failing tests**

`tests/lib/types-profile.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { UserProfile } from "@/lib/types";

describe("UserProfile shape", () => {
  it("allows open-ended goal without weight", () => {
    const profile: UserProfile = {
      goalText: "Train for my first ultra",
      tone: "steady",
      cadence: "conversational",
      motivation: "process_focus",
      channels: ["in_app", "email_outline"],
      trackWeight: false,
      createdAt: "2026-11-08T00:00:00.000Z",
    };
    expect(profile.trackWeight).toBe(false);
    expect(profile.currentWeightLbs).toBeUndefined();
  });
});
```

`tests/lib/empathy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { EMPATHY_SYSTEM_RULES, assertNoShameCopy } from "@/lib/ai/empathy";

describe("empathy rules", () => {
  it("includes no-shame and open-ended goal guidance", () => {
    expect(EMPATHY_SYSTEM_RULES).toMatch(/never shame/i);
    expect(EMPATHY_SYSTEM_RULES).toMatch(/own words|open-ended/i);
    expect(EMPATHY_SYSTEM_RULES).toMatch(/injury|pain/i);
  });

  it("flags shaming phrases", () => {
    expect(assertNoShameCopy("You fell behind again")).toBe(false);
    expect(assertNoShameCopy("Glad you showed up today")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test
```

Expected: FAIL module not found.

- [ ] **Step 3: Implement types + helpers + empathy**

`lib/types.ts` — copy conceptual types from spec §8 exactly; add:

```ts
export type ChatRole = "user" | "assistant" | "system";
export type ChatMessage = { id: string; role: ChatRole; content: string; createdAt: string };
export type ProgressSnapshot = {
  id: string;
  type: "weight" | "checkin" | "reflection";
  value?: number;
  note?: string;
  createdAt: string;
};
export type HealthProviderId = "apple_health" | "strava" | "garmin";
export type HealthConnection = {
  provider: HealthProviderId;
  connected: boolean;
  lastSyncedAt?: string;
  sampleSummary?: string;
};
export type ComposedMessage = {
  id: string;
  channel: "text_style" | "email_outline";
  subject?: string;
  body: string;
  createdAt: string;
};
```

`lib/ids.ts`:

```ts
export function createId(): string {
  return crypto.randomUUID();
}
```

`lib/dates.ts`:

```ts
export function weekStartIso(d = new Date()): string {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + diff);
  return x.toISOString();
}
```

`lib/ai/empathy.ts` — long string covering: never shame; meet ability; plain language; match engagement; validate context; no medical claims; injury → scale/rest/professional care. `assertNoShameCopy` checks a small blocklist (`fell behind`, `no excuse`, `you should have`, `lazy`, `failed again`).

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add lib tests
git commit -m "feat: add domain types and empathy rules"
```

---

### Task 3: IndexedDB store modules

**Files:**
- Create: `lib/store/db.ts`, `lib/store/profile.ts`, `lib/store/plan.ts`, `lib/store/logs.ts`, `lib/store/chat.ts`, `lib/store/progress.ts`, `lib/store/health.ts`, `lib/store/messages.ts`, `lib/store/index.ts`, `lib/hooks/useNotrudeStore.ts`
- Test: `tests/lib/store-profile.test.ts` (use `fake-indexeddb/auto`)

**Interfaces:**
- Consumes: types + `createId`
- Produces:
  - `getProfile(): Promise<UserProfile | null>`
  - `saveProfile(p: UserProfile): Promise<void>`
  - `getPlan(): Promise<TrainingPlan | null>` / `savePlan(plan: TrainingPlan): Promise<void>`
  - `listLogs(): Promise<WorkoutLog[]>` / `upsertLog(log: WorkoutLog): Promise<void>`
  - `listChat(): Promise<ChatMessage[]>` / `appendChat(m: ChatMessage): Promise<void>` / `replaceChat(msgs: ChatMessage[]): Promise<void>`
  - `listProgress(): Promise<ProgressSnapshot[]>` / `addProgress(s: ProgressSnapshot): Promise<void>`
  - `listHealth(): Promise<HealthConnection[]>` / `saveHealth(c: HealthConnection): Promise<void>`
  - `listMessages(): Promise<ComposedMessage[]>` / `addMessage(m: ComposedMessage): Promise<void>`
  - `clearAll(): Promise<void>`
  - `useNotrudeStore()` React hook loading profile/plan/logs and exposing refreshers

- [ ] **Step 1: Install fake-indexeddb and write failing test**

```bash
npm install -D fake-indexeddb
```

`tests/lib/store-profile.test.ts`:

```ts
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll, getProfile, saveProfile } from "@/lib/store";

describe("profile store", () => {
  beforeEach(async () => {
    await clearAll();
  });

  it("round-trips a profile", async () => {
    await saveProfile({
      goalText: "Lose weight gently",
      tone: "gentle",
      cadence: "brief",
      motivation: "celebrate_wins",
      channels: ["in_app", "text_style"],
      trackWeight: true,
      currentWeightLbs: 400,
      targetWeightLbs: 350,
      createdAt: new Date().toISOString(),
    });
    const p = await getProfile();
    expect(p?.goalText).toBe("Lose weight gently");
    expect(p?.currentWeightLbs).toBe(400);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- tests/lib/store-profile.test.ts
```

- [ ] **Step 3: Implement IDB with `idb`**

`lib/store/db.ts` — DB name `notrude`, version 1, stores: `meta` (keyval for profile/plan), `logs`, `chat`, `progress`, `health` (keyPath `provider`), `messages`.

Implement each module exporting the functions listed above. `lib/store/index.ts` re-exports all.

`useNotrudeStore` — client hook: `useEffect` load profile/plan/logs; return `{ ready, profile, plan, logs, reload }`.

- [ ] **Step 4: Tests PASS**

```bash
npm test -- tests/lib/store-profile.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/store lib/hooks tests/lib/store-profile.test.ts package.json package-lock.json
git commit -m "feat: add IndexedDB local-first store"
```

---

### Task 4: AI model helper, Zod schemas, fixtures

**Files:**
- Create: `lib/ai/model.ts`, `lib/ai/schemas.ts`, `lib/ai/fixtures.ts`
- Test: `tests/lib/fixtures-plan.test.ts`

**Interfaces:**
- Consumes: `UserProfile`, `TrainingPlan` types, `EMPATHY_SYSTEM_RULES`
- Produces:
  - `hasAiKey(): boolean`
  - `getModel(): string` → `"openai/gpt-4.1-mini"`
  - `planSchema` Zod schema matching `TrainingPlan` sessions
  - `fixturePlanForProfile(profile: UserProfile): TrainingPlan` — if goal text matches `/ultra|marathon|race/i` → endurance-biased week; if `/lose|weight|begin|start/i` or high weight → gentle mobility/walk week; else mixed consistency week
  - `fixtureAcknowledgment(profile: UserProfile): string`
  - `fixtureCoachReply(userText: string, profile: UserProfile): string`
  - `fixtureComposedMessage(channel, profile): ComposedMessage`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { fixturePlanForProfile } from "@/lib/ai/fixtures";
import type { UserProfile } from "@/lib/types";

const base = {
  tone: "gentle" as const,
  cadence: "brief" as const,
  motivation: "celebrate_wins" as const,
  channels: ["in_app" as const],
  trackWeight: false,
  createdAt: "2026-11-08T00:00:00.000Z",
};

describe("fixturePlanForProfile", () => {
  it("builds an endurance-leaning week for ultra goals", () => {
    const plan = fixturePlanForProfile({ ...base, goalText: "Finish a 50k ultra" });
    expect(plan.sessions.length).toBeGreaterThanOrEqual(3);
    expect(plan.sessions.some((s) => /run|hike|endurance|walk/i.test(s.title + s.rationale))).toBe(true);
  });

  it("builds a gentle week for high-weight start language", () => {
    const plan = fixturePlanForProfile({
      ...base,
      goalText: "Just trying to lose weight and feel better",
      trackWeight: true,
      currentWeightLbs: 400,
    });
    expect(plan.sessions.every((s) => s.intensity !== "hard")).toBe(true);
  });
});
```

- [ ] **Step 2: Run — FAIL; implement fixtures + schemas + model; PASS; commit**

`lib/ai/model.ts`:

```ts
export function hasAiKey(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY);
}
export function getModel(): string {
  return process.env.NOTRUDE_MODEL ?? "openai/gpt-4.1-mini";
}
```

`lib/ai/schemas.ts` — Zod for plan JSON (`sessions` array with `dayIndex`, `title`, `rationale`, `steps`, `intensity`).

Fixtures must set `generatedFromGoal` to `profile.goalText` and stable ids via `createId`.

```bash
npm test -- tests/lib/fixtures-plan.test.ts
git add lib/ai tests/lib/fixtures-plan.test.ts
git commit -m "feat: add AI schemas, model helper, and demo fixtures"
```

---

### Task 5: API routes — plan, reflect, coach, compose-message

**Files:**
- Create: `app/api/plan/route.ts`, `app/api/reflect/route.ts`, `app/api/coach/route.ts`, `app/api/compose-message/route.ts`
- Test: manual curl + optional route unit smoke; keep fixtures path covered by Task 4 tests

**Interfaces:**
- Consumes: schemas, fixtures, empathy, `hasAiKey`, `getModel`
- Produces:
  - `POST /api/plan` body `{ profile: UserProfile, notes?: string }` → `{ plan: TrainingPlan }`
  - `POST /api/reflect` body `{ profile: UserProfile, kind: "acknowledgment" | "reflection" }` → `{ text: string }`
  - `POST /api/coach` UI message stream (AI SDK v6 `streamText` + `toUIMessageStreamResponse`); body includes messages + `profile` + optional `plan`/`logs`/`healthSummary`
  - `POST /api/compose-message` body `{ profile, channel: "text_style" | "email_outline", recentSummary?: string }` → `{ message: ComposedMessage }`

- [ ] **Step 1: Implement `/api/plan`**

Use AI SDK v6 structured output:

```ts
import { generateText, Output } from "ai";
import { planSchema } from "@/lib/ai/schemas";
import { EMPATHY_SYSTEM_RULES } from "@/lib/ai/empathy";
import { fixturePlanForProfile } from "@/lib/ai/fixtures";
import { hasAiKey, getModel } from "@/lib/ai/model";

export async function POST(req: Request) {
  const { profile, notes } = await req.json();
  if (!hasAiKey()) {
    return Response.json({ plan: fixturePlanForProfile(profile) });
  }
  const result = await generateText({
    model: getModel(),
    output: Output.object({ schema: planSchema }),
    system: EMPATHY_SYSTEM_RULES + "\nReturn a one-week training plan as JSON.",
    prompt: JSON.stringify({ profile, notes }),
  });
  return Response.json({ plan: result.output });
}
```

Map/normalize `result.output` into `TrainingPlan` (add `id`, `weekStartIso`, `generatedFromGoal`) in the route before responding.

- [ ] **Step 2: Implement `/api/reflect` and `/api/compose-message`** similarly with fixture fallback.

- [ ] **Step 3: Implement `/api/coach`**

```ts
import { streamText, convertToModelMessages, type UIMessage } from "ai";
// use toUIMessageStreamResponse()
```

Append empathy rules + serialized profile/plan/logs/health to `system`. On `!hasAiKey()`, return a plain `Response` streaming fixture text (or JSON `{ role, content }` fallback the client understands — prefer a non-stream JSON `{ text }` branch documented for the client when `X-Notrude-Fixture: 1`).

Simplest fixture path for coach: if `!hasAiKey()`, return `Response.json({ text: fixtureCoachReply(...) })` with status 200; client detects non-stream.

- [ ] **Step 4: Smoke test without key**

```bash
npm run dev
# other terminal:
curl -s localhost:3000/api/plan -H 'content-type: application/json' \
  -d '{"profile":{"goalText":"ultra 50k","tone":"steady","cadence":"brief","motivation":"process_focus","channels":["in_app"],"trackWeight":false,"createdAt":"2026-11-08T00:00:00.000Z"}}' | head
```

Expected: JSON with `plan.sessions`.

- [ ] **Step 5: Commit**

```bash
git add app/api
git commit -m "feat: add plan, reflect, coach, and compose-message API routes"
```

---

### Task 6: Quiz + acknowledgment flow

**Files:**
- Create: `app/quiz/page.tsx`, `components/quiz/QuizWizard.tsx`, `components/ui/ChoiceCard.tsx`, `components/ui/ProgressDots.tsx`, `app/acknowledgment/page.tsx`
- Modify: `app/page.tsx` (CTA already to `/quiz`)

**Interfaces:**
- Consumes: `saveProfile`, `/api/reflect`, `/api/plan`, `savePlan`
- Produces: completed onboarding → profile + plan in IDB → navigate to `/today`

- [ ] **Step 1: Build `QuizWizard` steps**

Steps in order:
1. `goalText` textarea (required)
2. optional current weight + activity + constraints; checkbox “I’d like to track weight” → `trackWeight`
3. optional target weight (only if trackWeight) + `targetDescription`
4. tone / cadence / motivation choice cards
5. channels multi-select (`in_app` always included if none selected)

Persist draft in React state; on finish `saveProfile` then `router.push("/acknowledgment")`.

- [ ] **Step 2: Acknowledgment page**

On mount: load profile → `POST /api/reflect` `{ kind: "acknowledgment" }` → show text → button “Start my first week” calls `POST /api/plan` → `savePlan` → `/today`.

Include subtle fade-in motion on acknowledgment text (`@keyframes` in CSS).

- [ ] **Step 3: Manual test in browser**

Complete quiz without weight; confirm acknowledgment; confirm plan saved and Today loads.

- [ ] **Step 4: Commit**

```bash
git add app/quiz app/acknowledgment components/quiz components/ui
git commit -m "feat: add onboarding quiz and AI acknowledgment"
```

---

### Task 7: Main shell, Today, Plan, Workout play

**Files:**
- Create: `app/(main)/layout.tsx`, `components/shell/BottomTabs.tsx`, `app/(main)/today/page.tsx`, `app/(main)/plan/page.tsx`, `app/workout/[sessionId]/page.tsx`, `components/today/TodaySession.tsx`, `components/plan/WeekPlan.tsx`
- Modify: redirect helpers — if no profile, send to `/`; if profile but no plan, `/acknowledgment`

**Interfaces:**
- Consumes: store hooks, `upsertLog`
- Produces: usable daily workout loop

- [ ] **Step 1: Bottom tabs layout** — Today / Plan / Coach / Progress; safe-area; active state uses `--accent`.

- [ ] **Step 2: Today page** — pick session for today’s `dayIndex` (Mon=0 … Sun=6 relative to `weekStartIso`); show title, rationale, steps preview, coach nudge line from profile tone; CTA Start → `/workout/[id]`. If rest day / no session, show gentle rest copy + link to Coach.

- [ ] **Step 3: Workout play** — step through steps; actions Done → `upsertLog({ status: "completed" })`; Partial; Skip (no shame copy: “Okay — we can adjust. Want a lighter option in Coach?”).

- [ ] **Step 4: Plan page** — list week sessions; CTA “Ask coach to adjust” → `/coach` with query `?prompt=Please%20adjust%20my%20week`.

- [ ] **Step 5: Manual test + commit**

```bash
git add app/\(main\) app/workout components/today components/plan components/shell
git commit -m "feat: add Today, Plan, and workout play with logging"
```

---

### Task 8: Coach chat UI

**Files:**
- Create: `app/(main)/coach/page.tsx`, `components/coach/CoachChat.tsx`, `components/coach/QuickChips.tsx`

**Interfaces:**
- Consumes: `/api/coach`, chat store, profile/plan/logs/health summary
- Produces: streaming (or fixture) conversation persisted to IDB

- [ ] **Step 1: Implement `CoachChat`**

Prefer AI SDK v6 `useChat` with `DefaultChatTransport({ api: "/api/coach" })`. Pass profile context via transport `body` prepareSendMessagesRequest if supported; otherwise custom `fetch` that merges JSON `{ messages, profile, plan, logs, healthSummary }`.

On fixture JSON responses, append assistant message manually.

Persist messages with `replaceChat` / `appendChat` on settle.

- [ ] **Step 2: Quick chips** — “Too hard today”, “Make it shorter”, “Remind me why I’m doing this” — insert as user message.

- [ ] **Step 3: Honor `?prompt=` from Plan page — auto-send once.

- [ ] **Step 4: Manual test fixture path + commit**

```bash
git add app/\(main\)/coach components/coach
git commit -m "feat: add empathetic coach chat with quick chips"
```

---

### Task 9: Progress — history, streaks, optional weight, reflections

**Files:**
- Create: `lib/progress/streaks.ts`, `app/(main)/progress/page.tsx`, `components/progress/HistoryList.tsx`, `components/progress/StreakBadge.tsx`, `components/progress/WeightCheckIn.tsx`
- Test: `tests/lib/streaks.test.ts`

**Interfaces:**
- Consumes: logs, progress store, `/api/reflect` kind `reflection`
- Produces: `computeStreak(logs: WorkoutLog[]): number` — consecutive days with a `completed` or `partial` log ending today or yesterday (no shame if 0)

- [ ] **Step 1: Failing streak tests**

```ts
import { describe, it, expect } from "vitest";
import { computeStreak } from "@/lib/progress/streaks";

describe("computeStreak", () => {
  it("returns 0 for empty logs", () => {
    expect(computeStreak([])).toBe(0);
  });
});
```

Implement consecutive-day logic; add a second test with two sequential completed days → streak 2.

- [ ] **Step 2: Progress page sections** — StreakBadge (“X days of showing up” / “Ready when you are” for 0), HistoryList, WeightCheckIn **only if** `profile.trackWeight`, button “Write a short reflection” → API → `addProgress`.

- [ ] **Step 3: Tests + manual + commit**

```bash
npm test -- tests/lib/streaks.test.ts
git add lib/progress components/progress app/\(main\)/progress tests/lib/streaks.test.ts
git commit -m "feat: add progress history, streaks, and optional weight check-in"
```

---

### Task 10: Compose message drafts (text / email outlines)

**Files:**
- Create: `components/progress/MessageDrafts.tsx`
- Modify: `app/(main)/progress/page.tsx`
- Test: `tests/lib/compose-fixture.test.ts`

**Interfaces:**
- Consumes: `/api/compose-message`, messages store, profile.channels
- Produces: drafts listed with Copy buttons (`navigator.clipboard.writeText`)

- [ ] **Step 1: Test fixture composer returns subject for email and none required for text**

```ts
import { describe, it, expect } from "vitest";
import { fixtureComposedMessage } from "@/lib/ai/fixtures";

describe("fixtureComposedMessage", () => {
  it("builds email outline with subject", () => {
    const m = fixtureComposedMessage("email_outline", {
      goalText: "ultra",
      tone: "steady",
      cadence: "conversational",
      motivation: "accountability",
      channels: ["email_outline"],
      trackWeight: false,
      createdAt: "2026-11-08T00:00:00.000Z",
    });
    expect(m.subject).toBeTruthy();
    expect(m.body.length).toBeGreaterThan(20);
  });
});
```

- [ ] **Step 2: UI** — if channels include text/email, show “Generate text nudge” / “Generate email outline”; save via `addMessage`; list history; Copy.

- [ ] **Step 3: Commit**

```bash
git add components/progress/MessageDrafts.tsx app/\(main\)/progress tests/lib/compose-fixture.test.ts lib/ai/fixtures.ts
git commit -m "feat: add text and email outline message drafts"
```

---

### Task 11: Health source adapters + Progress connections UI

**Files:**
- Create: `lib/health/types.ts`, `lib/health/registry.ts`, `lib/health/mock-strava.ts`, `lib/health/mock-garmin.ts`, `lib/health/mock-apple.ts`, `components/progress/HealthConnections.tsx`
- Modify: progress page; coach context builder to include `sampleSummary` from connected sources
- Test: `tests/lib/health-registry.test.ts`

**Interfaces:**
- Consumes: health store
- Produces:

```ts
export type HealthActivity = { id: string; title: string; minutes: number; at: string };
export interface HealthSource {
  id: HealthProviderId;
  label: string;
  availabilityNote?: string; // Apple: "Real sync needs the native iOS app"
  connect(): Promise<{ summary: string; activities: HealthActivity[] }>;
  disconnect(): Promise<void>;
  listActivities(): Promise<HealthActivity[]>;
}
export function getHealthSources(): HealthSource[];
export function getHealthSource(id: HealthProviderId): HealthSource;
```

- [ ] **Step 1: Failing registry test** — `getHealthSources()` returns 3 ids; Strava connect returns activities; Apple has `availabilityNote`.

- [ ] **Step 2: Implement mocks** — deterministic sample activities; `connect` writes `HealthConnection` via store (call from UI).

- [ ] **Step 3: UI cards** — Connect / Disconnect; show summary; Apple note visible.

- [ ] **Step 4: Wire summary into CoachChat request body as `healthSummary` string.

- [ ] **Step 5: Commit**

```bash
git add lib/health components/progress/HealthConnections.tsx tests/lib/health-registry.test.ts
git commit -m "feat: add mock health adapters and connections UI"
```

---

### Task 12: Polish, redirects, demo seed, README

**Files:**
- Modify: `app/layout.tsx`, tab layout redirects, `README.md`
- Create: `lib/demo/seed.ts` optional “Try a demo profile” on Welcome (ultra OR gentle-start)

**Interfaces:**
- Consumes: all stores
- Produces: polished demo path without quiz

- [ ] **Step 1: Guard routes** — client pages without profile → `/`; Welcome if profile exists shows “Continue” to `/today`.

- [ ] **Step 2: Empty/error states** — coach unavailable retry; plan generation spinner; offline note for AI.

- [ ] **Step 3: README** — how to run, env vars `AI_GATEWAY_API_KEY` optional, fixture mode, PWA add-to-home on iPhone.

- [ ] **Step 4: Full verification**

```bash
npm test
npm run build
npm run dev
```

Walk: Welcome → Quiz (both ultra and high-weight personas in two passes or demo seeds) → Acknowledgment → Today → Complete workout → Progress streak → Connect Strava mock → Coach chip → Generate email outline.

- [ ] **Step 5: Commit**

```bash
git add README.md app lib
git commit -m "feat: polish Notrude demo flows and document setup"
```

---

## Spec coverage checklist (self-review)

| Spec requirement | Task |
|---|---|
| Welcome + quiz + open-ended goal | 1, 6 |
| Engagement tone/cadence/motivation + channels | 6, 10 |
| Acknowledgment AI | 5, 6 |
| Week plan + Today + workout log | 5, 7 |
| Coach always available | 5, 8 |
| Progress history/streaks/reflections/optional weight | 9 |
| Text/email outlines mock | 5, 10 |
| Health mock adapters | 11 |
| Empathy / no shame / injury | 2, 5 |
| Fixture fallback without API key | 4, 5 |
| iOS-first PWA | 1, 7, 12 |
| Local-first IndexedDB | 3 |

**Placeholder scan:** none intentional.  
**Type consistency:** `UserProfile`, `TrainingPlan`, `HealthProviderId`, store function names as defined in Tasks 2–3; APIs consume those names throughout.
