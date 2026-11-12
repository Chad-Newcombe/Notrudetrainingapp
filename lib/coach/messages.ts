import type { ChatMessage, ChatRole } from "@/lib/types";
import type { UIMessage } from "ai";

export function chatMessageToUi(m: ChatMessage): UIMessage {
  return {
    id: m.id,
    role: m.role === "system" ? "system" : m.role,
    parts: [{ type: "text", text: m.content }],
  };
}

/** Strips the formatting local models add on their own: markdown emphasis, headings, and long dashes. */
export function cleanCoachText(text: string): string {
  return text
    .replace(/[*`]+/g, "")
    .replace(/^\s*(?:#+|>|[-•])\s+/gm, "")
    .replace(/(\d)\s*[—–]\s*(?=\d)/g, "$1-")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n");
}

export function uiMessageText(message: UIMessage): string {
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
  return message.role === "assistant" ? cleanCoachText(text) : text;
}

export function uiMessagesToChat(
  messages: UIMessage[],
  createdAtById: Map<string, string>,
): ChatMessage[] {
  const now = new Date().toISOString();
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as ChatRole,
      content: uiMessageText(m),
      createdAt: createdAtById.get(m.id) ?? now,
    }));
}
