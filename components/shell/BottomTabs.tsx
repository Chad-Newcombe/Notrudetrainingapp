"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, Ellipsis, Inbox, MessagesSquare } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const tabs = [
  { href: "/today", label: "Today", Icon: Compass },
  { href: "/plan", label: "Plan", Icon: CalendarDays },
  { href: "/coach", label: "Coach", Icon: MessagesSquare },
  { href: "/inbox", label: "Inbox", Icon: Inbox },
  { href: "/progress", label: "More", Icon: Ellipsis },
] as const;

export function BottomTabs() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  return (
    <nav className="floating-tabs" aria-label="Main">
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className="floating-tab font-display">
            {active && <motion.span
              className="floating-tab-active"
              layoutId={reduceMotion ? undefined : "active-tab"}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 35 }}
              aria-hidden="true"
            />}
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
