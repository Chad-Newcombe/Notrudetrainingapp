# Notrude — Coach Character, Conversational Intake & Messages

**Date:** 2026-11-08  
**Status:** Approved for implementation  
**Branch:** `cursor/notrude-coach-character-d2a4`

## 1. Intent

Make intake feel guided (not sterile), give the user a **customizable coach persona** via presets, and make text/email **coach → user** (in-app inbox now; real SMS/email connect later).

## 2. Goals

- 4 preset coaches: River, Jax, Sol, Nova — simple stylized animated look; pick during intake.
- Conversational quiz: coach bubbles explain why each question helps; structured inputs remain.
- Messages inbox: coach-delivered text/email-style messages; no primary “copy to send yourself.”
- Hybrid delivery: in-app now; Connect phone/email UI as “coming soon for real delivery.”

## 3. Non-goals

- Real Twilio/Resend in this pass.
- Freeform chat-only onboarding.
- Full build-a-coach morph targets / 3D engine.
- Photoreal characters.

## 4. Coach presets

| id | Name | Vibe | Default bias |
|---|---|---|---|
| `river` | River | Calm trail buddy | gentle / process_focus |
| `jax` | Jax | Upbeat accountability pal | steady / celebrate_wins |
| `sol` | Sol | Warm direct coach | direct / accountability |
| `nova` | Nova | Curious spark-plug | conversational / celebrate_wins |

**Visual:** CSS/SVG simple stylized characters (rounded shapes, soft color blocks, light idle motion — concept-art / toy-like). Distinct palette per coach. Appears on pick cards, quiz bubbles, acknowledgment, Coach header, Messages.

**Data:** `UserProfile.coachId: CoachId`. Selecting a preset may pre-fill tone/cadence/motivation defaults; user can still change later in quiz.

## 5. Conversational intake

1. Coach pick (required) — large character cards.
2. Existing quiz steps, each with:
   - Coach avatar + short “why I’m asking” bubble in that coach’s voice
   - Same fields as today (goal, optional weight, etc.)
3. Channel copy reframed: “I’ll text you / email you check-ins” (not copy-yourself).
4. Acknowledgment in coach voice + avatar.

## 6. Messages inbox

- New main tab **Messages** (or primary Progress subsection elevated to tab — prefer **new tab**: Today · Plan · Coach · Messages · Progress → too many. Prefer: replace Progress crowding by adding **Messages** as 5th tab only if spacing works; else Coach sub-view + Progress entry. **Decision:** add **Messages** tab; keep Progress — five tabs with compact labels is OK for v1 phone column, OR nest Messages under Coach. **Final:** new bottom tab **Inbox** between Coach and Progress.)
- List of delivered messages (text vs email styling).
- Actions: “Send me a text nudge” / “Send me a weekly email” → API compose → **append to inbox as from coach**.
- Connect phone / email cards: mock toggle → “Connected (demo)” / “Real delivery coming soon.”
- Remove primary clipboard CTA; optional secondary “Share” allowed.

## 7. Types / store

```ts
type CoachId = "river" | "jax" | "sol" | "nova";
// UserProfile += coachId: CoachId
// ComposedMessage += fromCoachId, direction: "coach_to_user", deliveredAt
```

Store: reuse `messages` store; list newest-first. Profile migration: existing profiles without `coachId` → prompt pick on next quiz open or default `river` with soft banner “Pick your coach.”

## 8. Success criteria

- Intake shows coach presence and helpful why-copy on every step.
- Text/email UX reads as coach sending to user.
- Four distinct coach presets selectable and reflected in UI.
- Demo/fixture paths still work without API key.
- `npm test` / `npm run build` pass.
