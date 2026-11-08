export function hasAiKey(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY);
}

export function getModel(): string {
  return process.env.NOTRUDE_MODEL ?? "openai/gpt-4.1-mini";
}
