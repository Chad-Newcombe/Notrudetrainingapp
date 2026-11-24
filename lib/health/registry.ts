import type { HealthProviderId } from "@/lib/types";
import type { HealthProviderDefinition } from "./types";

const sources: HealthProviderDefinition[] = [
  {
    id: "strava",
    label: "Strava",
    mode: "oauth",
    availabilityNote: "Sync recent activities through your Strava account.",
    actionLabel: "Connect Strava",
  },
  {
    id: "apple_health",
    label: "Apple Health",
    mode: "native_required",
    availabilityNote: "Workouts, steps, sleep, resting heart rate and weight, read only, so your coach can judge load and recovery.",
    actionLabel: "Open the iPhone app to connect",
  },
  {
    id: "garmin",
    label: "Garmin Connect",
    mode: "partner_required",
    availabilityNote: "Connection requires approval through the Garmin Connect Developer Program.",
    actionLabel: "Partner access required",
  },
];

export function getHealthSources(): HealthProviderDefinition[] {
  return sources;
}

export function getHealthSource(id: HealthProviderId): HealthProviderDefinition {
  const source = sources.find((s) => s.id === id);
  if (!source) {
    throw new Error(`Unknown health provider: ${id}`);
  }
  return source;
}
