"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StartCoachChat } from "@/components/coach/StartCoachChat";
import { getCoach } from "@/lib/coaches/presets";
import { deleteCoachConversation, getCoachConversation } from "@/lib/store";
import type { CoachConversation, CoachId } from "@/lib/types";

const quiet = "min-h-11 rounded-[var(--radius-control)] border border-[var(--app-line)] px-4 font-semibold text-[var(--app-text)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--app-focus)] disabled:opacity-60";

function DeleteConversation({ conversationId, coachName }: { conversationId: string; coachName: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "busy" | "error">("idle");
  async function remove() {
    setState("busy");
    try {
      await deleteCoachConversation(conversationId);
      router.push("/coach");
    } catch { setState("error"); }
  }
  if (state === "idle") return <button type="button" className={quiet} onClick={() => setState("confirm")}>Delete this conversation</button>;
  return (
    <div className="panel flex flex-col gap-3 p-4">
      <p role={state === "error" ? "alert" : undefined} className="text-sm text-[var(--app-text)]">
        {state === "error" ? "Couldn’t delete this conversation. Try again." : `This permanently deletes the transcript. What ${coachName} remembers stays until you remove it under More.`}
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={quiet} disabled={state === "busy"} onClick={() => void remove()}>Delete permanently</button>
        <button type="button" className={quiet} disabled={state === "busy"} onClick={() => setState("idle")}>Keep conversation</button>
      </div>
    </div>
  );
}

export function ArchivedConversation({ conversationId, coachId }: { conversationId: string; coachId: CoachId }) {
  const [loaded, setLoaded] = useState<{ id: string; coachId: CoachId; record?: CoachConversation } | null>(null);
  useEffect(() => {
    let current = true;
    void getCoachConversation(conversationId).then((record) => {
      if (current) setLoaded({ id: conversationId, coachId, record });
    }).catch(() => { if (current) setLoaded({ id: conversationId, coachId }); });
    return () => { current = false; };
  }, [conversationId, coachId]);

  if (!loaded || loaded.id !== conversationId || loaded.coachId !== coachId) return <p role="status">Loading previous chat…</p>;
  const record = loaded.record;
  if (!record || record.coachId !== coachId || record.status !== "archived") return (
    <div className="flex flex-col gap-3">
      <p>This previous chat is unavailable for your selected coach.</p>
      <Link href="/coach" className="min-h-11 font-semibold underline">Back to Coach</Link>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Link href="/coach" className="min-h-11 font-semibold underline">Back to Coach</Link>
      <header>
        <p className="meta-label">{getCoach(coachId).name} · Previous chat</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--app-text)]">{record.title || "Conversation"}</h1>
        <time dateTime={record.archivedAt ?? record.updatedAt} className="mt-2 block text-sm text-[var(--app-muted)]">{new Date(record.archivedAt ?? record.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time>
        {record.summary ? <p className="mt-2 text-sm text-[var(--app-muted)]">{record.summary}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">{record.resultLabels.map((label, index) => (
          <span key={index} className="rounded-[var(--radius-control)] border border-[var(--app-line)] px-2 py-1 text-xs font-semibold">{label}</span>
        ))}</div>
      </header>
      <div role="log" aria-label="Archived conversation" className="panel coach-conversation flex flex-col gap-3 p-4">
        {record.messages.map((message) => (
          <div key={message.id} className={`max-w-[90%] whitespace-pre-wrap rounded-[var(--radius-panel)] border border-[var(--app-line)] px-4 py-3 leading-relaxed ${message.role === "user" ? "ml-auto bg-[var(--app-raised-strong)]" : "mr-auto bg-[var(--app-raised)]"}`}>
            <p className="mb-1 text-xs font-semibold text-[var(--app-muted)]">{message.role === "user" ? "You" : message.role === "assistant" ? getCoach(coachId).name : "System"}</p>
            {message.content}
          </div>
        ))}
      </div>
      <StartCoachChat key={record.id} coachId={coachId} continuedFromId={record.id} />
      <DeleteConversation conversationId={record.id} coachName={getCoach(coachId).name} />
    </div>
  );
}
