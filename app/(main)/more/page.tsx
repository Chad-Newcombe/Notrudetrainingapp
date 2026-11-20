"use client";

import { CoachMemoryManager } from "@/components/coach/CoachMemoryManager";
import { HealthConnections } from "@/components/progress/HealthConnections";
import { Button } from "@/components/ui/Button";
import { AppearanceControl } from "@/components/theme/AppearanceControl";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";

export default function MorePage() {
  const { profile, reload } = useNotrudeStore();

  return (
    <main className="settings-room flex flex-col gap-4 px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="mb-2 px-1">
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

      {/* Changing coach lives on the Coach screens; this page keeps only what isn't reachable elsewhere. */}
      <CoachMemoryManager />

      <div><HealthConnections /></div>
    </main>
  );
}
