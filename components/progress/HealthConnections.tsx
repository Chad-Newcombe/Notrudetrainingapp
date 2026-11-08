"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getHealthSources } from "@/lib/health/registry";
import { listHealth, saveHealth } from "@/lib/store";
import type { HealthConnection } from "@/lib/types";

export function HealthConnections() {
  const sources = getHealthSources();
  const [connections, setConnections] = useState<HealthConnection[]>([]);
  const [busy, setBusy] = useState<HealthConnection["provider"] | null>(null);

  const reload = useCallback(async () => {
    setConnections(await listHealth());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function connectionFor(provider: HealthConnection["provider"]) {
    return connections.find((c) => c.provider === provider);
  }

  async function connect(provider: HealthConnection["provider"]) {
    const source = sources.find((s) => s.id === provider);
    if (!source || busy) return;
    setBusy(provider);
    try {
      const { summary } = await source.connect();
      await saveHealth({
        provider,
        connected: true,
        lastSyncedAt: new Date().toISOString(),
        sampleSummary: summary,
      });
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(provider: HealthConnection["provider"]) {
    const source = sources.find((s) => s.id === provider);
    if (!source || busy) return;
    setBusy(provider);
    try {
      await source.disconnect();
      await saveHealth({
        provider,
        connected: false,
      });
      await reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
        Health connections
      </h2>
      <p className="text-base text-[var(--muted)]">
        Optional mock sync — sample activities stay on this device only.
      </p>
      <ul className="flex flex-col gap-3">
        {sources.map((source) => {
          const conn = connectionFor(source.id);
          const isConnected = conn?.connected === true;
          const isBusy = busy === source.id;

          return (
            <li
              key={source.id}
              className="panel flex flex-col gap-2 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-medium text-[var(--ink)]">
                    {source.label}
                  </p>
                  {source.availabilityNote ? (
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {source.availabilityNote}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 text-xs uppercase tracking-wide ${
                    isConnected
                      ? "text-[var(--sage)]"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {isConnected ? "Connected" : "Off"}
                </span>
              </div>
              {isConnected && conn?.sampleSummary ? (
                <p className="text-sm leading-relaxed text-[var(--ink)]">
                  {conn.sampleSummary}
                </p>
              ) : null}
              {isConnected && conn?.lastSyncedAt ? (
                <p className="text-xs text-[var(--muted)]">
                  Last synced{" "}
                  {new Date(conn.lastSyncedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              ) : null}
              {isConnected ? (
                <Button
                  className="w-full"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={() => void disconnect(source.id)}
                >
                  {isBusy ? "Updating…" : "Disconnect"}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={() => void connect(source.id)}
                >
                  {isBusy ? "Connecting…" : "Connect"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
