import type { UIMessage } from "ai";

type LegacyMessage = {
  role: string;
  content?: string;
  parts?: { type: string; text?: string }[];
};

export function lastUserText(messages: Array<UIMessage | LegacyMessage>): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;

    if ("parts" in message && Array.isArray(message.parts)) {
      const text = message.parts
        .filter((part) => part.type === "text" && "text" in part && part.text)
        .map((part) => ("text" in part ? part.text : ""))
        .join("\n")
        .trim();
      if (text) return text;
    }

    if ("content" in message && typeof message.content === "string" && message.content.trim()) {
      return message.content.trim();
    }
  }
  return "";
}
