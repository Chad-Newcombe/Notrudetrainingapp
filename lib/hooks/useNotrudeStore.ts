"use client";

import { useCallback, useEffect, useState } from "react";
import { getPlan, getProfile, listLogs, listPlanHistory } from "@/lib/store";
import type { TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

export function useNotrudeStore() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [history, setHistory] = useState<TrainingPlan[]>([]);

  const reload = useCallback(async () => {
    const [p, pl, lg, hs] = await Promise.all([getProfile(), getPlan(), listLogs(), listPlanHistory()]);
    setProfile(p);
    setPlan(pl);
    setLogs(lg);
    setHistory(hs);
    setReady(true);
  }, []);

  useEffect(() => {
    void reload().catch(() => { /* The account provider surfaces storage errors. */ });
  }, [reload]);

  return { ready, profile, plan, logs, history, reload };
}
