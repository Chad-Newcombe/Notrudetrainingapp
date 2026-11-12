"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { reconcileCoachSessions, retryCoachSessionProcessing } from "@/lib/store/coach-conversations";

export function CoachSessionLifecycle({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const [visit, setVisit] = useState({ pathname, ready: false, error: false });
  // A return to a formerly ready URL is a new visit, even if its close is pending.
  if (visit.pathname !== pathname) setVisit({ pathname, ready: false, error: false });
  useEffect(() => {
    let current = true;
    const id = /^\/coach\/chat\/([^/]+)$/.exec(pathname)?.[1];
    void reconcileCoachSessions(id).then(() => {
      if (current) setVisit({ pathname, ready: true, error: false });
    }).catch(() => { if (current) setVisit({ pathname, ready: false, error: true }); });
    return () => { current = false; };
  }, [pathname]);
  useEffect(() => {
    const retry = () => { void retryCoachSessionProcessing().catch(() => {}); };
    retry();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);
  if (visit.pathname === pathname && visit.error) return <p role="alert">Couldn’t save your conversation. Reopen Coach to try again.</p>;
  if (visit.pathname !== pathname || !visit.ready) return <p role="status">Saving your conversation…</p>;
  return children;
}
