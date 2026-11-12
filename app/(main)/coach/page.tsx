"use client";

import { CoachHome } from "@/components/coach/CoachHome";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";

export default function CoachPage() {
  const { profile } = useNotrudeStore();
  if (!profile) return null;

  return (
    <main className="px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <CoachHome key={profile.coachId} profile={profile} />
    </main>
  );
}
