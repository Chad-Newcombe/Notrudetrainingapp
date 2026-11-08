# Notrude — Empathetic Training Assistant (Design Spec)

**Date:** 2026-11-08  
**Status:** Approved for implementation planning  
**Product working name:** Notrude (`Notrudetrainingapp`)

## 1. Problem & product intent

People seeking fitness help often get judgmental tone, one-size-fits-all plans, or interfaces that ignore where they actually are — whether that is training for an ultra-marathon or beginning weight loss at a high body weight.

Notrude is an **empathetic training assistant**: easy to understand, grounded in the user’s true goals (in their own words), and honest about their starting point. The brand promise is coaching that is **not rude** — never shaming, never dismissive.

## 2. Goals for v1

- Onboard via a short quiz that captures open-ended goals, optional body metrics, and engagement preferences (tone, cadence, motivation style, communication channel).
- Generate a personalized training week from that profile using a real AI coach.
- Deliver a clear day-to-day workout experience plus an always-available AI coach.
- Support progress history, gentle streaks, optional check-ins, and goal reflections.
- Compose in-app “text” and “email outline” touchpoints (mock outbound; no real SMS/email send in v1).
- Show health-app connections (Apple Health, Strava, Garmin, etc.) with **mock sync** and a clean adapter interface for real integrations later.

## 3. Non-goals (v1)

- Native App Store binary / HealthKit direct access.
- Real outbound SMS or email delivery.
- Real Strava/Garmin OAuth (UI + adapters only; live APIs post-v1).
- Multi-device cloud sync / user accounts (local-first only).
- Medical diagnosis, nutrition prescriptions as clinical advice, or guaranteed outcomes.
- Social feeds, leaderboards, or competitive ranking.

## 4. Users & flexibility

Goals are **fully open-ended**. The system must adapt across extremes, for example:

- Endurance race training (e.g. ultra-marathon)
- Strength / recomposition
- Habit and consistency building
- Beginning movement / weight loss with high starting weight
- Maintenance or return from a break

Plans, language, and intensity must follow the stated goal and constraints — not a single default template.

## 5. Product flow

1. **Welcome** — Brand-forward intro; promise of non-judgmental coaching; CTA to start quiz.
2. **Quiz** (one step at a time):
   - Goal in their own words (required)
   - Where they are now (optional current weight, activity level, constraints/injuries)
   - Target (optional weight target and/or qualitative “what better looks like”)
   - Engagement: tone, interaction cadence, motivation style
   - Communication channel preference: in-app / text-style / email outlines (can combine)
3. **Acknowledgment** — AI reflects what it heard; names a gentle starting place; no lecture.
4. **Home (Today)** — Today’s session in plain language; primary CTA; soft coach nudge matching style.
5. **Coach** — Always-available streaming chat with full profile + plan + history context.
6. **Plan** — Current week; adjust via coach.
7. **Progress** — History, gentle streaks, optional weight/check-ins, reflections, health connections, message outlines.

## 6. Architecture

### 6.1 Stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **Vercel AI SDK** for streaming chat and structured plan/reflection generation
- **AI provider:** Vercel AI Gateway or a single configured model via env (`AI_GATEWAY_API_KEY` / provider key). If no key is present in local/demo, fall back to deterministic fixture plans and canned coach replies so the UI remains demoable.
- **iOS-first PWA** (mobile viewport, safe areas, Add to Home Screen)
- **Local-first persistence** via IndexedDB (localStorage bootstrap for first paint)

### 6.2 Client as source of truth (v1)

| Store | Contents |
|---|---|
| `UserProfile` | Goal text, optional weights, constraints, activity level, engagement prefs, channel prefs |
| `TrainingPlan` | Generated week of sessions |
| `WorkoutLog[]` | Completed / skipped / partial + notes |
| `ChatMessage[]` | Coach conversation history |
| `ProgressSnapshot[]` | Optional weight/check-ins, reflections |
| `HealthConnection[]` | Mock connection state + sample synced activities |
| `ComposedMessage[]` | Generated text-style / email-outline drafts |

### 6.3 Server (thin AI layer)

| Route | Role |
|---|---|
| `POST /api/coach` | Streaming chat; system prompt includes empathy rules + client-sent profile/plan/logs/health summary |
| `POST /api/plan` | Structured JSON week plan from profile (+ optional coach adjustment notes) |
| `POST /api/reflect` | Acknowledgment after quiz; periodic goal reflections |
| `POST /api/compose-message` | Generate text-style nudge or email-outline check-in from profile + recent activity |

No account database in v1. Context is sent from the client per request.

### 6.4 Empathy & safety rules (prompt + product)

- Never shame weight, missed days, or “falling behind.”
- Meet the user at their stated ability and constraints.
- Prefer clear next steps over jargon.
- Match engagement tone, cadence, and motivation style.
- Validate context (ultra prep vs. just starting) without hierarchy of worth.
- Educational fitness only — no medical claims.
- If injury/pain is mentioned: suggest scaling/rest and seeing a professional when appropriate.

## 7. UI / information architecture

### 7.1 Visual direction

- Calm, grounded, readable — not a gym-bro dashboard.
- Soft atmospheric background (subtle gradient/texture); expressive but legible typography.
- **Notrude** is a hero-level brand signal on Welcome (not only nav text).
- First viewport budget: brand, one headline, one supporting line, one CTA — no stats/clutter.
- Cards only for interactive containers (workout steps, chat, connection toggles).
- Motion: quiz step transition; Today CTA settle-in; soft coach message stream-in.

### 7.2 Navigation (post-onboarding)

Bottom tabs: **Today · Plan · Coach · Progress**

| Screen | Job |
|---|---|
| Welcome | Brand + promise + Start quiz |
| Quiz | One question per step; skippable optional fields; progress dots |
| Acknowledgment | AI “what I heard” + Start my first week |
| Today | Session name, why it fits their goal, short steps, Start / Done |
| Workout play | Step-through; Done / Need to modify → Coach |
| Plan | Week list; “Ask coach to adjust” |
| Coach | Streaming chat; quick chips (too hard / shorter today / remind me why) |
| Progress | History, streak, optional weight, reflections, channel drafts, health connections |

### 7.3 Communication channels (v1 mock outbound)

- **In-app:** full Coach tab (always on).
- **Text-style:** short SMS-like drafts in Progress/Coach; copy/share.
- **Email outlines:** fuller check-in drafts; copy/share.
- Preferences from quiz shape generation frequency and voice; real Twilio/Resend deferred.

### 7.4 Health connections (v1 mock + adapters)

- Progress → **Connected apps**: Apple Health, Strava, Garmin (extensible).
- User can “connect,” see sample synced activities/metrics, toggle what Notrude may use.
- `HealthSource` adapter interface: `connect`, `disconnect`, `listActivities`, `latestBodyMetrics`.
- v1 implementations: `MockStravaSource`, `MockGarminSource`, `MockAppleHealthSource` (Apple labeled as needing native bridge for real data).
- Post-v1: real Strava OAuth first, then Garmin; Apple Health with native shell later.
- Coach may reference synced summary empathetically; never to shame.

## 8. Data shapes (conceptual)

```ts
type EngagementTone = "gentle" | "steady" | "direct";
type EngagementCadence = "brief" | "conversational" | "quiet";
type MotivationStyle = "celebrate_wins" | "process_focus" | "accountability";
type ChannelPref = "in_app" | "text_style" | "email_outline";

type UserProfile = {
  goalText: string;
  currentWeightLbs?: number;
  targetWeightLbs?: number;
  targetDescription?: string;
  activityLevel?: string;
  constraints?: string;
  tone: EngagementTone;
  cadence: EngagementCadence;
  motivation: MotivationStyle;
  channels: ChannelPref[];
  trackWeight: boolean;
  createdAt: string;
};

type PlanSession = {
  id: string;
  dayIndex: number; // 0–6
  title: string;
  rationale: string; // why this fits their goal
  steps: { name: string; detail: string; durationMin?: number }[];
  intensity: "easy" | "moderate" | "hard";
};

type TrainingPlan = {
  id: string;
  weekStartIso: string;
  sessions: PlanSession[];
  generatedFromGoal: string;
};

type WorkoutLog = {
  id: string;
  sessionId: string;
  status: "completed" | "skipped" | "partial";
  notes?: string;
  completedAt: string;
};
```

## 9. Edge cases

- Decline weight tracking → UI and coach never prompt for weight.
- Missed days → acknowledge without guilt; offer gentle restart (no punitive catch-up blocks).
- Goal change → re-acknowledgment + new plan; preserve history.
- Too hard / no gear / short on time → adjust today and optionally regenerate week.
- AI/network failure → last saved plan usable; coach shows retry; logging still works offline.
- Injury/pain language → scale + rest guidance + professional-care note.

## 10. Testing plan (v1)

- Quiz → profile persisted → reload lands on Home with same profile.
- Plan generation yields valid structured weeks for divergent goals (ultra vs. high-weight start).
- Coach streams with tone/channel-appropriate behavior and chips.
- Complete / skip / partial updates Progress and history.
- Text-style and email-outline drafts generate and copy.
- Weight path: hidden when `trackWeight` is false.
- Health mock connect/disconnect updates summary available to coach context.
- PWA usable on iPhone Safari viewport (layout, tabs, safe area).

## 11. Implementation phases (for planning)

1. App shell, design tokens, PWA basics, local store
2. Quiz + acknowledgment + profile persistence
3. Plan generation API + Today / Plan / Workout play
4. Coach streaming chat + adjustment chips
5. Progress (history, streaks, reflections, optional weight)
6. Compose-message (text / email outlines)
7. Health connection UI + mock adapters + coach context wiring
8. Polish, empty/error states, demo seed profiles

## 12. Success criteria

- A new user can complete quiz → see an acknowledgment that clearly reflects their words → get a week plan that plausibly matches an ultra goal *or* a cautious start.
- Daily use is obvious: open app → Today → do or adjust → optional coach.
- Missed workouts and optional weight never produce shaming copy in default flows.
- Communication and health features are visible and usable as mockups with a clear path to real integrations.
