import type { TrainingPlan } from "@/lib/types";
import { getDb } from "./db";

const PLAN_KEY = "plan";

export async function getPlan(): Promise<TrainingPlan | null> {
  const db = await getDb();
  const value = await db.get("meta", PLAN_KEY);
  return (value as TrainingPlan | undefined) ?? null;
}

export async function savePlan(plan: TrainingPlan): Promise<void> {
  const db = await getDb();
  await db.put("meta", plan, PLAN_KEY);
}
