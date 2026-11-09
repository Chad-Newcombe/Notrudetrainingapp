import { generateText, Output } from "ai";
import { EMPATHY_SYSTEM_RULES } from "@/lib/ai/empathy";
import { fixturePlanForProfile } from "@/lib/ai/fixtures";
import { getModel, localGenerationOptions } from "@/lib/ai/model";
import { normalizePlanFromSchema } from "@/lib/ai/normalize-plan";
import { planSchema } from "@/lib/ai/schemas";
import type { UserProfile } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as { profile: UserProfile; notes?: string };
  const { profile, notes } = body;

  const model = getModel();
  if (!model) {
    return Response.json({ plan: fixturePlanForProfile(profile) });
  }

  const result = await generateText({
    model,
    ...localGenerationOptions(req.signal, 360_000),
    maxOutputTokens: 1800,
    output: Output.object({ schema: planSchema }),
    system: `${EMPATHY_SYSTEM_RULES}\nReturn a one-week training plan as JSON matching the schema. Include only scheduled sessions, with dayIndex 0 for Monday through 6 for Sunday. Keep each rationale to one sentence and use 1–3 short, actionable steps per session.`,
    prompt: JSON.stringify({ profile, notes }),
  });

  const plan = normalizePlanFromSchema(result.output, profile);
  return Response.json({ plan });
}
