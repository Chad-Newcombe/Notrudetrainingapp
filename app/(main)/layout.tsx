"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomTabs } from "@/components/shell/BottomTabs";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";
import { onboardingRedirect } from "@/lib/navigation/onboarding";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { ready, profile, plan } = useNotrudeStore();

  useEffect(() => {
    if (!ready) return;
    const dest = onboardingRedirect(profile, plan);
    if (dest) router.replace(dest);
  }, [ready, profile, plan, router]);

  if (!ready) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-6">
        <p className="text-[var(--muted)]">Loading your week…</p>
      </main>
    );
  }

  const dest = onboardingRedirect(profile, plan);
  if (dest) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-6">
        <p className="text-[var(--muted)]">One moment…</p>
      </main>
    );
  }

  return (
    <>
      {children}
      <BottomTabs />
    </>
  );
}
