import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const DEFAULT_MODEL = "qwen3:4b-instruct-2507-q4_K_M";

export function getModel() {
  const baseURL = process.env.NOTRUDE_LLM_BASE_URL?.trim();
  if (!baseURL) return null;

  const provider = createOpenAICompatible({
    name: "notrude-local",
    baseURL: baseURL.replace(/\/+$/, ""),
    apiKey: process.env.NOTRUDE_LLM_API_KEY?.trim() || undefined,
    supportsStructuredOutputs: true,
  });

  return provider.chatModel(process.env.NOTRUDE_MODEL?.trim() || DEFAULT_MODEL);
}

export function localGenerationOptions(signal: AbortSignal, timeoutMs = 120_000) {
  return {
    abortSignal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
    maxRetries: 0,
  };
}
