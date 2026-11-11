import type { ReactNode } from "react";

type ChoiceCardProps = {
  title: string;
  description?: string;
  selected?: boolean;
  onSelect: () => void;
  children?: ReactNode;
};

export function ChoiceCard({
  title,
  description,
  selected = false,
  onSelect,
  children,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-11 w-full rounded-[var(--radius-control)] border px-4 py-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus)] ${
        selected
          ? "border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-on-accent)]"
          : "border-[var(--app-line)] bg-[var(--app-raised)] text-[var(--app-text)] hover:bg-[var(--app-raised-strong)]"
      }`}
    >
      <span
        className={`block text-base font-semibold ${
          selected ? "text-[var(--app-on-accent)]" : "text-[var(--app-text)]"
        }`}
      >
        {title}
      </span>
      {description ? (
        <span
          className={`mt-0.5 block text-sm leading-snug ${
            selected ? "text-[var(--app-on-accent)] opacity-75" : "text-[var(--app-muted)]"
          }`}
        >
          {description}
        </span>
      ) : null}
      {children}
    </button>
  );
}
