"use client";

import { CoachChat } from "@/components/coach/CoachChat";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";

export default function CoachPage() {
  const { profile, plan, logs } = useNotrudeStore();
  if (!profile) return null;

  return (
    <main className="px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <CoachChat profile={profile} plan={plan} logs={logs} />
    </main>
  );
}
