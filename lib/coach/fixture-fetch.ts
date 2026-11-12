import type { FetchFunction } from "@ai-sdk/provider-utils";

function uiMessageStreamBody(text: string): string {
  const messageId = crypto.randomUUID();
  const chunks = [
    { type: "start", messageId },
    { type: "start-step" },
    { type: "text-start", id: "text-1" },
    { type: "text-delta", id: "text-1", delta: text },
    { type: "text-end", id: "text-1" },
    { type: "finish-step" },
    { type: "finish" },
  ];
  return (
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
    "data: [DONE]\n\n"
  );
}

/** `planChange` reports whether the server judged the latest message to be a plan change. */
export function createCoachFetch(): FetchFunction & { planChange: boolean } {
  const coachFetch = Object.assign((async (input, init) => {
    const response = await fetch(input, init);
    coachFetch.planChange = response.headers.get("X-Notrude-Plan-Change") === "1";
    const isFixture = response.headers.get("X-Notrude-Fixture") === "1";
    const contentType = response.headers.get("content-type") ?? "";

    if (
      isFixture ||
      (response.ok && contentType.includes("application/json"))
    ) {
      const data = (await response.json()) as { text?: string };
      if (typeof data.text === "string") {
        return new Response(uiMessageStreamBody(data.text), {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }
    }

    return response;
  }) as FetchFunction, { planChange: false });
  return coachFetch;
}
