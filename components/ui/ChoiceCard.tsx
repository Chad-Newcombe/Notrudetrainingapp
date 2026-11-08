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
      className={`w-full rounded-[var(--radius-panel)] px-4 py-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--voltage)] ${
        selected
          ? "bg-[var(--ink-strong)] text-[var(--ink-on-dark)] border border-[var(--ink-strong)]"
          : "bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--ink-muted-light)]"
      }`}
    >
      <span
        className={`block font-display text-base font-semibold tracking-tight ${
          selected ? "text-[var(--ink-on-dark)]" : "text-[var(--ink)]"
        }`}
      >
        {title}
      </span>
      {description ? (
        <span
          className={`mt-0.5 block text-sm leading-snug ${
            selected ? "text-[var(--ink-muted-on-dark)]" : "text-[var(--muted)]"
          }`}
        >
          {description}
        </span>
      ) : null}
      {children}
    </button>
  );
}
