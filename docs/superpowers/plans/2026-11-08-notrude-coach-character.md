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

## November 8 handoff

- Continued from Cursor's PR #3 at `eff7837`. Today now shows the selected coach on both training and rest days, and live chat and Inbox prompts use the selected persona.
- Older profiles use River by default. Pre-Inbox drafts remain readable with a saved-draft label.
- Verified 22 tests, lint, and the production build. A phone-width Chromium run covered onboarding, Today, Coach, both Inbox formats, reload persistence, and older IndexedDB records using fixture responses.
- PR #3 is the review point for this release. Live AI and a hosted deployment are outside the verification above. Phone and email delivery are demos by design.

## November 9 3D and local inference update

- The four coaches now have original Blender-generated models, rendered portraits, and an on-demand orbit preview in the coach picker.
- Notrude's four AI routes use a configured self-hosted endpoint or deterministic fixtures. The README documents Ollama with Qwen3 4B Instruct and the loopback deployment setup.
