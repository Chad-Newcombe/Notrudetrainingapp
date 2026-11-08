import { generateText, Output } from "ai";
import { EMPATHY_SYSTEM_RULES } from "@/lib/ai/empathy";
import { fixturePlanForProfile } from "@/lib/ai/fixtures";
import { getModel, hasAiKey } from "@/lib/ai/model";
import { normalizePlanFromSchema } from "@/lib/ai/normalize-plan";
import { planSchema } from "@/lib/ai/schemas";
import type { UserProfile } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as { profile: UserProfile; notes?: string };
  const { profile, notes } = body;

  if (!hasAiKey()) {
    return Response.json({ plan: fixturePlanForProfile(profile) });
  }

  const result = await generateText({
    model: getModel(),
    output: Output.object({ schema: planSchema }),
    system: `${EMPATHY_SYSTEM_RULES}\nReturn a one-week training plan as JSON matching the schema.`,
    prompt: JSON.stringify({ profile, notes }),
  });

  const plan = normalizePlanFromSchema(result.output, profile);
  return Response.json({ plan });
}
