"use client";

import { useEffect, useState } from "react";
import { coachNote, type InsightInput } from "@/lib/coach/notes";

/** The leading coach's note for today or this week; null while it is written or if the coach is offline. */
export function useCoachNote(kind: "daily" | "weekly", input: InsightInput | null): string | null {
  const [text, setText] = useState<string | null>(null);
  const key = input ? `${kind}|${input.profile.coachId}|${input.plan?.id}|${input.logs.length}` : null;
  useEffect(() => {
    if (!input) return;
    let live = true;
    void coachNote(kind, input).then((note) => live && setText(note.text), () => live && setText(null));
    return () => { live = false; };
    // The key captures every input that should trigger a new note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return text;
}
