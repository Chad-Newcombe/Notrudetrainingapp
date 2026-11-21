import { INTAKE_ANSWER_LIMIT } from "@/lib/intake";

const parts = (text: string) => text.split(/;\s*/).map((part) => part.trim()).filter(Boolean);

/** Adds or removes a phrase in a free-text answer, so a tap can answer most of a question. */
export function togglePick(text: string, option: string) {
  const list = parts(text);
  const next = list.includes(option) ? list.filter((part) => part !== option) : [...list, option];
  const joined = next.join("; ");
  return joined.length > INTAKE_ANSWER_LIMIT ? text : joined;
}

/** Tap-to-answer options above a text box; the box stays for anything the options miss. */
export function QuickPicks({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const picked = parts(value);
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = picked.includes(option);
        return (
          <button key={option} type="button" aria-pressed={on} onClick={() => onChange(togglePick(value, option))}
            className={`min-h-10 rounded-full border px-4 text-sm font-medium transition-colors ${on
              ? "border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent),transparent_82%)] text-[var(--app-text)]"
              : "border-[var(--app-line)] bg-[var(--app-raised)] text-[var(--app-muted)]"}`}>
            {option}
          </button>
        );
      })}
    </div>
  );
}

export const PICKS = {
  goal: ["Build muscle", "Lose fat", "Get stronger", "Run farther", "Move more", "Train for an event", "More energy"],
  routine: ["Shift work", "Busy weekdays", "Weekends are open", "Mornings work best", "Evenings work best", "I train at home", "I have a gym", "I travel often"],
  support: ["Give me a shorter version", "Push me to show up", "Let me move sessions", "Check in when I miss", "Keep it simple"],
  progress: ["Stronger lifts", "Less body fat", "More energy", "Showing up every week", "Better sleep", "Clothes fit better"],
  constraints: ["Knee issues", "Back issues", "Shoulder issues", "Limited time", "No equipment"],
  target: ["Clothes fit easier", "Leaner", "Stronger", "More energy"],
};
