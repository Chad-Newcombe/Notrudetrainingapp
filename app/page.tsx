"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { NotrudeMark } from "@/components/brand/NotrudeMark";
import { Button } from "@/components/ui/Button";
import { type DemoProfileId, seedDemoProfile } from "@/lib/demo/seed";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";

export default function WelcomePage() {
  const router = useRouter();
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
    <main className="theme-dark atmosphere-dark flex min-h-[100dvh] flex-col justify-between px-6 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="page-enter flex flex-1 flex-col justify-center gap-10">
        <NotrudeMark />
        <div className="space-y-4">
          <h1 className="font-display max-w-[14ch] text-[1.85rem] font-semibold leading-[1.1] tracking-[-0.035em] text-[var(--ink)]">
            Training that meets you where you are.
          </h1>
          <p className="max-w-[34ch] text-base leading-relaxed text-[var(--muted)]">
            Set a goal on your terms—no shame, no streak pressure—just a plan
            that adapts when life happens.
          </p>
        </div>
      </div>

      <div className="cta-settle flex flex-col gap-3">
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
            <div className="space-y-2 border-t border-[var(--line)] pt-4">
              <p className="text-center text-sm text-[var(--muted)]">
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
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
