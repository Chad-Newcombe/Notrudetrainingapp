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
          className="rounded-[var(--radius-pill)] border border-[var(--line)] bg-[var(--canvas-light)] px-3 py-1.5 font-display text-sm font-medium tracking-tight text-[var(--ink)] transition-colors hover:border-[var(--ink-strong)] disabled:opacity-50"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
