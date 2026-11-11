"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { Button } from "@/components/ui/Button";
import { getHealthSources } from "@/lib/health/registry";
import { listHealth } from "@/lib/store";
import type { HealthConnection } from "@/lib/types";

type StravaStatus = {
  configured: boolean;
  signedIn: boolean;
  connected: boolean;
};

const resultMessages: Record<string, string> = {
  "strava-connected": "Strava connected and recent activities synced.",
  "strava-denied": "Strava access wasn’t granted. Nothing was connected.",
  "strava-error": "Strava connected, but the first sync didn’t finish. Try syncing again.",
  "strava-unavailable": "Strava credentials haven’t been configured for this app yet.",
};

export function HealthConnections() {
  const { user } = useAccount();
  const sources = getHealthSources();
  const [connections, setConnections] = useState<HealthConnection[]>([]);
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => {
    const [stored, response] = await Promise.all([
      listHealth(),
      fetch("/api/health/strava/status", { cache: "no-store" }),
    ]);
    setConnections(stored);
    if (!response.ok) throw new Error("Couldn’t check Strava.");
    setStatus(await response.json() as StravaStatus);
  }, []);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("health");
    if (result && resultMessages[result]) setMessage(resultMessages[result]);
    void reload().catch(() => setMessage("Health connections couldn’t be loaded."));
  }, [reload]);

  function connectionFor(provider: HealthConnection["provider"]) {
    return connections.find((connection) => connection.provider === provider);
  }

  async function stravaAction(action: "sync" | "disconnect") {
    if (busy) return;
    setBusy(action);
    setMessage("");
    try {
      const response = await fetch(`/api/health/strava/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json() as { summary?: string; error?: string };
      if (!response.ok) throw new Error(data.error || `Strava ${action} failed.`);
      setMessage(action === "sync" ? (data.summary || "Strava synced.") : "Strava disconnected.");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Strava ${action} failed.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="health-connections-title">
      <div>
        <h2 id="health-connections-title" className="font-display text-2xl font-bold text-[var(--ink)]">Health connections</h2>
        <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
          Bring completed activities into your coaching context. Connections are optional.
        </p>
      </div>
      {message ? <p className="panel px-4 py-3 text-sm text-[var(--ink)]" role="status">{message}</p> : null}
      <ul className="flex flex-col gap-3">
        {sources.map((source) => {
          const connection = connectionFor(source.id);
          const isStrava = source.id === "strava";
          const isConnected = isStrava ? status?.connected === true : false;
          return (
            <li key={source.id} className="panel flex flex-col gap-3 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold text-[var(--ink)]">{source.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{source.availabilityNote}</p>
                </div>
                <span className={`health-status ${isConnected ? "health-status-connected" : ""}`}>
                  {isConnected ? "Connected" : source.mode === "oauth" ? "Available" : "Requires app"}
                </span>
              </div>

              {isConnected && connection?.sampleSummary ? (
                <p className="border-l-2 border-[var(--voltage)] pl-3 text-sm text-[var(--ink)]">{connection.sampleSummary}</p>
              ) : null}

              {isStrava ? (
                isConnected ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="ghost" disabled={busy !== null} onClick={() => void stravaAction("sync")}>
                      {busy === "sync" ? "Syncing…" : "Sync now"}
                    </Button>
                    <Button variant="ghost" disabled={busy !== null} onClick={() => void stravaAction("disconnect")}>
                      {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
                    </Button>
                  </div>
                ) : !user ? (
                  <Button href="/account?health=strava" variant="ghost" className="w-full">Sign in to connect</Button>
                ) : status && !status.configured ? (
                  <Button variant="ghost" className="w-full" disabled>Not configured</Button>
                ) : (
                  <Button href="/api/health/strava/connect" variant="ghost" className="w-full">Connect Strava</Button>
                )
              ) : (
                <Button variant="ghost" className="w-full" disabled>{source.actionLabel}</Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
