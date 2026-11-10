"use client";

import { useReducedMotion } from "motion/react";
import { createElement, useEffect, useState } from "react";
import { CoachAvatar } from "@/components/coach/CoachAvatar";
import type { CoachPreset } from "@/lib/coaches/presets";

export function CoachModelPreview({
  coach, presentation = "picker", replying = false,
}: {
  coach: CoachPreset;
  presentation?: "picker" | "companion";
  replying?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "viewer" | "ready" | "error">("loading");
  const reducedMotion = useReducedMotion();
  const companion = presentation === "companion";

  useEffect(() => {
    let active = true;
    void import("@google/model-viewer").then(
      () => {
        if (active) setStatus("viewer");
      },
      () => {
        if (active) setStatus("error");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  if (status === "error") {
    return (
      <div className={companion ? "coach-model-space grid place-content-center justify-items-center gap-2" : ""}>
        {companion && <CoachAvatar coachId={coach.id} size="lg" />}
        <p role="status" className="text-sm text-[var(--muted)]">
          {companion ? "3D is unavailable on this device." : `The 3D preview couldn’t load. You can still select ${coach.name}.`}
        </p>
      </div>
    );
  }

  return (
    <div className={companion ? "coach-model-space relative" : "relative h-64 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--canvas-light)]"}>
      {status !== "ready" && (
        <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-[var(--muted)]">
          Loading {coach.name} in 3D…
        </p>
      )}
      {status !== "loading" && createElement("model-viewer", {
        src: `/coaches/${coach.id}.glb`,
        alt: `Interactive full-body 3D model of ${coach.name}. Drag to rotate.`,
        onerror: () => setStatus("error"),
        onload: () => setStatus("ready"),
        "camera-controls": "",
        "camera-orbit": companion ? "9deg 82deg auto" : "18deg 82deg auto",
        "field-of-view": companion ? "25deg" : undefined,
        "disable-pan": "",
        "disable-zoom": companion ? "" : undefined,
        "interaction-prompt": "none",
        "touch-action": "pan-y",
        "shadow-intensity": companion ? "0.8" : "0.5",
        "shadow-softness": "0.85",
        "animation-name": replying && !reducedMotion ? "Reply" : "Idle",
        "animation-crossfade-duration": "300",
        autoplay: companion && !reducedMotion ? true : undefined,
        style: { display: "block", width: "100%", height: "100%", background: companion ? "transparent" : coach.secondary },
      })}
      {companion && status === "ready" && (
        <span className="coach-companion-hint" aria-hidden="true">Drag to rotate</span>
      )}
    </div>
  );
}
