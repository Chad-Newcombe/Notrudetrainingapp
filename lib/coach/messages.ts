import type { ChatMessage, ChatRole } from "@/lib/types";
import type { UIMessage } from "ai";

export function chatMessageToUi(m: ChatMessage): UIMessage {
  return {
    id: m.id,
    role: m.role === "system" ? "system" : m.role,
    parts: [{ type: "text", text: m.content }],
  };
}

export function uiMessageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
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
