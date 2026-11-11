"use client";

import { useReducedMotion } from "motion/react";
import { createElement, useEffect, useState } from "react";
import { CoachAvatar } from "@/components/coach/CoachAvatar";
import type { CoachPreset } from "@/lib/coaches/presets";

async function loadViewer() {
  if (customElements.get("model-viewer")) return;

  const gl = document.createElement("canvas").getContext("webgl2", {
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  if (!gl) throw new Error("WebGL 2 is unavailable");
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  await import("@google/model-viewer");
}

export function CoachModelPreview({
  coach,
  presentation = "picker",
  replying = false,
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
    void loadViewer().then(
      () => active && setStatus("viewer"),
      () => active && setStatus("error"),
    );
    return () => { active = false; };
  }, []);

  if (status === "error") {
    return (
      <div className="coach-model-space grid place-content-center justify-items-center gap-2 px-3 text-center">
        <CoachAvatar coachId={coach.id} size={companion ? "xl" : "lg"} />
        <p role="status" className="text-xs text-[var(--app-muted)]">
          {companion
            ? "3D is unavailable in this browser."
            : `The 3D preview couldn’t load. You can still select ${coach.name}.`}
        </p>
      </div>
    );
  }

  return (
    <div className={companion ? "coach-model-space relative" : "relative h-64 overflow-hidden rounded-[var(--radius-panel)] bg-[var(--app-raised-strong)]"}>
      {status !== "ready" ? (
        <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-[var(--app-muted)]">
          Loading {coach.name} in 3D…
        </p>
      ) : null}
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
        style: { display: "block", width: "100%", height: "100%", background: "transparent" },
      })}
      {companion && status === "ready" ? (
        <span className="coach-companion-hint" aria-hidden="true">Drag to rotate</span>
      ) : null}
    </div>
  );
}
