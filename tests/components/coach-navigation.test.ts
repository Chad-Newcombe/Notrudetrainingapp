// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { CoachComposer, CoachNavigation } from "@/components/coach/CoachChat";

describe("coach area navigation", () => {
  it("owns Inbox navigation and starts the composer empty", () => {
    render(
      createElement(
        "div",
        null,
        createElement(CoachNavigation),
        createElement(CoachComposer, {
          input: "",
          busy: false,
          onInput: vi.fn(),
          onSubmit: vi.fn(),
        }),
      ),
    );

    expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute("href", "/inbox");
    expect(screen.getByRole("textbox", { name: "Message coach" })).toHaveValue("");
  });
});
