"use client";

import { useEffect, useState } from "react";
import { QuizWizard } from "@/components/quiz/QuizWizard";
import { getPlan, getProfile } from "@/lib/store";
import type { UserProfile } from "@/lib/types";

export default function QuizPage() {
  const [saved, setSaved] = useState<{ profile: UserProfile | null; hasPlan: boolean } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([getProfile(), getPlan()]).then(([profile, plan]) => {
      if (active) setSaved({ profile, hasPlan: Boolean(plan) });
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, []);

  if (!saved) {
    return <p className="min-h-[100dvh] bg-[var(--app-canvas)] px-6 py-8 text-[var(--app-muted)]" role="status">
      {failed ? "Couldn’t load your profile. Refresh to try again." : "Opening your intake…"}
    </p>;
  }

  return <QuizWizard profile={saved.profile} hasPlan={saved.hasPlan} />;
}
