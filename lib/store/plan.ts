import type { TrainingPlan } from "@/lib/types";
import { readRecord, writeRecord } from "./storage";

const PLAN_KEY = "plan";

export async function getPlan(): Promise<TrainingPlan | null> {
  const value = await readRecord("meta", PLAN_KEY);
  return (value as TrainingPlan | undefined) ?? null;
}

export async function savePlan(plan: TrainingPlan): Promise<void> {
  await writeRecord("meta", PLAN_KEY, plan);
}
