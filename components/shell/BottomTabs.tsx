"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/today", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/coach", label: "Coach" },
  { href: "/inbox", label: "Inbox" },
  { href: "/progress", label: "More" },
] as const;

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--hairline)] bg-[var(--canvas-light)]/95 backdrop-blur-md"
      style={{
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
      }}
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-[430px]">
        {tabs.map(({ href, label }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-1 flex-col items-center gap-1 px-2 pt-3 pb-2.5 font-display text-xs font-semibold tracking-tight transition-colors ${
                active
                  ? "text-[var(--ink-strong)]"
                  : "text-[var(--ink-muted-light)] hover:text-[var(--ink-strong)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`absolute top-0 h-0.5 w-8 rounded-full transition-colors ${
                  active ? "bg-[var(--ink-strong)]" : "bg-transparent"
                }`}
                aria-hidden
              />
              {label}
              {active ? (
                <span
                  className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[var(--voltage)]"
                  aria-hidden
                />
              ) : (
                <span className="absolute bottom-1.5 h-1 w-1" aria-hidden />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
