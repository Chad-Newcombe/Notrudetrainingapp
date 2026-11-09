import { generateText, Output } from "ai";
import { createId } from "@/lib/ids";
import { EMPATHY_SYSTEM_RULES } from "@/lib/ai/empathy";
import { fixtureComposedMessage } from "@/lib/ai/fixtures";
import { getModel, localGenerationOptions } from "@/lib/ai/model";
import { composedMessageBodySchema } from "@/lib/ai/schemas";
import { getCoach } from "@/lib/coaches/presets";
import type { ComposedMessage, UserProfile } from "@/lib/types";

type ComposeChannel = "text_style" | "email_outline";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    profile: UserProfile;
    channel: ComposeChannel;
    recentSummary?: string;
  };
  const { profile, channel, recentSummary } = body;

  const model = getModel();
  if (!model) {
    return Response.json({ message: fixtureComposedMessage(channel, profile) });
  }

  const coach = getCoach(profile.coachId);
  const formHint =
    channel === "email_outline"
      ? "Return subject and body for a supportive weekly email FROM the user's coach TO the user (first person as the coach)."
      : "Return body only for a short text FROM the coach TO the user (no subject).";

  const result = await generateText({
    model,
    ...localGenerationOptions(req.signal),
    maxOutputTokens: 450,
    output: Output.object({ schema: composedMessageBodySchema }),
    system: `${EMPATHY_SYSTEM_RULES}\nYou are ${coach.name}. Your default style is ${coach.vibe}. Match the user's chosen tone and cadence.\n${formHint}\nSign as ${coach.name}.`,
    prompt: JSON.stringify({ profile, channel, recentSummary }),
  });

  const now = new Date().toISOString();
  const message: ComposedMessage = {
    id: createId(),
    channel,
    subject: channel === "email_outline" ? result.output.subject : undefined,
    body: result.output.body,
    createdAt: now,
    fromCoachId: coach.id,
    direction: "coach_to_user",
    deliveredAt: now,
  };

  return Response.json({ message });
}
