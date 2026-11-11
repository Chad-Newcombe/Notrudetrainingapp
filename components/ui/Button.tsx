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
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-control)] border-2 border-[var(--ink-strong)] px-6 py-3 text-base font-bold tracking-tight shadow-[4px_4px_0_var(--ink-strong)] transition-[transform,box-shadow,background-color] duration-100 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--ink-strong)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--voltage)] disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none";

const variants = {
  primary:
    "bg-[var(--voltage)] text-[var(--on-voltage)] hover:bg-[var(--voltage-hover)]",
  ghost:
    "bg-[var(--canvas-light)] text-[var(--ink-strong)] hover:bg-[var(--canvas-soft)]",
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
