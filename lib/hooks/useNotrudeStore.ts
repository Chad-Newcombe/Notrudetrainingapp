"use client";

import { useCallback, useEffect, useState } from "react";
import { getPlan, getProfile, listLogs } from "@/lib/store";
import type { TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

export function useNotrudeStore() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  const reload = useCallback(async () => {
    const [p, pl, lg] = await Promise.all([getProfile(), getPlan(), listLogs()]);
    setProfile(p);
    setPlan(pl);
    setLogs(lg);
    setReady(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ready, profile, plan, logs, reload };
}
