"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, Compass, Ellipsis, MessagesSquare } from "lucide-react";

const tabs = [
  { href: "/today", label: "Today", Icon: Compass },
  { href: "/plan", label: "Plan", Icon: CalendarDays },
  { href: "/coach", label: "Coach", Icon: MessagesSquare },
  { href: "/progress", label: "Progress", Icon: BarChart3 },
  { href: "/more", label: "More", Icon: Ellipsis },
] as const;

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav className="floating-tabs" aria-label="Main">
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className="floating-tab">
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
