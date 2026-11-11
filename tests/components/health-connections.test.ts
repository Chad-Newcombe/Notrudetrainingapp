// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HealthConnections } from "@/components/progress/HealthConnections";
import { clearAll } from "@/lib/store";

let accountUser: { id: string; name: string; email: string } | null = null;

vi.mock("@/components/account/AccountProvider", () => ({
  useAccount: () => ({ enabled: true, user: accountUser }),
}));

describe("HealthConnections", () => {
  beforeEach(async () => {
    accountUser = null;
    await clearAll();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      configured: true,
      signedIn: Boolean(accountUser),
      connected: false,
    }), { headers: { "content-type": "application/json" } })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("offers real Strava OAuth to a signed-in user and disables unavailable providers", async () => {
    accountUser = { id: "user-1", name: "Ari", email: "ari@example.com" };
    render(createElement(HealthConnections));

    expect(await screen.findByRole("link", { name: "Connect Strava" }))
      .toHaveAttribute("href", "/api/health/strava/connect");
    expect(screen.getByRole("button", { name: "iOS app required" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Partner access required" })).toBeDisabled();
    expect(screen.queryByText(/mock sync/i)).not.toBeInTheDocument();
  });

  it("sends a guest to sign in instead of starting OAuth", async () => {
    render(createElement(HealthConnections));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(await screen.findByRole("link", { name: "Sign in to connect" }))
      .toHaveAttribute("href", "/account?health=strava");
  });
});
