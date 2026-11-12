import type { HealthProviderId } from "@/lib/types";

export type HealthActivity = {
  id: string;
  title: string;
  minutes: number;
  at: string;
};

export type HealthProviderMode = "oauth" | "native_required" | "partner_required";

export interface HealthProviderDefinition {
  id: HealthProviderId;
  label: string;
  mode: HealthProviderMode;
  availabilityNote: string;
  actionLabel: string;
}
