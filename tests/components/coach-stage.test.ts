// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoachStage } from "@/components/coach/CoachStage";

describe("CoachStage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps the coach usable with the original static fallback when WebGL 2 is unavailable", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = render(createElement(CoachStage, {
      coachId: "river",
      label: "Your coach · River",
      title: "In your corner",
    }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/3d is unavailable/i));
    expect(screen.getByRole("heading", { name: "In your corner" })).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", expect.stringContaining("river.webp"));
    expect(container.innerHTML).not.toContain("editorial.png");
  });

  it("loads the selected coach model and retains drag interaction", async () => {
    if (!customElements.get("model-viewer")) {
      customElements.define("model-viewer", class extends HTMLElement {});
    }
    const { container } = render(createElement(CoachStage, {
      coachId: "nova",
      label: "Your coach · Nova",
      title: "Try an experiment",
    }));

    const viewer = await waitFor(() => {
      const element = container.querySelector("model-viewer");
      expect(element).toBeInTheDocument();
      return element as HTMLElement;
    });
    expect(viewer).toHaveAttribute("src", "/coaches/nova.glb");
    expect(viewer).toHaveAttribute("camera-controls");
    fireEvent.load(viewer);
    expect(await screen.findByText("Drag to rotate")).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("editorial.png");
  });
});
