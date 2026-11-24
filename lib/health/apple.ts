import { Capacitor } from "@capacitor/core";
import { Health, type HealthDataType, type HealthSample, type Workout } from "@capgo/capacitor-health";
import { saveHealth } from "@/lib/store";

// Read only: what a coach needs to judge load and recovery. Nothing is written to Health.
const READ: HealthDataType[] = ["workouts", "steps", "sleep", "restingHeartRate", "weight"];
const DAY = 86_400_000;

export type AppleHealthSnapshot = {
  workouts: Pick<Workout, "workoutType" | "duration" | "startDate">[];
  dailySteps: number[];
  sleep: Pick<HealthSample, "startDate" | "endDate" | "sleepState">[];
  restingHeartRate?: number;
  weightKg?: number;
};

// The plugin also has a browser version, so it counts only inside the iPhone app.
export const appleHealthAvailable = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("Health");

const words = (type: string) => type.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
  .replace(/^(traditional|functional) strength training$/, "strength training");

/** One plain line for the coach and the Health card, e.g. "4 workouts in 14 days (…); 7,900 steps a day; …". */
export function summarizeAppleHealth(data: AppleHealthSnapshot): string {
  const parts: string[] = [];
  if (data.workouts.length) {
    const minutes = Math.round(data.workouts.reduce((sum, w) => sum + w.duration, 0) / 60);
    const kinds = [...new Set(data.workouts.map((w) => words(w.workoutType)))].slice(0, 3).join(", ");
    parts.push(`${data.workouts.length} workout${data.workouts.length === 1 ? "" : "s"} in 14 days, ${minutes} min total (${kinds})`);
  }
  const stepDays = data.dailySteps.filter((steps) => steps > 0);
  if (stepDays.length) parts.push(`${Math.round(stepDays.reduce((a, b) => a + b, 0) / stepDays.length).toLocaleString("en-US")} steps a day`);
  // Each night is grouped by the day it ends, so a sleep that starts before midnight counts once.
  const nights = new Map<string, number>();
  for (const s of data.sleep) {
    if (s.sleepState === "inBed" || s.sleepState === "awake") continue;
    const night = s.endDate.slice(0, 10);
    nights.set(night, (nights.get(night) ?? 0) + (Date.parse(s.endDate) - Date.parse(s.startDate)));
  }
  if (nights.size) {
    const hours = [...nights.values()].reduce((a, b) => a + b, 0) / nights.size / 3_600_000;
    parts.push(`${hours.toFixed(1)} h sleep a night`);
  }
  if (data.restingHeartRate) parts.push(`resting heart rate ${Math.round(data.restingHeartRate)} bpm`);
  if (data.weightKg) parts.push(`weight ${Math.round(data.weightKg * 2.20462)} lb`);
  return parts.join("; ") || "No recent workouts, steps, or sleep in Apple Health.";
}

/** Asks iOS for read access (the sheet appears only the first time), reads the last two weeks and saves the summary. */
export async function syncAppleHealth(now = new Date()) {
  const { available, reason } = await Health.isAvailable();
  if (!available) throw new Error(reason || "Apple Health isn’t available on this device.");
  await Health.requestAuthorization({ read: READ });

  const end = now.toISOString();
  const since = (days: number) => new Date(now.getTime() - days * DAY).toISOString();
  // iOS never says whether reading was refused, so a denied type simply comes back empty.
  const empty = { samples: [] as HealthSample[] };
  const [workouts, steps, sleep, heart, weight] = await Promise.all([
    Health.queryWorkouts({ startDate: since(14), endDate: end, limit: 50 }).catch(() => ({ workouts: [] })),
    Health.queryAggregated({ dataType: "steps", startDate: since(7), endDate: end, bucket: "day", aggregation: "sum" }).catch(() => empty),
    Health.readSamples({ dataType: "sleep", startDate: since(7), endDate: end, limit: 500 }).catch(() => empty),
    Health.readSamples({ dataType: "restingHeartRate", startDate: since(14), endDate: end, limit: 1 }).catch(() => empty),
    Health.readSamples({ dataType: "weight", startDate: since(60), endDate: end, limit: 1 }).catch(() => empty),
  ]);

  const summary = summarizeAppleHealth({
    workouts: workouts.workouts,
    dailySteps: steps.samples.map((s) => s.value),
    sleep: sleep.samples,
    restingHeartRate: heart.samples[0]?.value,
    weightKg: weight.samples[0]?.value,
  });
  await saveHealth({ provider: "apple_health", connected: true, lastSyncedAt: end, sampleSummary: summary });
  return summary;
}
