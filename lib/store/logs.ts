import type { WorkoutLog } from "@/lib/types";
import { getDb } from "./db";

export async function listLogs(): Promise<WorkoutLog[]> {
  const db = await getDb();
  const logs = await db.getAll("logs");
  return logs.sort(
    (a, b) =>
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );
}

export async function upsertLog(log: WorkoutLog): Promise<void> {
  const db = await getDb();
  await db.put("logs", log);
}
