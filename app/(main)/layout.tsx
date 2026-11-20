"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CoachSessionLifecycle } from "@/components/coach/CoachSessionLifecycle";
import { backFallback } from "@/components/shell/EdgeSwipeBack";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";
import { onboardingRedirect } from "@/lib/navigation/onboarding";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  // Today is the bento home and the hub: every other screen goes back to it (or swipe from the left edge).
  const pathname = usePathname();
  const home = pathname === "/today";
  const { ready, profile, plan } = useNotrudeStore();

  useEffect(() => {
    if (!ready) return;
    const dest = onboardingRedirect(profile, plan);
    if (dest) router.replace(dest);
  }, [ready, profile, plan, router]);

  if (!ready) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--canvas-soft)] px-6">
        <p className="text-[var(--muted)]">Loading your week…</p>
      </main>
    );
  }

  const dest = onboardingRedirect(profile, plan);
  if (dest) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--canvas-soft)] px-6">
        <p className="text-[var(--muted)]">One moment…</p>
      </main>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--canvas-soft)]">
      {home ? null : (
        <Link href={backFallback(pathname)} aria-label="Back" className="main-back bento-glass-button"><ChevronLeft size={22} aria-hidden /></Link>
      )}
      <div className={home ? undefined : "main-back-clearance"}><CoachSessionLifecycle>{children}</CoachSessionLifecycle></div>
    </div>
  );
}
