"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { QuizWizard } from "@/components/quiz/QuizWizard";
import { getPlan, getProfile } from "@/lib/store";

export default function QuizPage() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const [profile, plan] = await Promise.all([getProfile(), getPlan()]);
      if (profile && plan) router.replace("/today");
      else if (profile) router.replace("/acknowledgment");
    })();
  }, [router]);

  return <QuizWizard />;
}
