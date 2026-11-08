type NotrudeMarkProps = {
  size?: "hero" | "nav";
  className?: string;
};

export function NotrudeMark({ size = "hero", className = "" }: NotrudeMarkProps) {
  const sizeClass =
    size === "hero"
      ? "text-[clamp(3.5rem,12vw,5.5rem)] font-semibold tracking-[-0.045em] leading-[0.95]"
      : "text-lg font-semibold tracking-[-0.03em]";

  return (
    <p
      className={`font-display text-[var(--ink)] ${sizeClass} ${className}`.trim()}
      aria-label="Notrude"
    >
      Notrude
    </p>
  );
}
