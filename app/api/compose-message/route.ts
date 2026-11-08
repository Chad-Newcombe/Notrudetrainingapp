import { generateText, Output } from "ai";
import { createId } from "@/lib/ids";
import { EMPATHY_SYSTEM_RULES } from "@/lib/ai/empathy";
import { fixtureComposedMessage } from "@/lib/ai/fixtures";
import { getModel, hasAiKey } from "@/lib/ai/model";
import { composedMessageBodySchema } from "@/lib/ai/schemas";
import type { ComposedMessage, UserProfile } from "@/lib/types";

type ComposeChannel = "text_style" | "email_outline";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    profile: UserProfile;
    channel: ComposeChannel;
    recentSummary?: string;
  };
  const { profile, channel, recentSummary } = body;

  if (!hasAiKey()) {
    return Response.json({ message: fixtureComposedMessage(channel, profile) });
  }

  const formHint =
    channel === "email_outline"
      ? "Return subject and body for a supportive weekly email outline."
      : "Return body only for a short text-style nudge (no subject).";

  const result = await generateText({
    model: getModel(),
    output: Output.object({ schema: composedMessageBodySchema }),
    system: `${EMPATHY_SYSTEM_RULES}\n${formHint}`,
    prompt: JSON.stringify({ profile, channel, recentSummary }),
  });

  const message: ComposedMessage = {
    id: createId(),
    channel,
    subject: channel === "email_outline" ? result.output.subject : undefined,
    body: result.output.body,
    createdAt: new Date().toISOString(),
  };

  return Response.json({ message });
}
