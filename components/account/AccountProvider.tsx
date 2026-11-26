"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { setStorageAccount } from "@/lib/store/storage";

type AccountState = {
  enabled: boolean;
  google?: boolean;
  user: { id: string; name: string; email: string } | null;
};

const AccountContext = createContext<AccountState>({ enabled: false, user: null });

/** Lets the launch animation fade out; safe to call more than once. */
export function markAppReady() {
  if (document.documentElement.hasAttribute("data-app-ready")) return;
  document.documentElement.setAttribute("data-app-ready", "");
  window.dispatchEvent(new Event("notrude-ready"));
}

export function useAccount() {
  return useContext(AccountContext);
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccountState | null>(null);
  const [error, setError] = useState("");
  const pathname = usePathname();
  // Tells the launch animation the first real screen is ready (or that there's an error to show).
  // The welcome page decides for itself, since a returning user goes straight on to Today.
  useEffect(() => {
    if ((state && pathname !== "/") || error) markAppReady();
  }, [state, error, pathname]);
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
      <p role="status" className={error ? "text-[var(--app-muted)]" : "sr-only"}>{error || "Opening Not Rude Training…"}</p>
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
