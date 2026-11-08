import type { HealthConnection } from "@/lib/types";
import { getDb } from "./db";

export async function listHealth(): Promise<HealthConnection[]> {
  const db = await getDb();
  return db.getAll("health");
}

export async function saveHealth(c: HealthConnection): Promise<void> {
  const db = await getDb();
  await db.put("health", c);
}
