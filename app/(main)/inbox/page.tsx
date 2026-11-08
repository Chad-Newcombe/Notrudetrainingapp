"use client";

import { InboxView } from "@/components/inbox/InboxView";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";

export default function InboxPage() {
  const { profile } = useNotrudeStore();
  if (!profile) return null;

  return (
    <main className="bg-[var(--canvas-soft)] px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <InboxView profile={profile} />
    </main>
  );
}
