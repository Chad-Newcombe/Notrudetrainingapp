import { PLAN_HISTORY_LIMIT } from "@/lib/account/records";
import type { TrainingPlan } from "@/lib/types";
import { readRecord, writeRecord } from "./storage";

const PLAN_KEY = "plan";
const HISTORY_KEY = "plan-history";

export async function getPlan(): Promise<TrainingPlan | null> {
  const value = await readRecord("meta", PLAN_KEY);
  return (value as TrainingPlan | undefined) ?? null;
}

/** Past weeks, oldest first. Each week keeps its last saved version. */
export async function listPlanHistory(): Promise<TrainingPlan[]> {
  const value = await readRecord("meta", HISTORY_KEY);
  return Array.isArray(value) ? value : [];
}

/** Saving a plan for a new week moves the previous week into history first. */
export async function savePlan(plan: TrainingPlan): Promise<void> {
  const current = await getPlan();
  if (current && current.weekStartIso !== plan.weekStartIso) {
    const history = (await listPlanHistory()).filter((week) => week.weekStartIso !== current.weekStartIso);
    const next = [...history, current]
      .sort((a, b) => a.weekStartIso.localeCompare(b.weekStartIso))
      .slice(-PLAN_HISTORY_LIMIT);
    await writeRecord("meta", HISTORY_KEY, next);
  }
  await writeRecord("meta", PLAN_KEY, plan);
}
