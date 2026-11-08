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
      className={`w-full rounded-2xl px-4 py-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
        selected
          ? "bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]"
          : "bg-[var(--surface)] ring-1 ring-[var(--muted)]/25 hover:bg-white/8"
      }`}
    >
      <span className="block text-base font-medium text-[var(--ink)]">{title}</span>
      {description ? (
        <span className="mt-0.5 block text-sm leading-snug text-[var(--muted)]">
          {description}
        </span>
      ) : null}
      {children}
    </button>
  );
}
