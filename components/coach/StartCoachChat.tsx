"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { startCoachConversation } from "@/lib/store/coach-conversations";
import type { CoachId } from "@/lib/types";

export function StartCoachChat({ coachId, continuedFromId }: {
  coachId: CoachId;
  continuedFromId?: string;
}) {
  const router = useRouter();
  const starting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setError("");
    try {
      const conversation = await startCoachConversation(coachId, continuedFromId);
      router.push(`/coach/chat/${conversation.id}`);
    } catch {
      starting.current = false;
      setBusy(false);
      setError("Couldn’t start a chat. Try again.");
    }
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={() => void start()}
        className="min-h-12 w-full rounded-[var(--radius-control)] bg-[var(--app-accent)] px-5 py-3 text-base font-semibold text-[var(--app-on-accent)] transition-transform active:scale-[.985] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus)] disabled:opacity-60">
        {continuedFromId ? "Continue from here" : "Start a new chat"}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-[var(--app-muted)]">{error}</p> : null}
    </div>
  );
}
