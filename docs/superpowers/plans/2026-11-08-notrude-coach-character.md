# Coach Character + Intake + Inbox Plan

> **For agentic workers:** Implement inline or via executing-plans.

**Goal:** Preset coaches, conversational intake, coach→user inbox.

**Architecture:** Add `lib/coaches` registry + SVG avatars; extend profile/messages types; quiz starts with coach pick + why-bubbles; new Inbox tab replaces copy-centric MessageDrafts.

**Tech Stack:** Existing Next.js app, CSS/SVG animation, local store.

## Global Constraints

- Presets only: river, jax, sol, nova (no Moss).
- Text/email framed as coach→user; in-app delivery; mock connect for real SMS/email later.
- Intake conversational with structured fields.
- Keep fixture AI paths; tests + build green.
- Rivian UI tokens remain.

---

### Task 1: Types, coach registry, avatars
### Task 2: Conversational quiz + acknowledgment coach voice
### Task 3: Inbox tab + coach-delivered messages
### Task 4: Wire Coach/Today presence; verify; PR; republish
