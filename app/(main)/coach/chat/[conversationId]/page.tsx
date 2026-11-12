"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CoachChat } from "@/components/coach/CoachChat";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";
import { getCoachConversation } from "@/lib/store";
import type { CoachConversation } from "@/lib/types";

export default function CoachChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { profile, plan, logs } = useNotrudeStore();
  const [loaded, setLoaded] = useState<{ id: string; record?: CoachConversation } | null>(null);
  useEffect(() => {
    let current = true;
    void getCoachConversation(conversationId).then((record) => {
      if (current) setLoaded({ id: conversationId, record });
    }).catch(() => { if (current) setLoaded({ id: conversationId }); });
    return () => { current = false; };
  }, [conversationId]);
  if (!profile) return null;
  const record = loaded?.record;
  return (
    <main className="px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      {!loaded || loaded.id !== conversationId ? <p role="status">Loading your conversation…</p> :
        !record || record.status !== "active" || record.coachId !== profile.coachId ? (
          <div className="flex flex-col gap-3">
            <p>This chat is unavailable for your selected coach.</p>
            <Link href="/coach" className="min-h-11 font-semibold underline">Back to Coach</Link>
          </div>
        ) : <CoachChat key={record.id} conversation={record} profile={profile} plan={plan} logs={logs} />}
    </main>
  );
}
