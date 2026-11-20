import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defaultSettingsMiddleware, wrapLanguageModel, type SystemModelMessage } from "ai";

const DEFAULT_LOCAL_MODEL = "qwen3:4b-instruct-2507-q4_K_M";
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-5-5";

/**
 * The coach model, chosen from server settings:
 * - NOTRUDE_LLM_BASE_URL set: a local or private OpenAI-compatible server (Ollama in development).
 * - otherwise ANTHROPIC_API_KEY set: Claude, for the hosted app and TestFlight.
 * - neither: null, and every route falls back to its fixture replies.
 */
export function getModel() {
  const baseURL = process.env.NOTRUDE_LLM_BASE_URL?.trim();
  if (baseURL) {
    const provider = createOpenAICompatible({
      name: "notrude-local",
      baseURL: baseURL.replace(/\/+$/, ""),
      apiKey: process.env.NOTRUDE_LLM_API_KEY?.trim() || undefined,
      supportsStructuredOutputs: true,
    });
    return provider.chatModel(process.env.NOTRUDE_MODEL?.trim() || DEFAULT_LOCAL_MODEL);
  }

  if (!process.env.ANTHROPIC_API_KEY?.trim()) return null;
  return wrapLanguageModel({
    model: createAnthropic()(process.env.NOTRUDE_CLAUDE_MODEL?.trim() || DEFAULT_CLAUDE_MODEL),
    middleware: defaultSettingsMiddleware({
      settings: {
        providerOptions: {
          anthropic: {
            // The routes give short replies tight output caps that thinking tokens would eat into,
            // so Sonnet 5.5 answers directly. Medium effort keeps chat quick without thinning plans.
            thinking: { type: "between_tools" },
            effort: "medium",
            // A declined request is retried on Anthropic's fallback model inside the same call.
            fallbacks: "default",
          },
        },
      },
    }),
  });
}

export function localGenerationOptions(signal: AbortSignal, timeoutMs = 120_000) {
  return {
    abortSignal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
    // Ollama is local, so a failure is real; the Claude API retries rate limits and overloads.
    maxRetries: process.env.NOTRUDE_LLM_BASE_URL?.trim() ? 0 : 2,
  };
}

/**
 * A system prompt with a Claude cache breakpoint after `stable`, so the next turns of a chat read it at
 * about a twentieth of the input price. `rest` changes every turn and stays uncached. Local models get one string.
 */
export function cachedSystem(stable: string, rest = ""): string | SystemModelMessage[] {
  if (process.env.NOTRUDE_LLM_BASE_URL?.trim()) return [stable, rest].filter(Boolean).join("\n\n");
  return [
    { role: "system", content: stable, providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } } },
    ...(rest ? [{ role: "system" as const, content: rest }] : []),
  ];
}
