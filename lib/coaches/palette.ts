import type { CoachId } from "@/lib/types";

/** One colour family per coach: when a coach leads, every bento surface uses only these tones. */
export type CoachPalette = { light: string; mid: string; deep: string; glow: string };

export const COACH_PALETTES: Record<CoachId, CoachPalette> = {
  river: { light: "#8FF0D6", mid: "#2F9C84", deep: "#0F4A3E", glow: "#3FC1A6" },
  jax: { light: "#FFD77E", mid: "#E8A62D", deep: "#6B4108", glow: "#F3B94C" },
  sol: { light: "#FFB896", mid: "#E0653C", deep: "#64210C", glow: "#F08058" },
  nova: { light: "#C4C1FF", mid: "#6E69E0", deep: "#231F6E", glow: "#A09BF1" },
  knox: { light: "#FFA3A7", mid: "#D9363E", deep: "#5A0B11", glow: "#F0545C" },
  riff: { light: "#FFADD9", mid: "#E0409F", deep: "#650B41", glow: "#F06BB8" },
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Blend two hex colours; w = 0 gives a, w = 1 gives b. */
export function mix(a: string, b: string, w: number): string {
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * w).toString(16).padStart(2, "0")).join("")}`;
}

/** Dark text that reads on the light tones of this family. */
export const inkFor = (palette: CoachPalette) => mix(palette.deep, "#000000", 0.55);
