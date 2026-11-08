"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/today", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/coach", label: "Coach" },
  { href: "/progress", label: "Progress" },
] as const;

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[var(--bg0)]/95 backdrop-blur-md"
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
              className={`flex flex-1 flex-col items-center gap-0.5 px-2 py-3 text-xs font-medium transition-colors ${
                active
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`h-0.5 w-8 rounded-full transition-colors ${
                  active ? "bg-[var(--accent)]" : "bg-transparent"
                }`}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
