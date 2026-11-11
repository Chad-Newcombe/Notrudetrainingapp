"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { CoachStage } from "@/components/coach/CoachStage";
import { useAccount } from "@/components/account/AccountProvider";
import { NotrudeMark } from "@/components/brand/NotrudeMark";
import { Button } from "@/components/ui/Button";
import { type DemoProfileId, seedDemoProfile } from "@/lib/demo/seed";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";

export default function WelcomePage() {
  const router = useRouter();
  const { user } = useAccount();
  const { ready, profile, plan, reload } = useNotrudeStore();
  const [seeding, setSeeding] = useState<DemoProfileId | null>(null);

  const tryDemo = useCallback(
    async (id: DemoProfileId) => {
      setSeeding(id);
      try {
        await seedDemoProfile(id);
        await reload();
        router.push("/today");
      } finally {
        setSeeding(null);
      }
    },
    [reload, router],
  );

  const continueHref =
    profile && plan ? "/today" : profile ? "/acknowledgment" : undefined;

  return (
    <main className="flex min-h-[100dvh] flex-col justify-between bg-[var(--app-canvas)] px-6 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="flex flex-1 flex-col justify-center gap-10">
        <NotrudeMark />
        <CoachStage coachId={profile?.coachId ?? "river"} label="A coach in your corner"
          title="Training that meets you where you are."
          description="Find a rhythm that fits the life you already have." />
      </div>

      <div className="flex flex-col gap-3">
        {ready && continueHref ? (
          <Button href={continueHref} className="w-full">
            Continue
          </Button>
        ) : null}

        {!profile ? (
          <>
            <Button
              href="/quiz"
              className="w-full"
              variant={continueHref ? "ghost" : "primary"}
            >
              Start with a short quiz
            </Button>
            {!user && <div className="space-y-2 border-t border-[var(--app-line)] pt-4">
              <p className="text-center text-sm text-[var(--app-muted)]">
                Or hop in with a demo — no quiz required
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="w-full sm:flex-1"
                  variant="ghost"
                  disabled={seeding != null}
                  onClick={() => void tryDemo("ultra")}
                >
                  {seeding === "ultra" ? "Loading demo…" : "Ultra runner"}
                </Button>
                <Button
                  className="w-full sm:flex-1"
                  variant="ghost"
                  disabled={seeding != null}
                  onClick={() => void tryDemo("gentle-start")}
                >
                  {seeding === "gentle-start"
                    ? "Loading demo…"
                    : "Gentle start"}
                </Button>
              </div>
            </div>}
          </>
        ) : null}
        <Button href="/account" variant="ghost" className="w-full">
          {user ? "Your account" : "Sign in or create an account"}
        </Button>
      </div>
    </main>
  );
}
