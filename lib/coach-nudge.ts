import type { EngagementTone } from "@/lib/types";

export function coachNudgeForTone(tone: EngagementTone): string {
  switch (tone) {
    case "gentle":
      return "Take it at your pace today — any forward step counts.";
    case "direct":
      return "Here’s your move for today. Start when you’re ready.";
    case "steady":
    default:
      return "One session at a time. You’ve got a clear lane today.";
  }
}
