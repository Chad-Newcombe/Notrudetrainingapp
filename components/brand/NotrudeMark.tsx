type NotrudeMarkProps = {
  size?: "hero" | "nav";
  className?: string;
};

export function NotrudeMark({ size = "hero", className = "" }: NotrudeMarkProps) {
  const sizeClass =
    size === "hero"
      ? "text-[clamp(2.6rem,11vw,4.4rem)] font-bold tracking-[-0.05em] leading-[0.92]"
      : "text-xl font-bold tracking-[-0.035em] leading-none";

  return (
    <p
      className={`text-[var(--app-text)] ${sizeClass} ${className}`.trim()}
      aria-label="Not Rude Training"
    >
      <span className="block">Not Rude</span>
      <span className="block text-[var(--app-accent)]">Training</span>
    </p>
  );
}
