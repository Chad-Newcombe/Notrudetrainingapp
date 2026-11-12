"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { reconcileCoachSessions, retryCoachSessionProcessing } from "@/lib/store/coach-conversations";

export function CoachSessionLifecycle({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const [readyPath, setReadyPath] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let current = true;
    setError(false);
    const id = /^\/coach\/chat\/([^/]+)$/.exec(pathname)?.[1];
    void reconcileCoachSessions(id).then(() => {
      if (current) setReadyPath(pathname);
    }).catch(() => { if (current) setError(true); });
    return () => { current = false; };
  }, [pathname]);
  useEffect(() => {
    const retry = () => { void retryCoachSessionProcessing().catch(() => {}); };
    retry();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);
  if (error) return <p role="alert">Couldn’t save your conversation. Reopen Coach to try again.</p>;
  if (readyPath !== pathname) return <p role="status">Saving your conversation…</p>;
  return children;
}
