import { generateText, Output } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { cachedSystem, getModel } from "@/lib/ai/model";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("coaching model configuration", () => {
  it("stays in fixture mode with legacy paid-provider credentials present", () => {
    vi.stubEnv("NOTRUDE_LLM_BASE_URL", undefined);
    vi.stubEnv("ANTHROPIC_API_KEY", undefined);
    vi.stubEnv("AI_GATEWAY_API_KEY", "legacy-gateway-key");
    vi.stubEnv("OPENAI_API_KEY", "legacy-openai-key");

    expect(getModel()).toBeNull();
  });

  it("selects the Qwen default for an explicitly configured local endpoint, even with a Claude key", () => {
    vi.stubEnv("NOTRUDE_LLM_BASE_URL", "http://127.0.0.1:11434/v1");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("NOTRUDE_MODEL", undefined);

    expect(getModel()?.modelId).toBe("qwen3:4b-instruct-2507-q4_K_M");
  });

  it("uses Claude Sonnet 5.5 with direct answers, medium effort, fallback and native structured output", async () => {
    vi.stubEnv("NOTRUDE_LLM_BASE_URL", undefined);
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("NOTRUDE_CLAUDE_MODEL", undefined);
    const fetch = vi.fn(async () => Response.json({
      id: "msg_1", type: "message", role: "assistant", model: "claude-sonnet-5-5", stop_reason: "end_turn", stop_sequence: null,
      content: [{ type: "text", text: "{\"line\":\"Nice work.\"}" }], usage: { input_tokens: 10, output_tokens: 5 },
    }));
    vi.stubGlobal("fetch", fetch);

    const model = getModel()!;
    const { output } = await generateText({ model, prompt: "hi", temperature: 0.3, maxOutputTokens: 140, output: Output.object({ schema: z.object({ line: z.string() }) }) });

    expect(output).toEqual({ line: "Nice work." });
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("claude-sonnet-5-5");
    expect(body.thinking).toEqual({ type: "between_tools" });
    expect(body.output_config).toMatchObject({ effort: "medium", format: { type: "json_schema" } });
    expect(body.fallbacks).toBe("default");
    expect(body.temperature).toBeUndefined(); // Sonnet 5.5 rejects sampling settings
    expect(body.tool_choice).toBeUndefined(); // and forced tool use
    expect(new Headers(init.headers).get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
  });

  it("caches the stable system prompt on Claude and leaves the per-turn part uncached", async () => {
    vi.stubEnv("NOTRUDE_LLM_BASE_URL", undefined);
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    const fetch = vi.fn(async () => Response.json({
      id: "msg_1", type: "message", role: "assistant", model: "claude-sonnet-5-5", stop_reason: "end_turn", stop_sequence: null,
      content: [{ type: "text", text: "Hi." }], usage: { input_tokens: 10, output_tokens: 2 },
    }));
    vi.stubGlobal("fetch", fetch);

    await generateText({ model: getModel()!, system: cachedSystem("voice and context", "reminder"), prompt: "hi" });

    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.system).toEqual([
      { type: "text", text: "voice and context", cache_control: { type: "ephemeral" } },
      { type: "text", text: "reminder" },
    ]);
  });

  it("gives a local model one plain system string", () => {
    vi.stubEnv("NOTRUDE_LLM_BASE_URL", "http://127.0.0.1:11434/v1");
    expect(cachedSystem("voice", "reminder")).toBe("voice\n\nreminder");
  });
});
