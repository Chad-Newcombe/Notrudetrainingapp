// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { BottomTabs } from "@/components/shell/BottomTabs";

vi.mock("next/navigation", () => ({ usePathname: () => "/progress" }));

describe("BottomTabs", () => {
  it("exposes the five stable training destinations", () => {
    render(createElement(BottomTabs));

    expect(
      screen.getAllByRole("link").map((link) => ({
        label: link.textContent,
        href: link.getAttribute("href"),
      })),
    ).toEqual([
      { label: "Today", href: "/today" },
      { label: "Plan", href: "/plan" },
      { label: "Coach", href: "/coach" },
      { label: "Progress", href: "/progress" },
      { label: "More", href: "/more" },
    ]);
    expect(screen.getByRole("link", { name: "Progress" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("link", { name: "Inbox" })).not.toBeInTheDocument();
  });
});
