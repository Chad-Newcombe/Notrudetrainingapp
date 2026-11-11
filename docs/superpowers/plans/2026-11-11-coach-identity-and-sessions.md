# Coach Identity and Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every coach a bounded identity, its own durable relationship memory and conversation queue, and a Fresh First chat lifecycle that never preloads an old transcript or speaks before the user.

**Architecture:** Replace the single global chat collection with one record per coach conversation and one relationship record per coach. `/coach` becomes the Fresh First landing, active and archived conversations receive dedicated routes, and a persistent route lifecycle archives nonempty sessions when the user leaves Coach. The model receives immutable coach rules, the selected coach's bounded memory, shared confirmed facts, and only the current session.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.9, IndexedDB via `idb`, SQLite account records, Vercel AI SDK 6, Zod, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-11-coach-identity-sessions-and-models-design.md`

## Global Constraints

- A new chat starts with an empty message list and does not call the model until the user sends a message.
- River, Jax, Sol, and Nova keep immutable core identities; learned preferences may change delivery only within the selected coach's allowed range.
- Shared facts come only from explicit profile/plan/health/workout actions or a confirmed fact-promotion action.
- Coach relationship memory and full transcripts never cross between coaches.
- Leaving Coach or switching coaches archives a nonempty session; an empty session is discarded.
- Archived chats are immutable, remain until the user deletes them, and do not preload into later chats.
- `Continue from here` creates a new conversation with only the selected archive summary, never the old transcript.
- Coach switches suggested in chat require an explicit `Switch to {coach}` control.
- Plan updates, retry, and undo must preserve their current behavior.
- Ordinary replies default to one or two short sentences, ask only necessary questions, and avoid the banned stock-AI phrases in the spec.

## Review Focus

- **Navigation during streaming or offline:** the latest user turn is persisted once, the session eventually enters the queue, and retry does not duplicate it. Covered in Task 5.
- **Repeated legacy migration:** old global chat becomes one archive exactly once on guest and account storage. Covered in Task 2.
- **Coach switch during a plan update:** the plan save/undo completes or reports its actual failure before the source session archives. Covered in Task 6.
- **Missing or corrupt relationship memory:** the coach falls back to its core identity and never borrows another coach's memory. Covered in Task 3.
- **Transcript deletion versus memory deletion:** each operation affects only the object the user selected. Covered in Task 7.

---

### Task 1: Conversation domain and state transitions

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/coach/conversations.ts`
- Create: `tests/lib/coach-conversations.test.ts`

**Interfaces:**
- Produces: `CoachConversation`, `ConversationArchive`, `ConversationResultLabel`, and `CoachConversationStatus` in `lib/types.ts`.
- Produces: `newCoachConversation(coachId: CoachId, now: string, continuedFromId?: string): CoachConversation`.
- Produces: `withConversationMessages(conversation: CoachConversation, messages: ChatMessage[], now: string): CoachConversation`.
- Produces: `archiveConversation(conversation: CoachConversation, archive: ConversationArchive, now: string): CoachConversation`.
- Produces: `shouldDiscardConversation(conversation: CoachConversation): boolean`.
- Produces: `conversationsForCoach(records: CoachConversation[], coachId: CoachId): CoachConversation[]` sorted newest first.

- [ ] **Step 1: Write failing conversation transition tests**

Cover these assertions:

```ts
expect(newCoachConversation("river", now).messages).toEqual([]);
expect(shouldDiscardConversation(empty)).toBe(true);
expect(archiveConversation(nonempty, archive, later).status).toBe("archived");
expect(conversationsForCoach(records, "nova").every(c => c.coachId === "nova")).toBe(true);
expect(conversationsForCoach(records, "nova").map(c => c.id)).toEqual(["new", "old"]);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- --run tests/lib/coach-conversations.test.ts`

Expected: FAIL because the conversation types and helpers do not exist.

- [ ] **Step 3: Add the conversation types**

Define exact fields from the spec, including `coachId`, `status`, nested `messages`, `title`, `summary`, `resultLabels`, `continuedFromId`, and timestamps. `status` is `"active" | "archived"`.

- [ ] **Step 4: Implement the pure transition helpers**

All helpers return new values, preserve message order, reject cross-coach filtering, and never invent an archive title or summary.

- [ ] **Step 5: Run focused and existing type-domain tests**

Run: `npm test -- --run tests/lib/coach-conversations.test.ts tests/lib/types-profile.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/coach/conversations.ts tests/lib/coach-conversations.test.ts
git commit -m "Add coach conversation domain"
```

---

### Task 2: Per-coach persistence and idempotent legacy migration

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/account/records.ts`
- Modify: `lib/store/db.ts`
- Modify: `lib/store/storage.ts`
- Modify: `lib/store/index.ts`
- Modify: `app/api/account/data/route.ts`
- Create: `lib/store/coach-conversations.ts`
- Create: `lib/store/coach-relationships.ts`
- Create: `lib/store/coach-chat-migration.ts`
- Create: `tests/lib/coach-storage.test.ts`
- Modify: `tests/lib/account-records.test.ts`

**Interfaces:**
- Consumes: conversation types and helpers from Task 1.
- Produces: collections `coachConversations` and `coachRelationships`, plus meta key `coach-conversation-migration-v2`.
- Produces: `CoachRelationship` and `CoachMemoryEntry` persistence types in `lib/types.ts`.
- Produces: optional `UserProfile.sharedFacts?: SharedProfileFact[]`, where `SharedProfileFact.category` is `"ability" | "constraint" | "schedule"`, the statement is user-confirmed, and every fact has `id` and `confirmedAt`.
- Produces: `listCoachConversations(coachId?: CoachId): Promise<CoachConversation[]>`.
- Produces: `getCoachConversation(id: string): Promise<CoachConversation | undefined>`.
- Produces: `saveCoachConversation(value: CoachConversation): Promise<void>`.
- Produces: `deleteCoachConversation(id: string): Promise<void>`.
- Produces: `getCoachRelationship(coachId: CoachId): Promise<CoachRelationship>` and `saveCoachRelationship(value: CoachRelationship): Promise<void>`.
- Produces: `emptyCoachRelationship(coachId: CoachId, now?: string): CoachRelationship`.
- Produces: `migrateLegacyChat(profile: UserProfile): Promise<void>`.

- [ ] **Step 1: Write failing storage and record-validation tests**

Assert that valid conversation/relationship records parse, a key/coach mismatch fails, delete targets one exact key, and two calls to `migrateLegacyChat()` produce one archived `Legacy conversation` with the selected coach ID.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `npm test -- --run tests/lib/coach-storage.test.ts tests/lib/account-records.test.ts`

Expected: FAIL because the collections, schemas, and storage functions do not exist.

- [ ] **Step 3: Add Zod schemas and collection names**

Define the relationship persistence shape and optional confirmed `sharedFacts`, then validate all conversation fields, cap each message body at the existing 24,000-character limit, cap messages per conversation at 200, and validate one relationship record per `CoachId`. Legacy profiles without `sharedFacts` remain valid.

- [ ] **Step 4: Upgrade IndexedDB to version 2**

Create key-path stores `coachConversations` (`id`) and `coachRelationships` (`coachId`) without deleting the legacy `chat` store. Add both stores to `clearAll()` and guest import/export.

- [ ] **Step 5: Add exact put, list, get, and delete account operations**

Extend the account endpoint operation union with `delete` and `putMany`; retain `mergeChat` only for backward compatibility. Validate origin, collection, key, and record payload before mutation.

- [ ] **Step 6: Implement the store modules**

Guest and signed-in paths must share the same signatures and sorting. `getCoachRelationship()` returns an empty core-safe record for that coach when no stored record exists.

- [ ] **Step 7: Implement idempotent migration**

If the migration marker is absent and legacy chat has messages, save one archived conversation under `profile.coachId`, then save the marker. If chat is empty, save only the marker. Never make the migrated record active.

- [ ] **Step 8: Run storage, account, and full tests**

Run: `npm test -- --run tests/lib/coach-storage.test.ts tests/lib/account-records.test.ts tests/lib/store-profile.test.ts && npm test && npx tsc --noEmit`

Expected: PASS, with migration idempotency covered for guest and mocked account storage.

- [ ] **Step 9: Commit**

```bash
git add lib/types.ts lib/account/records.ts lib/store app/api/account/data/route.ts tests/lib/coach-storage.test.ts tests/lib/account-records.test.ts
git commit -m "Store coach conversations separately"
```

---

### Task 3: Bounded coach relationship memory

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/coaches/relationship.ts`
- Create: `lib/coach/archive.ts`
- Create: `tests/lib/coach-relationship.test.ts`
- Create: `tests/lib/coach-archive.test.ts`

**Interfaces:**
- Consumes: `CoachId`, `CoachRelationship`, `CoachMemoryEntry`, `CoachConversation`, `emptyCoachRelationship()`, and core presets.
- Produces: `CoachMemoryDelta`, `SharedFactCandidate`, and `SharedProfileFact`.
- Produces: `applyMemoryDelta(current: CoachRelationship, delta: CoachMemoryDelta, now: string): CoachRelationship`.
- Produces: `removeMemoryEntry(current: CoachRelationship, entryId: string, now: string): CoachRelationship`.
- Produces: `relationshipPrompt(memory: CoachRelationship): string`.
- Produces: `conversationArchiveSchema` and `fallbackConversationArchive(conversation: CoachConversation): ConversationArchive`.

- [ ] **Step 1: Write failing memory-boundary tests**

Assert coach ID preservation, deduplication by normalized key, evidence retention, removal of one exact entry, no relationship text when memory is missing, and no promotion of `SharedFactCandidate` into profile data.

- [ ] **Step 2: Write failing archive fallback tests**

Assert deterministic title/summary length limits, plan result-label preservation, no empty-chat archive, and no banned AI filler in fallback text.

- [ ] **Step 3: Run focused tests and confirm RED**

Run: `npm test -- --run tests/lib/coach-relationship.test.ts tests/lib/coach-archive.test.ts`

Expected: FAIL because the memory and archive modules do not exist.

- [ ] **Step 4: Implement relationship types and pure helpers**

Relationship entries describe delivery preferences or user-provided evidence. Reject deltas that name another coach, contain hidden prompt language, exceed 300 characters, or attempt to overwrite core identity.

- [ ] **Step 5: Implement archive schema and deterministic fallback**

Use literal conversation facts. The fallback may derive a title from the first user turn and a summary from the last user turn, but must not claim an inferred preference.

- [ ] **Step 6: Run focused and voice tests**

Run: `npm test -- --run tests/lib/coach-relationship.test.ts tests/lib/coach-archive.test.ts tests/lib/coach-voice.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/coaches/relationship.ts lib/coach/archive.ts tests/lib/coach-relationship.test.ts tests/lib/coach-archive.test.ts
git commit -m "Add bounded coach relationship memory"
```

---

### Task 4: Fresh First landing and archived history

**Files:**
- Modify: `app/(main)/coach/page.tsx`
- Create: `app/(main)/coach/chat/[conversationId]/page.tsx`
- Create: `app/(main)/coach/history/[conversationId]/page.tsx`
- Create: `components/coach/CoachHome.tsx`
- Create: `components/coach/ConversationQueue.tsx`
- Create: `components/coach/ArchivedConversation.tsx`
- Create: `components/coach/StartCoachChat.tsx`
- Modify: `components/coach/CoachStage.tsx`
- Create: `tests/components/coach-home.test.ts`
- Create: `tests/components/coach-history.test.ts`

**Interfaces:**
- Consumes: Task 2 conversation storage and existing `CoachStage`/`CoachSwitcher`.
- Produces: Fresh First `/coach` landing.
- Produces: `StartCoachChat({ coachId, continuedFromId? })` that creates an empty record and routes to `/coach/chat/{id}` without calling `/api/coach`.
- Produces: immutable `/coach/history/{id}` with `Continue from here`.

- [ ] **Step 1: Write a failing Fresh First component test**

Assert a prominent `Start a new chat` control, only the selected coach's queued rows, newest-first order, no textbox, no assistant message, no suggested prompt, and no call to `/api/coach`.

- [ ] **Step 2: Write a failing archived-history test**

Assert literal transcript order, result labels, absence of a live composer, and that `Continue from here` creates a different active conversation whose `continuedFromId` points to the archive.

- [ ] **Step 3: Run component tests and confirm RED**

Run: `npm test -- --run tests/components/coach-home.test.ts tests/components/coach-history.test.ts`

Expected: FAIL against the current endless `CoachChat` page.

- [ ] **Step 4: Build the Fresh First landing**

Use the approved hierarchy: coach identity/model, new-chat action, then queued history. Rows show title, date, summary, and literal result labels.

- [ ] **Step 5: Build active and archived routes**

The active route loads only its exact record. The history route rejects active, missing, or wrong-coach records with a safe route back to `/coach`.

- [ ] **Step 6: Implement `Continue from here`**

Create a new empty conversation. Store only `continuedFromId`; do not copy old messages.

- [ ] **Step 7: Run focused tests and verify no model preemption**

Run: `npm test -- --run tests/components/coach-home.test.ts tests/components/coach-history.test.ts tests/components/coach-navigation.test.ts && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add 'app/(main)/coach' components/coach tests/components/coach-home.test.ts tests/components/coach-history.test.ts
git commit -m "Add fresh coach conversations and history"
```

---

### Task 5: Active chat persistence and automatic archival

**Files:**
- Modify: `components/coach/CoachChat.tsx`
- Create: `components/coach/CoachSessionLifecycle.tsx`
- Modify: `app/(main)/layout.tsx`
- Create: `app/api/coach/archive/route.ts`
- Modify: `lib/coach/fixture-fetch.ts`
- Create: `tests/components/coach-session-lifecycle.test.ts`
- Create: `tests/components/active-coach-chat.test.ts`
- Create: `tests/api/coach-archive.test.ts`

**Interfaces:**
- Consumes: exact active conversation record, relationship helpers, and archive schema.
- Produces: `archiveCoachConversation(id: string): Promise<void>` in the conversation store.
- Produces: persistent `<CoachSessionLifecycle />` that detects leaving `/coach/chat/{id}` after navigation and archives once.
- Produces: `POST /api/coach/archive` returning `ConversationArchive` plus `CoachMemoryDelta` and optional `SharedFactCandidate[]`.

- [ ] **Step 1: Write failing active-chat tests**

Assert the component boots from only the requested record, persists after each completed response, does not include another conversation's messages, and retries without duplicating the final user turn.

- [ ] **Step 2: Write failing route-lifecycle tests**

Assert chat-to-Today, chat-to-Coach, and chat-to-another-coach transitions archive a nonempty session once; empty sessions are deleted; offline archival stores locally and marks summary processing for retry.

- [ ] **Step 3: Write failing archive-route tests**

Assert valid structured output is accepted, invalid memory delta falls back to a transcript-only archive, missing model uses deterministic fallback, and a summary failure never loses messages.

- [ ] **Step 4: Run focused tests and confirm RED**

Run: `npm test -- --run tests/components/active-coach-chat.test.ts tests/components/coach-session-lifecycle.test.ts tests/api/coach-archive.test.ts`

Expected: FAIL because active-route persistence and archival do not exist.

- [ ] **Step 5: Refactor `CoachChat` around one record**

Remove global `listChat()`/`replaceChat()` boot. Persist UI messages to the exact `CoachConversation` after every `onFinish`. Send only current-session messages and the optional selected summary.

- [ ] **Step 6: Implement route lifecycle and next-load reconciliation**

Mount lifecycle in the persistent main layout. On pathname transition away from an active chat, archive or discard the source ID. On startup, reconcile any nonempty active record left by a hard close before showing Fresh First.

- [ ] **Step 7: Implement the archive endpoint**

Use structured model output validated by `conversationArchiveSchema`; merge only valid coach-specific memory. Return deterministic fallback on missing local model or malformed output.

- [ ] **Step 8: Preserve plan-update ordering**

When navigation occurs during `updating` or `undoing`, persist the session immediately but defer final archive result labels until the plan transition settles or records an error.

- [ ] **Step 9: Run focused and plan-update tests**

Run: `npm test -- --run tests/components/active-coach-chat.test.ts tests/components/coach-session-lifecycle.test.ts tests/api/coach-archive.test.ts tests/lib/plan-revision.test.ts && npm test`

Expected: PASS with no duplicate message IDs or lost plan transitions.

- [ ] **Step 10: Commit**

```bash
git add components/coach/CoachChat.tsx components/coach/CoachSessionLifecycle.tsx 'app/(main)/layout.tsx' app/api/coach/archive lib/coach/fixture-fetch.ts tests
git commit -m "Archive coach sessions on exit"
```

---

### Task 6: Distinct LLM identities and explicit switch suggestions

**Files:**
- Modify: `lib/coaches/presets.ts`
- Modify: `lib/coaches/voice.ts`
- Create: `lib/coaches/fit.ts`
- Modify: `lib/ai/fixtures.ts`
- Modify: `app/api/coach/route.ts`
- Create: `app/api/coach/fit/route.ts`
- Modify: `components/coach/CoachChat.tsx`
- Modify: `components/coach/CoachBubble.tsx`
- Create: `components/coach/CoachSwitchSuggestion.tsx`
- Modify: `tests/lib/coach-voice.test.ts`
- Create: `tests/lib/coach-identity-scenarios.test.ts`
- Create: `tests/api/coach-fit.test.ts`
- Create: `tests/components/coach-switch-suggestion.test.ts`

**Interfaces:**
- Consumes: selected relationship prompt and current-session context.
- Produces: expanded immutable/allowed-flex/cannot-be identity rules for all four presets.
- Produces: `isExplicitStyleRequest(text: string): boolean` and `CoachFitSuggestion { coachId: CoachId; reason: string }`.
- Produces: `POST /api/coach/fit` returning a structured suggestion only for an explicit request to change coaching style; missing-model behavior uses a deterministic fixture.
- Produces: explicit client action that archives the source conversation, saves `profileWithCoach()`, and routes to `/coach`.

- [ ] **Step 1: Extend voice tests with core and bounded-flex assertions**

For every coach, assert the system prompt names its immutable core, allowed flex, and prohibited transformation. Assert relationship memory appears only for the selected coach and safety/user-decision priority remains intact.

- [ ] **Step 2: Add scenario tests for the same user input across coaches**

Use missed-workout, direct-plan-change, unwanted-reassurance, and out-of-range-style cases. Assert distinct fixture output, two-sentence default, no unnecessary question, and absence of `I see`, `I hear`, `No pressure`, `You've got this`, and `Just say yes or no`.

- [ ] **Step 3: Add failing switch-suggestion component tests**

Assert the suggestion identifies the target coach and reason, requires an explicit button, does nothing when dismissed, archives before switching when accepted, records the declined suggestion so it is not shown repeatedly, and uses deterministic fallback when the local model cannot classify fit.

- [ ] **Step 4: Run focused tests and confirm RED**

Run: `npm test -- --run tests/lib/coach-voice.test.ts tests/lib/coach-identity-scenarios.test.ts tests/api/coach-fit.test.ts tests/components/coach-switch-suggestion.test.ts`

Expected: FAIL against the current short presets and plain-text-only stream.

- [ ] **Step 5: Expand the four core identity definitions**

Copy the identity boundaries from the spec into structured preset fields. Generate system instructions from those fields rather than one generic paragraph.

- [ ] **Step 6: Tighten the response contract and fixtures**

Remove banned filler from fixtures and prompt examples. Ask a question only when missing information blocks the next safe action. Never author the user's presumed response.

- [ ] **Step 7: Add explicit style-fit classification and render the suggestion**

Call `/api/coach/fit` only when `isExplicitStyleRequest()` detects a meta request such as more force, more energy, more calm, or more experimentation. Validate the structured result, ignore a same-coach suggestion, and render an explicit `Switch to {coach}` button. The endpoint never changes storage. On acceptance, the client completes pending plan work, archives the source, saves the new coach, and returns to Fresh First.

- [ ] **Step 8: Run focused, plan, and full tests**

Run: `npm test -- --run tests/lib/coach-voice.test.ts tests/lib/coach-identity-scenarios.test.ts tests/api/coach-fit.test.ts tests/components/coach-switch-suggestion.test.ts tests/lib/plan-revision.test.ts && npm test && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/coaches lib/ai/fixtures.ts app/api/coach components/coach tests/lib/coach-voice.test.ts tests/lib/coach-identity-scenarios.test.ts tests/api/coach-fit.test.ts tests/components/coach-switch-suggestion.test.ts
git commit -m "Give coaches bounded distinct identities"
```

---

### Task 7: User-managed memory and conversation deletion

**Files:**
- Modify: `app/(main)/more/page.tsx`
- Create: `components/coach/CoachMemoryManager.tsx`
- Modify: `components/coach/ArchivedConversation.tsx`
- Create: `components/coach/ConfirmSharedFact.tsx`
- Create: `tests/components/coach-memory-manager.test.ts`
- Modify: `tests/components/coach-history.test.ts`

**Interfaces:**
- Consumes: relationship and conversation delete storage from Tasks 2–3.
- Produces: `What your coaches remember` under More.
- Produces: independent remove-memory, delete-transcript, and confirm-shared-fact actions.

- [ ] **Step 1: Write failing memory-manager tests**

Assert entries are grouped by coach, literal evidence is visible, removing one entry preserves all transcripts and other entries, and corrupt memory shows a safe empty state.

- [ ] **Step 2: Extend history tests for deletion boundaries**

Deleting an archived chat removes only that conversation after confirmation. It does not alter relationship memory. Removing relationship memory does not rewrite history.

- [ ] **Step 3: Add failing shared-fact confirmation tests**

Assert a candidate remains coach-local until accepted, acceptance appends one typed `SharedProfileFact` without overwriting existing profile fields, deduplicates an equivalent confirmed fact, and dismissal leaves global context unchanged.

- [ ] **Step 4: Run component tests and confirm RED**

Run: `npm test -- --run tests/components/coach-memory-manager.test.ts tests/components/coach-history.test.ts`

Expected: FAIL because the controls do not exist.

- [ ] **Step 5: Implement memory manager and independent deletion**

Use literal copy: `Remove from {coach}'s memory` and `Delete this conversation`. Do not expose prompts or identity guardrails.

- [ ] **Step 6: Implement shared-fact confirmation**

Accept only `ability`, `constraint`, or `schedule` candidates with a literal user-confirmed statement of at most 220 characters. Append the normalized value to `profile.sharedFacts`; never overwrite existing profile/intake fields or silently concatenate arbitrary model text.

- [ ] **Step 7: Run focused and full tests**

Run: `npm test -- --run tests/components/coach-memory-manager.test.ts tests/components/coach-history.test.ts tests/components/health-connections.test.ts && npm test && npx tsc --noEmit`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add 'app/(main)/more/page.tsx' components/coach tests/components/coach-memory-manager.test.ts tests/components/coach-history.test.ts
git commit -m "Add coach memory controls"
```

---

### Task 8: End-to-end migration, accessibility, and behavior verification

**Files:**
- Modify: `tests/components/coach-navigation.test.ts`
- Create: `tests/components/coach-session-flow.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified coach session experience and migration documentation.

- [ ] **Step 1: Add an end-to-end component flow test**

Exercise: Fresh First → start empty chat → user message → coach response → explicit plan update → leave Coach → queued archive → start another empty chat → switch coach → verify isolated queue and memory.

- [ ] **Step 2: Add migration and recovery cases to the flow**

Cover repeated migration, summary failure, offline archive, wrong-coach URL, missing record, and mid-plan-update navigation.

- [ ] **Step 3: Run the complete automated gate**

Run: `npm test && npm run lint && npx tsc --noEmit && npm run build && git diff --check`

Expected: 0 failed tests, 0 lint/type errors, successful production build, and clean diff check.

- [ ] **Step 4: Verify mobile behavior in the live preview**

At 320px, 390px, and 430px inspect Fresh First, active chat, archived history, switch suggestion, memory manager, and plan-update status. Verify no horizontal overflow, hidden actions, bottom-nav overlap, or preloaded assistant text.

- [ ] **Step 5: Exercise all four coaches with the same prompts**

Confirm recognizable identity differences, bounded flex after a preference correction, one-time switch suggestion, and no banned stock-AI language. Save only actual defects as follow-up tests.

- [ ] **Step 6: Update README behavior and migration notes**

Document separate coach channels, archive behavior, memory controls, local-model requirement, and how existing global chat is preserved.

- [ ] **Step 7: Request one fresh whole-branch review and address Critical/Important findings**

Review against the spec and this plan, then rerun Step 3 after fixes.

- [ ] **Step 8: Commit verification fixes and docs**

```bash
git add tests README.md
git commit -m "Verify coach identity and session flows"
```

