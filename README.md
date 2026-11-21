# Notrude

Empathetic, local-first training coach (Next.js PWA). Goals, week plans, workouts, progress, and an always-on coach chat — with fixture fallbacks when no local model is configured.

## Run locally

Use Node 24.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Choose one of the six coaches at the start of the onboarding quiz, or use a demo profile on Welcome to go straight to Today. Profiles saved before coach selection use River by default.

In intake, tell your coach what fits your week, how you want support on difficult days, and what progress means to you. Review and edit the resulting coaching notes before saving. When a local model is configured, it interprets your answers. The quick draft uses built-in suggestions and leaves unfamiliar preferences open for you to fill in. The conversation answers are temporary. The app saves your approved notes alongside your explicit profile fields.

Already using Notrude? Open **More → Update coaching preferences** to revisit intake. This preserves your saved week and workout history. The new notes inform live chat, future plan generation, and check-ins.

Request text and email check-ins from the **Inbox** tab. Both formats appear inside Notrude. Phone and email connection controls are demos.

## Test the current branch in a browser

From a Git checkout with Node 24, pull the branch you want to test and run:

```bash
npm ci
npm run preview
```

Wait for **Ready**, then open [http://127.0.0.1:4310](http://127.0.0.1:4310) in a browser on the same machine. The **Notrude Preview** banner shows the Git commit and flags local edits. Compare that commit with the pull request before reviewing changes. Choose **Gentle start** on Welcome to try Today, Coach, and Inbox, or open **Sign in or create an account** to test saved progress.

To pick up a new push, stop the preview with Ctrl+C, run `git pull --ff-only` from the branch you’re tracking, then run the commands above again. The preview builds into `.next-preview`; test accounts need `DATABASE_URL` in `.env.local`. Use the same preview URL and browser to keep guest data between runs. The browser's guest data is scoped to this URL,.

If the preview was started on the shared cloud desktop, open the URL inside **Cloud browser**. To open the same URL in your own browser, run the preview on your own computer. If you’ve set up local Ollama, the preview uses the same model settings as the app.

For an end-to-end test in your own browser, run the preview and Ollama together on your computer.

## Run the live coach on your own machine

Notrude uses a self-hosted OpenAI-compatible endpoint for intake interpretation, chat, onboarding acknowledgments, weekly plans, and Inbox check-ins. The default model is **Qwen3 4B Instruct 2507**, a 2.5 GB quantized download under Apache 2.0. Running it on your own machine requires no provider account or per-request fee.

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

## Coach conversations and memory

Each coach has its own channel. Coach opens on that coach's landing: **Start a new chat** above its previous chats. A new chat is empty, and the model is not called until you send a message.

Leaving Coach or switching coaches archives a chat that has at least one message and discards an empty one. Archived chats are read-only. **Continue from here** starts a new chat that carries only the archived summary, and **Delete this conversation** removes the transcript after confirmation.

Each coach keeps its own notes about how you like to be coached; these never cross between coaches. **More → What your coaches remember** lists them by coach and lets you remove any item. Removing a note doesn't change a transcript, and deleting a transcript doesn't remove a note. A note about ability, constraints, or schedule can be shared with all coaches from the same screen.

If you ask a coach for a style outside its range, the app offers one **Switch to {coach}** control. Chat text alone never changes your coach.

Chats saved before this version are kept as one archived **Legacy conversation** under the coach you had selected. Titles, summaries, and learned notes for archived chats need the local model; without one, built-in summaries are used.

## Coaches

There are six coaches: River (calm), Jax (upbeat), Sol (direct), Nova (curious), Knox (no-excuses accountability), and Riff (coaches with stand-up-style humour). Knox does not accept a skipped session without pain, injury, illness, or an emergency, and never insults the user. Riff writes original jokes and does not imitate real comedians.

Today is a bento home in the leading coach's colour family: swipe between Today, Week and Progress. The floating orb at the bottom opens the coach chat on frosted glass over the screen, and the buttons beside it skip or check in today's session. Each coach appears as a glowing orb in its own colour and pace. The orbs are plain CSS, so there is no 3D model to load and nothing to drag.

Any coach can change the week from chat. An explicit request such as “I want a harder plan” or “move my walk to Friday” revises the saved plan, shows what changed, and can be undone. With a local model, the model names the edit (add, remove, move, replace, set, harder, easier) and the app applies it, so the rest of the week is untouched and the coach confirms what was saved. Requests that need a whole new week still regenerate the plan. Without a model, the same edits work for common phrasings such as “add a yoga day”, “move Tuesday to Friday”, or “swap my run for a bike ride”. Without a local model, harder and easier requests scale the built-in plan’s intensity and duration.

## Check-ins, history and coach notes

Finishing a session asks for the minutes you did and how it felt (easy, about right, hard, or pain). The coach replies in its own voice. After two easy sessions in a row it can offer to step the next session up, and after a hard or painful one it offers to ease it back; the change only happens if you accept it. The app chooses the change and the coach explains it, so the card always matches what is applied.

Past weeks are kept when a new week is planned. When a week ends, Today offers **Plan this week with {coach}**, which builds the new week from last week's plan and check-ins. The streak counts planned sessions in a row: rest days never break it, only a skipped or missed session does.

The note on Today and the weekly update on Progress are written by the leading coach, saved for the day or week, and rewritten when you log or skip a session. Without a local model, built-in demo replies are used.

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

## iOS app (Capacitor)

`ios/` is a Capacitor shell around the hosted app. The coach, plan and sign-in run on the Next.js server, so the iPhone app loads that server instead of bundled files. `native/www` is only a fallback page for a build with no server address.

1. Install full Xcode, then `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
2. Point the app at a server and sync: `NOTRUDE_APP_URL=https://your-deployment npm run ios:sync`. To try a dev server on a phone on your own network, use `http://<this Mac's LAN address>:3100` and run Next.js with `-H 0.0.0.0`.
3. `npm run ios:open`, choose your team under Signing & Capabilities, and run on a phone or simulator.
4. For TestFlight from Xcode: Product → Archive, then Distribute App → App Store Connect.

TestFlight without a Mac build: the **Notrude iOS** workflow builds on a GitHub macOS runner and uploads with an App Store Connect API key (Admin role), which lets Xcode sign automatically. Set the repository secrets `APPLE_TEAM_ID`, `ASC_API_KEY_P8` (the .p8 file's text), `ASC_API_KEY_ID` and `ASC_API_ISSUER_ID`, and the repository variable `NOTRUDE_APP_URL` (the hosted https server). Create the app for `com.notrude.training` in App Store Connect once. Then push a tag such as `testflight-1`, or use **Run workflow** once the workflow is on the default branch. Pull requests build without uploading. Server changes reach testers on the next app launch; only native changes need a new build.

The hosted server uses Claude: set `ANTHROPIC_API_KEY` on the server and leave `NOTRUDE_LLM_BASE_URL` unset. The default model is Claude Sonnet 5.5 (`NOTRUDE_CLAUDE_MODEL` overrides it), answering directly at medium effort, with Anthropic's server-side fallback for declined requests. When `NOTRUDE_LLM_BASE_URL` is set, it wins and the local model is used, so development on Ollama is unchanged. Ollama on your Mac can't be reached from a tester's phone. Inside the app, the edge swipe back is on.

## Data

Profile, plan, logs, chat, and health connections live in **IndexedDB** in the browser (no account required).

## Accounts and saved training data

Guest mode saves data in this browser. Accounts are stored in Postgres (Supabase in production). To enable them, add these settings to `.env.local` (or the Vercel project) before starting the app.

```dotenv
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-your-generated-secret
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Use the Supabase **Transaction pooler** connection string (Connect → Transaction pooler); it suits short serverless requests. Accounts stay off until all three are set.

Generate a secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep it out of Git. Open the exact origin in `BETTER_AUTH_URL` in your browser. Use an HTTPS origin on a hosted server.

Use **Sign in or create an account** from Welcome or **More → Your account**. Signed-in profiles, plans, workouts, conversations, progress, Inbox messages, and demo connection settings are saved to the account database as you use the app. Sign in on another browser pointed at the same server to see the same records. Account mode requires a connection to that server.

On the account page, **Copy device data to account** imports the guest records from that browser into an empty account. The original guest data remains available when signed out. Accounts with existing records reject the import.

The account tables are created on first use. Email verification and password recovery need an email service and are outside this iteration.

## Interface

[Motion](https://github.com/motiondivision/motion) powers the coach entrances and sliding tab indicator, with support for reduced-motion preferences. [Motion Primitives](https://github.com/ibelick/motion-primitives) is a reference for small interactions that fit the existing React and Tailwind stack. The coach orbs are drawn in CSS.
