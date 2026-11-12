import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type SharedProps = {
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
};

type ButtonAsButton = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type ButtonAsLink = SharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    prefetch?: boolean;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const base =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border px-6 py-3 text-base font-semibold transition-[transform,background-color,border-color] duration-100 active:scale-[0.985] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus)] disabled:pointer-events-none disabled:opacity-45";

const variants = {
  primary:
    "border-transparent bg-[var(--app-accent)] text-[var(--app-on-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent),var(--app-text)_9%)]",
  ghost:
    "border-[var(--app-line)] bg-[var(--app-raised)] text-[var(--app-text)] hover:bg-[var(--app-raised-strong)]",
};

export function Button(props: ButtonProps) {
  const { children, variant = "primary", className = "", ...rest } = props;
  const classes = `${base} ${variants[variant]} ${className}`.trim();

  if ("href" in props && props.href) {
    const { href, ...linkRest } = rest as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...linkRest}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as ButtonAsButton;
  return (
    <button type="button" className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
