// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tiltFromOrientation } from "@/lib/hooks/useTilt";

const router = { back: vi.fn(), replace: vi.fn() };
let pathname = "/workout/wed";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => router }));
const { EdgeSwipeBack, backFallback, canSwipeBack } = await import("@/components/shell/EdgeSwipeBack");

const swipe = (points: [number, number][]) => {
  const [first, ...rest] = points;
  fireEvent.touchStart(document, { touches: [{ clientX: first[0], clientY: first[1] }] });
  for (const [x, y] of rest) fireEvent.touchMove(document, { touches: [{ clientX: x, clientY: y }] });
  fireEvent.touchEnd(document, { touches: [] });
};

describe("EdgeSwipeBack", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia; // installed app
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); router.back.mockReset(); router.replace.mockReset(); pathname = "/workout/wed"; });

  it("goes back after a swipe from the left edge, to the screen's tab when nothing came before", () => {
    const { container } = render(createElement(EdgeSwipeBack, null, "page"));
    swipe([[6, 300], [60, 302], [500, 305]]);
    expect((container.firstChild as HTMLElement).style.transform).toContain("translate3d");
    vi.advanceTimersByTime(250);
    expect(router.replace).toHaveBeenCalledWith("/today");
  });

  it("ignores swipes that start away from the edge, vertical scrolls, short drags and the Today hub", () => {
    render(createElement(EdgeSwipeBack, null, "page"));
    swipe([[120, 300], [600, 300]]);
    swipe([[6, 300], [9, 380], [400, 390]]);
    swipe([[6, 300], [30, 300]]);
    vi.advanceTimersByTime(500);
    cleanup();
    pathname = "/today";
    render(createElement(EdgeSwipeBack, null, "page"));
    swipe([[6, 300], [60, 300], [600, 300]]);
    vi.advanceTimersByTime(500);
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("knows which screens have a back and where it falls back to", () => {
    expect(canSwipeBack("/today")).toBe(false);
    expect(canSwipeBack("/more")).toBe(true);
    expect(backFallback("/more")).toBe("/today");
    expect(canSwipeBack("/coach/chat/abc")).toBe(true);
    expect(backFallback("/coach/chat/abc")).toBe("/coach");
    expect(backFallback("/workout/wed")).toBe("/today");
  });
});

describe("tiltFromOrientation", () => {
  it("is flat at a natural reading angle and clamps at full tilt", () => {
    expect(tiltFromOrientation(40, 0)).toEqual({ x: 0, y: 0 });
    expect(tiltFromOrientation(90, -60)).toEqual({ x: -1, y: 1 });
    expect(tiltFromOrientation(null, null)).toEqual({ x: 0, y: 0 });
  });
});
