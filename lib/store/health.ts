import type { HealthConnection } from "@/lib/types";
import { readRecords, writeRecord } from "./storage";

export async function listHealth(): Promise<HealthConnection[]> {
  return readRecords("health");
}

export async function saveHealth(c: HealthConnection): Promise<void> {
  await writeRecord("health", c.provider, c);
}
