# Notrude

Empathetic, local-first training coach (Next.js PWA). Goals, week plans, workouts, progress, and an always-on coach chat — with fixture fallbacks when no AI key is configured.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Choose River, Jax, Sol, or Nova at the start of the onboarding quiz, or use a demo profile on Welcome to go straight to Today. Profiles saved before coach selection use River by default.

Request text and email check-ins from the **Inbox** tab. Both formats appear inside Notrude. Phone and email connection controls are demos.

## Environment (optional)

| Variable | Purpose |
| --- | --- |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway (or compatible) for live plan, coach, and compose APIs |
| `OPENAI_API_KEY` | Fallback if Gateway key is unset |
| `NOTRUDE_MODEL` | Model id (default `openai/gpt-4.1-mini`) |

If neither API key is set, the APIs return **fixture** plans, acknowledgments, coach replies, and Inbox check-ins (`X-Notrude-Fixture` header on coach).

Create `.env.local` in the project root:

```env
# AI_GATEWAY_API_KEY=...
```

## Scripts

```bash
npm test          # Vitest
npm run build     # Production build
npm run lint      # ESLint
```

## PWA — add to Home Screen (iPhone)

1. Open the app in **Safari** (same origin as your dev or deployed URL).
2. Tap **Share** → **Add to Home Screen**.
3. Launch from the home icon for standalone, safe-area layout (`manifest.webmanifest` + icons in `public/icons/`).

## Data

Profile, plan, logs, chat, and health connections live in **IndexedDB** in the browser (no account required).
