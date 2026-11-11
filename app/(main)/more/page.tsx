"use client";

import { CoachSwitcher } from "@/components/coach/CoachSwitcher";
import { HealthConnections } from "@/components/progress/HealthConnections";
import { Button } from "@/components/ui/Button";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";

export default function MorePage() {
  const { profile, reload } = useNotrudeStore();

  return (
    <main className="page-enter flex flex-col gap-8 px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <header>
        <p className="meta-label">More</p>
        <h1 className="mt-2 font-display text-[1.75rem] font-semibold tracking-[-0.035em] text-[var(--ink)]">
          Settings and connections
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">
          Shape how your coach works with you and manage connected services.
        </p>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="preferences-heading">
        <h2 id="preferences-heading" className="meta-label">Preferences</h2>
        <Button href="/quiz" variant="ghost" className="w-full">
          Update coaching preferences
        </Button>
        <Button href="/account" variant="ghost" className="w-full">
          Your account
        </Button>
      </section>

      {profile ? (
        <CoachSwitcher profile={profile} onChanged={() => void reload()} />
      ) : null}

      <HealthConnections />
    </main>
  );
}
