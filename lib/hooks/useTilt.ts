"use client";

import { useEffect, type RefObject } from "react";

type OrientationWithPermission = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/** Phone tilt in degrees to -1..1: about 25° either way is full tilt, held around a natural 40° reading angle. */
export function tiltFromOrientation(beta: number | null, gamma: number | null) {
  return { x: clamp((gamma ?? 0) / 25), y: clamp(((beta ?? 40) - 40) / 25) };
}

/**
 * Writes --tx and --ty (-1..1) on the element from the phone's motion sensors, or from the pointer
 * on a desktop, eased each frame so the card shimmer and depth move smoothly. Off with reduced motion.
 */
export function useTilt(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const target = { x: 0, y: 0 };
    const now = { x: 0, y: 0 };
    let frame = 0;

    const step = () => {
      now.x += (target.x - now.x) * 0.18;
      now.y += (target.y - now.y) * 0.18;
      el.style.setProperty("--tx", now.x.toFixed(3));
      el.style.setProperty("--ty", now.y.toFixed(3));
      frame = Math.abs(target.x - now.x) + Math.abs(target.y - now.y) > 0.002 ? requestAnimationFrame(step) : 0;
    };
    const aim = (x: number, y: number) => {
      target.x = x;
      target.y = y;
      if (!frame) frame = requestAnimationFrame(step);
    };

    const onOrientation = (event: DeviceOrientationEvent) => {
      const { x, y } = tiltFromOrientation(event.beta, event.gamma);
      aim(x, y);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      aim(clamp((event.clientX / window.innerWidth) * 2 - 1), clamp((event.clientY / window.innerHeight) * 2 - 1));
    };
    // iOS only shares motion after the user allows it, and only asks from a tap.
    const Orientation = window.DeviceOrientationEvent as OrientationWithPermission | undefined;
    const ask = () => { void Orientation?.requestPermission?.().catch(() => undefined); };

    window.addEventListener("deviceorientation", onOrientation);
    window.addEventListener("pointermove", onPointer);
    if (Orientation?.requestPermission) el.addEventListener("pointerdown", ask, { once: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("pointermove", onPointer);
      el.removeEventListener("pointerdown", ask);
    };
  }, [ref]);
}
