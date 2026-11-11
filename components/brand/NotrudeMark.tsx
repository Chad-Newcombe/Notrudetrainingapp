type NotrudeMarkProps = {
  size?: "hero" | "nav";
  className?: string;
};

export function NotrudeMark({ size = "hero", className = "" }: NotrudeMarkProps) {
  const sizeClass =
    size === "hero"
      ? "text-[clamp(4rem,15vw,6.3rem)] font-extrabold uppercase tracking-[-0.045em] leading-[0.78]"
      : "text-xl font-extrabold uppercase tracking-[-0.025em] leading-none";

  return (
    <p
      className={`font-display text-[var(--ink)] ${sizeClass} ${className}`.trim()}
      aria-label="Not Rude Training"
    >
      <span className="block">Not Rude</span>
      <span className="block text-[var(--voltage)]">Training</span>
    </p>
  );
}
