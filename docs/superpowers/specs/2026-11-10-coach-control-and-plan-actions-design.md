# Coach Control and Plan Actions Design

## Intent

Make Not Rude Training feel responsive to the person using it. Coach personality should shape delivery, but the user's stated constraints, preferences, and decisions control the recommendation and plan. A coach may briefly challenge a request when there is a concrete safety concern or a direct conflict with the user's stated goal, then must adapt to the user's decision.

## Goals

- Treat explicit user constraints and preferences as authoritative in chat and plan generation.
- Keep River, Jax, Sol, and Nova recognizable without letting personality override the user.
- Allow the active coach to be changed during normal use without restarting onboarding.
- Turn explicit plan-change instructions in chat into saved plan changes inside the app.
- Show what changed and let the user undo the last automatic plan update.
- Keep chat empty until the user writes; do not show suggested, preloaded, or preemptive questions.

## Coach Behavior

Every coach follows this priority order:

1. Safety boundaries and avoiding medical diagnosis.
2. The user's latest explicit instruction or constraint.
3. The user's saved engagement preferences and intake notes.
4. The current plan, recent logs, and conversation history.
5. The coach's personality and preferred style.

Coach personality controls wording, pacing, and the kinds of options offered. It does not control the outcome after the user makes a clear decision. A coach may give one concise pushback when a request appears unsafe or contradicts the user's stated goal. The pushback names the concern and offers a workable alternative. It does not lecture, repeatedly persuade, or ignore the instruction.

The chat UI begins with an empty conversation area and input. It contains no starter prompts, suggested questions, quick chips, or prefilled text. The coach does not send a message until the user sends one.

## Switching Coaches

The Coach screen and More screen expose a `Change coach` control. It opens the four existing coach choices with a concise description of how each communicates. Selecting a coach saves the new `coachId` to the existing profile and updates the current screen immediately.

Switching coaches preserves the user's profile, engagement preferences, intake notes, current plan, workout logs, progress, Inbox, and conversation. It changes future coach replies and coach-authored messages. The new coach does not inject an unsolicited introduction into chat.

## Plan Changes From Chat

The application classifies the latest user message as either:

- `explicit`: a direct request to change the schedule, duration, day, intensity, activity, recovery, or number of sessions;
- `discussion`: commentary, uncertainty, or a vague statement without a requested plan change.

An explicit request triggers plan generation after the coach reply finishes. The request uses the latest saved profile, current plan, logs, and recent conversation. User statements are the source of truth. Logged sessions in the current week remain unchanged.

When generation succeeds, the revised plan is saved automatically. Chat shows a compact `Plan updated` card listing the sessions that were added, removed, or changed. The card links to the Plan screen and includes `Undo`. Undo restores the exact previous plan and is available until another plan update replaces it or the chat component is reloaded.

A discussion message does not alter the plan. The coach may ask one necessary clarifying question in its reply. The UI itself does not preempt or suggest that question.

If generation fails, the current plan remains unchanged and chat shows a retry action. The app never claims the plan changed unless saving succeeded.

## Constraints

- Continue using the current Next.js, React, IndexedDB, AI SDK, and local Ollama architecture.
- No new dependency is required.
- Preserve account syncing through the existing store and account provider behavior.
- Preserve the existing four coaches and their assets.
- Plan updates remain limited to four scheduled sessions and preserve logged sessions.
- Coach switching and plan updates must work in guest mode and account mode through existing storage APIs.

## Builder Calls

- Use deterministic intent detection for clear plan-change verbs and plan nouns. This keeps automatic mutation predictable with the local model. Ambiguous messages remain discussion.
- Store the previous plan in component state for one-level Undo; do not create a permanent plan-version system in this iteration.
- Do not clear conversation history on coach switch, because continuity is part of the requested behavior.
