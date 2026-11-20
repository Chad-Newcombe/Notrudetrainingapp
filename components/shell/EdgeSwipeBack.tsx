"use client";

import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

const TAB_ROOTS = ["/today", "/plan", "/coach", "/progress", "/more"];
const EDGE = 24; // px from the left edge where the swipe can start, like iOS
const SETTLE = "transform 260ms cubic-bezier(.32,.72,0,1)";

/** Tab roots and the start page have nothing to go back to, as in a native tab bar app. */
export function canSwipeBack(pathname: string) {
  return pathname !== "/" && !TAB_ROOTS.includes(pathname);
}

/** Where back goes when there is no earlier page in this visit: the screen's own tab, else Today. */
export function backFallback(pathname: string) {
  return TAB_ROOTS.find((root) => pathname.startsWith(`${root}/`)) ?? "/today";
}

/** A swipe counts once it passes a third of the screen, or is a quick flick that has started moving. */
export function shouldGoBack(dx: number, width: number, velocity: number) {
  return dx > width / 3 || (dx > 40 && velocity > 0.5);
}

// The iOS app and the home-screen install have no browser chrome, so they need their own back
// swipe; in a Safari tab the browser's own edge swipe already does this, and two would fight.
const installed = () => Capacitor.isNativePlatform() || window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iOS-style back: drag from the left edge and the page follows the finger, then goes back. */
export function EdgeSwipeBack({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const page = useRef<HTMLDivElement>(null);
  const visited = useRef(0);
  const path = useRef(pathname);
  path.current = pathname;

  // A new screen starts flat; a transform left on would break fixed elements like the tab bar.
  useEffect(() => {
    visited.current += 1;
    const el = page.current;
    if (el) { el.style.transform = ""; el.style.transition = ""; delete el.dataset.dragging; }
  }, [pathname]);

  // The keyboard shrinks the app (capacitor.config.ts) instead of sliding the page up. Fixed elements
  // re-anchor instantly then; .keyboard-open stops their transitions from animating that jump.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const root = document.documentElement;
    const handles = [
      Keyboard.addListener("keyboardWillShow", () => root.classList.add("keyboard-open")),
      Keyboard.addListener("keyboardDidHide", () => root.classList.remove("keyboard-open")),
    ];
    return () => { for (const handle of handles) void handle.then((h) => h.remove()); };
  }, []);

  useEffect(() => {
    if (!installed()) return;
    let start: { x: number; y: number; t: number } | null = null;
    let dx = 0;
    let locked = false;

    const set = (x: number, transition = "") => {
      const el = page.current;
      if (!el) return;
      el.style.transition = transition;
      el.style.transform = x ? `translate3d(${x}px,0,0)` : "";
      if (x) el.dataset.dragging = ""; else delete el.dataset.dragging;
    };
    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      start = event.touches.length === 1 && touch.clientX <= EDGE && canSwipeBack(path.current) ? { x: touch.clientX, y: touch.clientY, t: event.timeStamp } : null;
      dx = 0;
      locked = false;
    };
    const onMove = (event: TouchEvent) => {
      if (!start) return;
      const touch = event.touches[0];
      const x = touch.clientX - start.x;
      const y = touch.clientY - start.y;
      if (!locked) {
        if (Math.abs(y) > 10 && Math.abs(y) > Math.abs(x)) { start = null; return; } // a scroll, not a swipe
        if (x < 8) return;
        locked = true;
      }
      event.preventDefault();
      dx = Math.max(0, x);
      set(dx);
    };
    const onEnd = (event: TouchEvent) => {
      if (!start || !locked) { start = null; return; }
      const width = window.innerWidth;
      const velocity = dx / Math.max(1, event.timeStamp - start.t);
      start = null;
      if (!shouldGoBack(dx, width, velocity)) return set(0, SETTLE);
      set(width, SETTLE);
      // shortcut: counts screens seen this visit rather than reading history, so a deep link opened
      // straight from outside goes to its tab instead; upgrade if back-from-deep-link needs history.
      window.setTimeout(() => (visited.current > 1 ? router.back() : router.replace(backFallback(path.current))), 200);
      window.setTimeout(() => set(0), 1500); // never leave the page off-screen if back landed on the same path
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  return <div ref={page} className="edge-back min-h-[100dvh]">{children}</div>;
}
