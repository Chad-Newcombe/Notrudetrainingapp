# Notrude

Empathetic, local-first training coach (Next.js PWA). Goals, week plans, workouts, progress, and an always-on coach chat — with fixture fallbacks when no AI key is configured.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Choose River, Jax, Sol, or Nova at the start of the onboarding quiz, or use a demo profile on Welcome to go straight to Today. Profiles saved before coach selection use River by default.

Request text and email check-ins from the **Inbox** tab. Both formats appear inside Notrude. Phone and email connection controls are demos.

## Run the live coach on your own machine

Notrude uses a self-hosted OpenAI-compatible endpoint for chat, onboarding acknowledgments, weekly plans, and Inbox check-ins. The default model is **Qwen3 4B Instruct 2507**, a 2.5 GB quantized download under Apache 2.0. Running it on your own machine requires no provider account or per-request fee.

1. Install [Ollama](https://ollama.com/download). Start it with cloud features disabled and leave it running. If the desktop app has already started Ollama, quit it before starting the local service below.

   ```bash
   OLLAMA_NO_CLOUD=1 OLLAMA_CONTEXT_LENGTH=8192 ollama serve
   ```

   In PowerShell, set `$env:OLLAMA_NO_CLOUD = "1"` and `$env:OLLAMA_CONTEXT_LENGTH = "8192"` before running `ollama serve`.

2. In a second terminal, download the model once.

   ```bash
   ollama pull qwen3:4b-instruct-2507-q4_K_M
   ```

3. Add the following to `.env.local` in the Notrude project and restart Next.js.

   ```dotenv
   NOTRUDE_LLM_BASE_URL=http://127.0.0.1:11434/v1
   NOTRUDE_MODEL=qwen3:4b-instruct-2507-q4_K_M
   ```

The URL is resolved by the Next.js server. Run Next.js and Ollama together on a machine you control, and keep the inference endpoint private. A hosted Next.js deployment cannot reach Ollama on your laptop through its own localhost. To try from a phone on the same trusted network, bind Next.js to your LAN and open the computer's LAN address. Ollama can stay bound to localhost. If you use a private, authenticated reverse proxy you control, set `NOTRUDE_LLM_API_KEY` on the server to its bearer token. Keep these settings server-side.

With no model URL, the app uses built-in demo responses. A configured model never falls back to a paid provider. Ollama has to be running for live coaching.

## Coach models

The coach picker loads the selected coach's 3D preview on demand. Other screens use lightweight portraits rendered from the same models. The Blender source in `design/coaches/build_models.py` generates the four GLBs and WebP portraits.

```bash
blender --background --python-exit-code 1 --python design/coaches/build_models.py
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
