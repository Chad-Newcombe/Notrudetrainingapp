import type { HealthProviderId } from "@/lib/types";
import { mockApple } from "./mock-apple";
import { mockGarmin } from "./mock-garmin";
import { mockStrava } from "./mock-strava";
import type { HealthSource } from "./types";

const sources: HealthSource[] = [mockStrava, mockGarmin, mockApple];

export function getHealthSources(): HealthSource[] {
  return sources;
}

export function getHealthSource(id: HealthProviderId): HealthSource {
  const source = sources.find((s) => s.id === id);
  if (!source) {
    throw new Error(`Unknown health provider: ${id}`);
  }
  return source;
}
