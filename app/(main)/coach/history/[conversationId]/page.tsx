"use client";

import { useParams } from "next/navigation";
import { ArchivedConversation } from "@/components/coach/ArchivedConversation";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";

export default function CoachHistoryPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { profile } = useNotrudeStore();
  if (!profile) return null;
  return (
    <main className="px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <ArchivedConversation conversationId={conversationId} coachId={profile.coachId} />
    </main>
  );
}
