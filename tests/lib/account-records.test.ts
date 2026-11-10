import { describe, expect, it } from "vitest";
import { parseRecord } from "@/lib/account/records";

describe("account record validation", () => {
  it("accepts an older profile without a coach or intake brief", () => {
    const legacy = {
      goalText: "Build a walking habit",
      tone: "gentle",
      cadence: "brief",
      motivation: "process_focus",
      channels: ["in_app"],
      trackWeight: false,
      createdAt: "2026-11-10T18:00:00.000Z",
    };
    expect(parseRecord({ collection: "meta", key: "profile", value: legacy })?.value).toEqual(legacy);
  });

  it("rejects mismatched keys and records that cannot render", () => {
    const log = { id: "log1", sessionId: "session1", status: "completed", completedAt: "2026-11-10" };
    expect(parseRecord({ collection: "logs", key: "log2", value: log })).toBeNull();
    expect(parseRecord({ collection: "logs", key: "log1", value: { ...log, status: "unknown" } })).toBeNull();
    expect(parseRecord({ collection: "meta", key: "arbitrary", value: {} })).toBeNull();
  });
});
