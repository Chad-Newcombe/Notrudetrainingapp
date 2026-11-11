"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { setStorageAccount } from "@/lib/store/storage";

type AccountState = {
  enabled: boolean;
  user: { id: string; name: string; email: string } | null;
};

const AccountContext = createContext<AccountState>({ enabled: false, user: null });

export function useAccount() {
  return useContext(AccountContext);
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccountState | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const onError = (event: Event) => setError((event as CustomEvent<string>).detail);
    window.addEventListener("notrude-account-error", onError);
    void (async () => {
      try {
        const response = await fetch("/api/account/state", {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]),
        });
        if (!response.ok) throw new Error("Couldn’t open your account.");
        const data = await response.json() as AccountState;
        if (controller.signal.aborted) return;
        setStorageAccount(data.user?.id ?? null);
        setState(data);
      } catch {
        if (!controller.signal.aborted) setError("Couldn’t connect to Notrude.");
      }
    })();
    return () => {
      controller.abort();
      window.removeEventListener("notrude-account-error", onError);
    };
  }, []);

  if (!state) return (
    <main className="grid min-h-[100dvh] place-content-center gap-3 px-6 text-center">
      <p role="status" className="text-[var(--app-muted)]">{error || "Opening Not Rude Training…"}</p>
      {error && <button className="underline" onClick={() => window.location.reload()}>Try again</button>}
    </main>
  );

  return (
    <AccountContext.Provider value={state}>
      {error && (
        <aside role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}{" "}
          <Link className="font-semibold underline" href="/account">Account</Link>{" "}
          <button className="underline" onClick={() => setError("")}>Dismiss</button>
        </aside>
      )}
      {children}
    </AccountContext.Provider>
  );
}
