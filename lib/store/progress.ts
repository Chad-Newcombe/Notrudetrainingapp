import type { ProgressSnapshot } from "@/lib/types";
import { readRecords, writeRecord } from "./storage";

export async function listProgress(): Promise<ProgressSnapshot[]> {
  const snapshots = await readRecords("progress");
  return snapshots.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function addProgress(s: ProgressSnapshot): Promise<void> {
  await writeRecord("progress", s.id, s);
}
