"use client";

import { CoachSwitcher } from "@/components/coach/CoachSwitcher";
import { HealthConnections } from "@/components/progress/HealthConnections";
import { Button } from "@/components/ui/Button";
import { AppearanceControl } from "@/components/theme/AppearanceControl";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";

export default function MorePage() {
  const { profile, reload } = useNotrudeStore();

  return (
    <main className="flex flex-col gap-9 px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <header>
        <p className="meta-label">More</p>
        <h1 className="mt-2 text-[2rem] font-bold tracking-[-0.045em] text-[var(--app-text)]">
          Settings and connections
        </h1>
        <p className="mt-2 text-base text-[var(--app-muted)]">
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

      {profile ? <AppearanceControl profile={profile} onChanged={() => void reload()} /> : null}

      <section className="border-t border-[var(--app-line)] pt-7" aria-labelledby="coach-settings-heading">
        <h2 id="coach-settings-heading" className="mb-3 text-base font-semibold text-[var(--app-text)]">Coach</h2>
        {profile ? <CoachSwitcher profile={profile} onChanged={() => void reload()} /> : null}
      </section>

      <div className="border-t border-[var(--app-line)] pt-7"><HealthConnections /></div>
    </main>
  );
}
