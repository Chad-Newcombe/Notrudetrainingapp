import { generateText } from "ai";
import { EMPATHY_SYSTEM_RULES } from "@/lib/ai/empathy";
import { fixtureAcknowledgment, fixtureReflection } from "@/lib/ai/fixtures";
import { getModel, localGenerationOptions } from "@/lib/ai/model";
import type { UserProfile } from "@/lib/types";

type ReflectKind = "acknowledgment" | "reflection";

export async function POST(req: Request) {
  const body = (await req.json()) as { profile: UserProfile; kind: ReflectKind };
  const { profile, kind } = body;

  const model = getModel();
  if (!model) {
    const text =
      kind === "acknowledgment"
        ? fixtureAcknowledgment(profile)
        : fixtureReflection(profile);
    return Response.json({ text });
  }

  const task =
    kind === "acknowledgment"
      ? "Write a short onboarding acknowledgment (2–4 sentences) that reflects their goal in their own words and names a gentle starting place. No lecture."
      : "Write a brief progress reflection (2–4 sentences) that honors their goal and invites them to notice small wins without shame.";

  const result = await generateText({
    model,
    ...localGenerationOptions(req.signal),
    maxOutputTokens: 300,
    system: `${EMPATHY_SYSTEM_RULES}\n${task}`,
    prompt: JSON.stringify({ profile }),
  });

  return Response.json({ text: result.text });
}
