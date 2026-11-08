import { z } from "zod";

const planStepSchema = z.object({
  name: z.string(),
  detail: z.string(),
  durationMin: z.number().optional(),
});

export const planSessionSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  title: z.string(),
  rationale: z.string(),
  steps: z.array(planStepSchema),
  intensity: z.enum(["easy", "moderate", "hard"]),
});

export const planSchema = z.object({
  sessions: z.array(planSessionSchema),
});

export type PlanSchemaOutput = z.infer<typeof planSchema>;
