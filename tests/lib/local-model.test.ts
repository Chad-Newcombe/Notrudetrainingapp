import { afterEach, describe, expect, it, vi } from "vitest";
import { getModel } from "@/lib/ai/model";

afterEach(() => vi.unstubAllEnvs());

describe("coaching model configuration", () => {
  it("stays in fixture mode with legacy paid-provider credentials present", () => {
    vi.stubEnv("NOTRUDE_LLM_BASE_URL", undefined);
    vi.stubEnv("AI_GATEWAY_API_KEY", "legacy-gateway-key");
    vi.stubEnv("OPENAI_API_KEY", "legacy-openai-key");

    expect(getModel()).toBeNull();
  });

  it("selects the Qwen default for an explicitly configured local endpoint", () => {
    vi.stubEnv("NOTRUDE_LLM_BASE_URL", "http://127.0.0.1:11434/v1");
    vi.stubEnv("NOTRUDE_MODEL", undefined);

    expect(getModel()?.modelId).toBe("qwen3:4b-instruct-2507-q4_K_M");
  });
});
