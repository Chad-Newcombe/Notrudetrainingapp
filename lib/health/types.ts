import type { HealthProviderId } from "@/lib/types";

export type HealthActivity = {
  id: string;
  title: string;
  minutes: number;
  at: string;
};

export interface HealthSource {
  id: HealthProviderId;
  label: string;
  availabilityNote?: string;
  connect(): Promise<{ summary: string; activities: HealthActivity[] }>;
  disconnect(): Promise<void>;
  listActivities(): Promise<HealthActivity[]>;
}
