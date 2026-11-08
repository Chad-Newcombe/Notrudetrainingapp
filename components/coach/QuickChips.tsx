type Props = {
  onPick: (text: string) => void;
  disabled?: boolean;
};

const CHIPS = [
  "Too hard today",
  "Make it shorter",
  "Remind me why I'm doing this",
] as const;

export function QuickChips({ onPick, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map((label) => (
        <button
          key={label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(label)}
          className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--ink)] ring-1 ring-white/10 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
