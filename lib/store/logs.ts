import type { WorkoutLog } from "@/lib/types";
import { readRecords, writeRecord } from "./storage";

export async function listLogs(): Promise<WorkoutLog[]> {
  const logs = await readRecords("logs");
  return logs.sort(
    (a, b) =>
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );
}

export async function upsertLog(log: WorkoutLog): Promise<void> {
  await writeRecord("logs", log.id, log);
}
