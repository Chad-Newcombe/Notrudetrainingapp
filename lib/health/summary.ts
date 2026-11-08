import type { HealthConnection } from "@/lib/types";

export function buildHealthSummary(
  connections: HealthConnection[],
): string | undefined {
  const parts = connections
    .filter((c) => c.connected && c.sampleSummary)
    .map((c) => `${c.provider}: ${c.sampleSummary}`);
  return parts.length > 0 ? parts.join("; ") : undefined;
}
