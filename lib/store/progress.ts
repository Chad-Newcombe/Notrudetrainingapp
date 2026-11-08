import type { ProgressSnapshot } from "@/lib/types";
import { getDb } from "./db";

export async function listProgress(): Promise<ProgressSnapshot[]> {
  const db = await getDb();
  const snapshots = await db.getAll("progress");
  return snapshots.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function addProgress(s: ProgressSnapshot): Promise<void> {
  const db = await getDb();
  await db.put("progress", s);
}
