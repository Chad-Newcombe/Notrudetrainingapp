import { z } from "zod";
import type { CoachConversation, ConversationArchive } from "@/lib/types";

const filler = /\b(?:I see|I hear you|No pressure|You['’]ve got this|Just say yes or no)\b/i;
export const conversationArchiveSchema = z.object({
  title: z.string().trim().min(1).max(80).refine((text) => !filler.test(text), "Use a factual title"),
  summary: z.string().trim().min(1).max(220).refine((text) => !filler.test(text), "Use a factual summary"),
  resultLabels: z.array(z.string().trim().min(1).max(80)).max(10),
}).strict();

function excerpt(text: string, limit: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length <= limit ? compact : `${compact.slice(0, limit - 1).trimEnd()}…`;
}

// No model call, inferred preference, or old transcript in a prompt: just literal excerpts.
export function fallbackConversationArchive(conversation: CoachConversation): ConversationArchive {
  const turns = conversation.messages.filter((message) => message.role === "user" && message.content.trim());
  if (!turns.length) throw new Error("Cannot archive a conversation without a user turn");
  const title = excerpt(turns[0].content, 80);
  const lastRequest = excerpt(turns[turns.length - 1].content, 204);
  const userCount = conversation.messages.filter((message) => message.role === "user").length;
  // Do not edit potentially meaningful user language such as "No pressure on my
  // knee". Use literal metadata for an affected excerpt and keep the transcript.
  return {
    title: filler.test(title) ? "Conversation" : title,
    summary: filler.test(lastRequest)
      ? `${userCount} user ${userCount === 1 ? "message" : "messages"}.`
      : `Last request: "${lastRequest}"`,
    resultLabels: [...conversation.resultLabels],
  };
}
