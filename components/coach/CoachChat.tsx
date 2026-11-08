"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QuickChips } from "@/components/coach/QuickChips";
import { createCoachFetch } from "@/lib/coach/fixture-fetch";
import {
  chatMessageToUi,
  uiMessagesToChat,
  uiMessageText,
} from "@/lib/coach/messages";
import { buildHealthSummary } from "@/lib/health/summary";
import { listChat, listHealth, replaceChat } from "@/lib/store";
import type { TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

type Props = {
  profile: UserProfile;
  plan: TrainingPlan | null;
  logs: WorkoutLog[];
};

export function CoachChat({ profile, plan, logs }: Props) {
  const searchParams = useSearchParams();
  const [boot, setBoot] = useState<UIMessage[] | null>(null);
  const [healthSummary, setHealthSummary] = useState<string | undefined>();
  const createdAtById = useRef(new Map<string, string>());
  const promptSent = useRef(false);
  const coachFetch = useMemo(() => createCoachFetch(), []);

  useEffect(() => {
    void (async () => {
      const [stored, health] = await Promise.all([listChat(), listHealth()]);
      for (const m of stored) {
        createdAtById.current.set(m.id, m.createdAt);
      }
      setHealthSummary(buildHealthSummary(health));
      setBoot(stored.map(chatMessageToUi));
    })();
  }, []);

  const persist = useCallback(async (messages: UIMessage[]) => {
    const chat = uiMessagesToChat(messages, createdAtById.current);
    for (const m of chat) {
      if (!createdAtById.current.has(m.id)) {
        createdAtById.current.set(m.id, m.createdAt);
      }
    }
    await replaceChat(chat);
  }, []);

  if (boot === null) {
    return (
      <p className="text-[var(--muted)]">Loading your conversation…</p>
    );
  }

  return (
    <CoachChatInner
      boot={boot}
      profile={profile}
      plan={plan}
      logs={logs}
      healthSummary={healthSummary}
      coachFetch={coachFetch}
      persist={persist}
      searchParams={searchParams}
      promptSent={promptSent}
    />
  );
}

function CoachChatInner({
  boot,
  profile,
  plan,
  logs,
  healthSummary,
  coachFetch,
  persist,
  searchParams,
  promptSent,
}: {
  boot: UIMessage[];
  profile: UserProfile;
  plan: TrainingPlan | null;
  logs: WorkoutLog[];
  healthSummary?: string;
  coachFetch: ReturnType<typeof createCoachFetch>;
  persist: (messages: UIMessage[]) => Promise<void>;
  searchParams: ReturnType<typeof useSearchParams>;
  promptSent: React.MutableRefObject<boolean>;
}) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, clearError } = useChat({
    messages: boot,
    transport: new DefaultChatTransport({
      api: "/api/coach",
      fetch: coachFetch,
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: {
          ...body,
          messages,
          profile,
          plan,
          logs,
          healthSummary,
        },
      }),
    }),
    onFinish: ({ messages }) => {
      void persist(messages);
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const lastUserText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "user") return uiMessageText(m);
    }
    return null;
  }, [messages]);

  const retry = useCallback(() => {
    clearError();
    const text = lastUserText;
    if (text) void sendMessage({ text });
  }, [clearError, lastUserText, sendMessage]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (!prompt || promptSent.current || busy) return;
    promptSent.current = true;
    void sendMessage({ text: prompt });
    // promptSent is a ref — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, sendMessage, busy]);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setInput("");
      await sendMessage({ text: trimmed });
    },
    [busy, sendMessage],
  );

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
          Coach
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          No guilt, no streak shame — just help for the day you&apos;re in.
        </p>
        {offline ? (
          <p className="mt-2 rounded-xl bg-black/20 px-3 py-2 text-xs text-[var(--muted)]">
            You appear offline. Messages queue locally; coach replies need a
            connection or demo fixtures from the server.
          </p>
        ) : null}
      </div>

      <div
        ref={listRef}
        className="flex max-h-[min(52dvh,28rem)] min-h-48 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl bg-[var(--surface)] p-4 ring-1 ring-white/10"
      >
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            Ask anything about your plan, energy level, or what to do today.
          </p>
        )}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {busy && (
          <p className="text-sm text-[var(--muted)]" aria-live="polite">
            Coach is typing…
          </p>
        )}
      </div>

      {error ? (
        <div
          className="flex flex-col gap-2 rounded-2xl bg-black/25 px-4 py-3 text-sm text-[var(--ink)]"
          role="alert"
        >
          <p>Coach couldn&apos;t respond right now. Nothing you typed was lost.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="self-start font-medium text-[var(--accent)] underline-offset-4 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : null}

      <QuickChips onPick={(text) => void submit(text)} disabled={busy} />

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(input);
        }}
      >
        <label className="sr-only" htmlFor="coach-input">
          Message coach
        </label>
        <input
          id="coach-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What's on your mind?"
          disabled={busy}
          className="min-w-0 flex-1 rounded-full bg-[var(--surface)] px-4 py-3 text-base text-[var(--ink)] ring-1 ring-white/10 placeholder:text-[var(--muted)] focus:outline-none focus:ring-[var(--accent)]/50 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-full bg-[var(--accent)] px-5 py-3 text-base font-medium text-[var(--bg0)] disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = uiMessageText(message);
  if (!text) return null;

  return (
    <div
      className={`max-w-[90%] rounded-2xl px-4 py-3 text-base leading-relaxed ${
        isUser
          ? "ml-auto bg-[var(--accent-soft)] text-[var(--ink)]"
          : "mr-auto bg-black/20 text-[var(--ink)]"
      }`}
    >
      {text}
    </div>
  );
}
