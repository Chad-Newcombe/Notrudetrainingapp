"use client";

import { createElement, useEffect, useState } from "react";
import type { CoachPreset } from "@/lib/coaches/presets";

export function CoachModelPreview({ coach }: { coach: CoachPreset }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    void import("@google/model-viewer").then(
      () => {
        if (active) setStatus("ready");
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
      <p role="status" className="text-sm text-[var(--muted)]">
        The 3D preview couldn’t load. You can still select {coach.name}.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--canvas-light)]">
      {status === "loading" ? (
        <p role="status" className="grid h-64 place-items-center text-sm text-[var(--muted)]">
          Loading 3D preview…
        </p>
      ) : createElement("model-viewer", {
        src: `/coaches/${coach.id}.glb`,
        alt: `Interactive full-body 3D model of ${coach.name}. Drag to rotate.`,
        onerror: () => setStatus("error"),
        "camera-controls": "",
        "camera-orbit": "18deg 82deg auto",
        "interaction-prompt": "none",
        "touch-action": "pan-y",
        "shadow-intensity": "0.5",
        style: { display: "block", width: "100%", height: "16rem", background: coach.secondary },
      })}
    </div>
  );
}
