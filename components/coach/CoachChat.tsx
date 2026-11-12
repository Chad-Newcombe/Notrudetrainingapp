"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CoachStage } from "@/components/coach/CoachStage";
import { CoachSwitchSuggestion } from "@/components/coach/CoachSwitchSuggestion";
import { fixtureCoachFit, isExplicitStyleRequest, validatedCoachFit, type CoachFitSuggestion } from "@/lib/coaches/fit";
import { CoachSwitcher } from "@/components/coach/CoachSwitcher";
import { PlanUpdateStatus } from "@/components/coach/PlanUpdateStatus";
import { getCoach, DEFAULT_COACH_ID } from "@/lib/coaches/presets";
import {
  classifyPlanIntent,
  conversationForPlan,
  persistPlanTransition,
  type PlanConversationTurn,
  type PlanTransition,
} from "@/lib/coach/plan-revision";
import { createCoachFetch } from "@/lib/coach/fixture-fetch";
import {
  chatMessageToUi,
  uiMessagesToChat,
  uiMessageText,
} from "@/lib/coach/messages";
import { buildHealthSummary } from "@/lib/health/summary";
import { archiveCoachConversation, getCoachConversation, getCoachRelationship, saveCoachRelationship, listHealth, savePlan } from "@/lib/store";
import { storageGeneration } from "@/lib/store/db";
import { storageScope } from "@/lib/store/storage";
import { persistCoachMessages, registerCoachSession, trackCoachPlanTransition } from "@/lib/store/coach-conversations";
import type { CoachConversation, TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

type Props = {
  profile: UserProfile;
  conversation: CoachConversation;
  plan: TrainingPlan | null;
  logs: WorkoutLog[];
};

export function CoachNavigation() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="meta-label">Coach</p>
        <p className="mt-1 text-sm text-[var(--app-muted)]">Conversation and plan support</p>
      </div>
      <Link
        href="/inbox"
        className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--app-line)] bg-[var(--app-raised)] px-3 text-sm font-semibold text-[var(--app-text)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--app-focus)]"
      >
        <Inbox size={17} aria-hidden="true" /> Inbox
      </Link>
    </div>
  );
}

export function CoachComposer({
  input,
  busy,
  onInput,
  onSubmit,
}: {
  input: string;
  busy: boolean;
  onInput: (value: string) => void;
  onSubmit: (value: string) => void;
}) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(input);
      }}
    >
      <label className="sr-only" htmlFor="coach-input">Message coach</label>
      <input
        id="coach-input"
        autoFocus
        value={input}
        onChange={(event) => onInput(event.target.value)}
        disabled={busy}
        className="tactile-input min-w-0 flex-1 px-4 py-3 text-base text-[var(--app-text)] placeholder:text-[var(--app-muted)] disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={busy || !input.trim()}
        className="min-h-11 shrink-0 rounded-[var(--radius-control)] border border-transparent bg-[var(--app-accent)] px-5 py-3 text-base font-semibold text-[var(--app-on-accent)] transition-transform active:scale-[.985] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus)] disabled:opacity-45"
      >
        Send
      </button>
    </form>
  );
}

export function CoachChat({ profile, plan, logs, conversation }: Props) {
  const sessionScope = useRef(storageScope());
  const sessionGeneration = useRef(storageGeneration());
  const [boot, setBoot] = useState<UIMessage[] | null>(null);
  const [continuationSummary, setContinuationSummary] = useState<string | undefined>();
  const [healthSummary, setHealthSummary] = useState<string | undefined>();
  const createdAtById = useRef(new Map<string, string>());
  const coachFetch = useMemo(() => createCoachFetch(), []);

  useEffect(() => {
    void (async () => {
      const [health, prior] = await Promise.all([listHealth(), conversation.continuedFromId ? getCoachConversation(conversation.continuedFromId) : undefined]);
      const stored = conversation.messages;
      if (prior?.status === "archived" && prior.coachId === conversation.coachId) setContinuationSummary(prior.summary?.slice(0, 220));
      for (const m of stored) {
        createdAtById.current.set(m.id, m.createdAt);
      }
      setHealthSummary(buildHealthSummary(health));
      setBoot(stored.map(chatMessageToUi));
    })().catch(() => { /* The account provider surfaces storage errors. */ });
  }, [conversation]);

  const persist = useCallback(async (messages: UIMessage[]) => {
    if (sessionScope.current !== storageScope()) throw new Error("Storage account changed.");
    if (sessionGeneration.current !== storageGeneration()) throw new Error("Storage was cleared.");
    const chat = uiMessagesToChat(messages, createdAtById.current);
    for (const m of chat) {
      if (!createdAtById.current.has(m.id)) {
        createdAtById.current.set(m.id, m.createdAt);
      }
    }
    await persistCoachMessages(conversation.id, chat);
  }, [conversation]);

  if (boot === null) {
    return (
      <p className="text-[var(--muted)]">Loading your conversation…</p>
    );
  }

  return (
    <CoachChatInner
      conversationId={conversation.id}
      continuationSummary={continuationSummary}
      boot={boot}
      profile={profile}
      plan={plan}
      logs={logs}
      healthSummary={healthSummary}
      coachFetch={coachFetch}
      persist={persist}
    />
  );
}

function CoachChatInner({
  conversationId,
  continuationSummary,
  boot,
  profile,
  plan,
  logs,
  healthSummary,
  coachFetch,
  persist,
}: {
  conversationId: string;
  continuationSummary?: string;
  boot: UIMessage[];
  profile: UserProfile;
  plan: TrainingPlan | null;
  logs: WorkoutLog[];
  healthSummary?: string;
  coachFetch: ReturnType<typeof createCoachFetch>;
  persist: (messages: UIMessage[]) => Promise<void>;
}) {
  const sessionScope = useRef(storageScope());
  const sessionGeneration = useRef(storageGeneration());
  const router = useRouter();
  const [input, setInput] = useState("");
  const [fitSuggestion, setFitSuggestion] = useState<CoachFitSuggestion | null>(null);
  const [sessionClosed, setSessionClosed] = useState(false);
  const closing = useRef(false);
  const [activeProfile] = useState(profile);
  const activePlanRef = useRef(plan);
  const profileRef = useRef(activeProfile);
  const updatingMessageId = useRef<string | null>(null);
  const handledPlanMessageIds = useRef(new Set<string>());
  const pendingRevision = useRef<{ id: string; conversation: PlanConversationTurn[] } | null>(null);
  const [planUpdateState, setPlanUpdateState] = useState<"idle" | "updating" | "saved" | "error" | "undoing" | "undo-error">("idle");
  const [planTransition, setPlanTransition] = useState<PlanTransition | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    profileRef.current = activeProfile;
  }, [activeProfile]);

  const updatePlanFromConversation = useCallback(async (
    id: string,
    conversation: PlanConversationTurn[],
  ) => {
    if (handledPlanMessageIds.current.has(id) || updatingMessageId.current === id) return;
    updatingMessageId.current = id;
    pendingRevision.current = { id, conversation };
    setPlanUpdateState("updating");
    try {
      await trackCoachPlanTransition(conversationId, "updating", async () => {
        const previous = activePlanRef.current;
        const response = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: profileRef.current,
            currentPlan: previous,
            logs,
            conversation,
          }),
        });
        if (!response.ok) throw new Error("Plan request failed");
        const data = (await response.json()) as { plan?: TrainingPlan };
        if (!data.plan || !Array.isArray(data.plan.sessions)) throw new Error("Invalid plan");
        const transition = await persistPlanTransition(previous, data.plan, async (next) => {
          if (sessionScope.current !== storageScope()) throw new Error("Storage account changed.");
          if (sessionGeneration.current !== storageGeneration()) throw new Error("Storage was cleared.");
          await savePlan(next);
        });
        activePlanRef.current = data.plan;
        setPlanTransition(transition);
        handledPlanMessageIds.current.add(id);
        pendingRevision.current = null;
        setPlanUpdateState("saved");
      });
    } catch {
      setPlanUpdateState("error");
    } finally {
      updatingMessageId.current = null;
    }
  }, [logs, conversationId]);

  const { messages, sendMessage, regenerate, stop, status, error, clearError } = useChat({
    messages: boot,
    transport: new DefaultChatTransport({
      api: "/api/coach",
      fetch: coachFetch,
      prepareSendMessagesRequest: async ({ messages, body }) => {
        await persist(messages);
        const coachId = profileRef.current.coachId;
        const relationship = await getCoachRelationship(coachId);
        const latest = [...messages].reverse().find((message) => message.role === "user");
        const text = latest ? uiMessageText(latest) : "";
        if (isExplicitStyleRequest(text) && !relationship.declinedSwitchSuggestion) {
          let suggestion = fixtureCoachFit(text, coachId);
          try {
            const response = await fetch("/api/coach/fit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coachId, text, declinedSwitchSuggestion: relationship.declinedSwitchSuggestion }), signal: AbortSignal.timeout(10_000) });
            if (!response.ok) throw new Error("Fit unavailable");
            const result = await response.json();
            suggestion = result.suggestion === null ? null : validatedCoachFit(result.suggestion, text, coachId) ?? suggestion;
          } catch { /* The deterministic suggestion remains available offline. */ }
          if (!closing.current) setFitSuggestion(suggestion);
        }
        if (closing.current || sessionScope.current !== storageScope() || sessionGeneration.current !== storageGeneration()) throw new Error("Session changed");
        return {
          body: {
            ...body,
            messages,
            relationship,
            profile: profileRef.current,
            plan: activePlanRef.current,
            logs,
            healthSummary,
            continuationSummary: messages.filter((message) => message.role === "user").length === 1 ? continuationSummary : undefined,
          },
        };
      },
    }),
    onFinish: ({ messages, isAbort, isError }) => {
      void persist(messages).catch(() => { /* The account provider surfaces storage errors. */ });
      if (isAbort || isError) return;
      const latestUser = [...messages].reverse().find((message) => message.role === "user");
      const latestText = latestUser ? uiMessageText(latestUser) : "";
      if (latestUser && (coachFetch.planChange || classifyPlanIntent(latestText) === "explicit")) {
        const conversation = conversationForPlan(messages
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map((message) => ({
            role: message.role as "user" | "assistant",
            content: uiMessageText(message),
          })));
        void updatePlanFromConversation(latestUser.id, conversation);
      }
    },
  });

  const snapshot = useRef(messages);
  snapshot.current = messages;
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let mounted = true;
    void persist(messages).then(() => mounted && setStorageError(false)).catch(() => mounted && setStorageError(true));
    return () => { mounted = false; };
  }, [messages, persist]);
  useEffect(() => {
    const flush = async () => {
      const saved = persist(snapshot.current);
      await stop();
      await saved;
    };
    const unregister = registerCoachSession(conversationId, async () => {
      closing.current = true;
      setSessionClosed(true);
      await flush();
    });
    return () => {
      void flush().catch(() => {});
      unregister();
    };
  }, [conversationId, persist, stop]);

  const busy = status === "submitted" || status === "streaming"
    || planUpdateState === "updating" || planUpdateState === "undoing";
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

  const retry = useCallback(() => {
    if (closing.current) return;
    clearError();
    void regenerate();
  }, [clearError, regenerate]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  const stayWithCoach = useCallback(async () => {
    const relationship = await getCoachRelationship(profileRef.current.coachId);
    if (closing.current || sessionScope.current !== storageScope() || sessionGeneration.current !== storageGeneration()) throw new Error("Session changed");
    await saveCoachRelationship({ ...relationship, declinedSwitchSuggestion: true, updatedAt: new Date().toISOString() });
    setFitSuggestion(null);
  }, []);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy || closing.current) return;
      const stay = new RegExp(`^(?:(?:i (?:want|prefer|choose) to|i['’]ll|please|let me)\\s+)?(?:stay with (?:you|${profileRef.current.coachId})|keep (?:you|my coach)|(?:i )?(?:don['’]t|do not) (?:want to )?switch)[.!]?$`, "i");
      if (fitSuggestion && stay.test(trimmed)) await stayWithCoach();
      setInput("");
      await sendMessage({ text: trimmed });
    },
    [busy, sendMessage, fitSuggestion, stayWithCoach],
  );

  const retryPlanUpdate = useCallback(() => {
    if (closing.current) return;
    const pending = pendingRevision.current;
    if (pending) void updatePlanFromConversation(pending.id, pending.conversation);
  }, [updatePlanFromConversation]);

  const undoPlanUpdate = useCallback(async () => {
    if (closing.current) return;
    const previous = planTransition?.previous;
    if (!previous) return;
    setPlanUpdateState("undoing");
    try {
      await trackCoachPlanTransition(conversationId, "undoing", async () => {
        if (sessionScope.current !== storageScope()) throw new Error("Storage account changed.");
        if (sessionGeneration.current !== storageGeneration()) throw new Error("Storage was cleared.");
        await savePlan(previous);
      });
      activePlanRef.current = previous;
      setPlanTransition(null);
      setPlanUpdateState("idle");
    } catch {
      setPlanUpdateState("undo-error");
    }
  }, [planTransition, conversationId]);

  return (
    <div className="flex flex-col gap-4">
      <CoachNavigation />
      <CoachStage coachId={activeProfile.coachId ?? DEFAULT_COACH_ID}
        label={`Your coach · ${getCoach(activeProfile.coachId).name}`}
        title="In your corner" description="A place to figure out what fits today."
        conversation replying={busy} />
      <CoachSwitcher profile={activeProfile} beforeChange={() => archiveCoachConversation(conversationId)} onChanged={() => router.push("/coach")} />
      {storageError && <p role="alert">Couldn’t save your latest messages. Keep this chat open and try again.</p>}
      {offline && <p className="panel px-3 py-2 text-sm text-[var(--muted)]">
        You’re offline. Reconnect to get a reply.
      </p>}

      <div
        ref={listRef}
        className="panel coach-conversation flex max-h-[min(52dvh,28rem)] min-h-32 flex-col gap-3 overflow-y-auto p-4"
      >
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
          className="panel flex flex-col gap-2 px-4 py-3 text-sm text-[var(--ink)]"
          role="alert"
        >
          <p>Coach couldn&apos;t respond right now. Nothing you typed was lost.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="self-start font-semibold text-[var(--ink-strong)] underline-offset-4 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : null}

      {planUpdateState !== "idle" ? (
        <PlanUpdateStatus
          state={planUpdateState}
          transition={planTransition}
          onRetry={retryPlanUpdate}
          onUndo={undoPlanUpdate}
        />
      ) : null}

      {fitSuggestion && <CoachSwitchSuggestion suggestion={fitSuggestion} profile={activeProfile} conversationId={conversationId}
        disabled={status === "submitted" || status === "streaming"} onStay={stayWithCoach} onSwitched={() => router.push("/coach")} />}
      <CoachComposer input={input} busy={busy || sessionClosed} onInput={setInput} onSubmit={(value) => void submit(value)} />
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = uiMessageText(message);
  if (!text) return null;

  return (
    <div
      className={`max-w-[90%] rounded-[var(--radius-panel)] px-4 py-3 text-base leading-relaxed ${
        isUser
          ? "ml-auto border border-[var(--app-line)] bg-[var(--app-raised-strong)] text-[var(--app-text)]"
          : "mr-auto border border-[var(--app-line)] bg-[var(--app-raised)] text-[var(--app-text)]"
      }`}
    >
      {text}
    </div>
  );
}

