"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import { IoChatbubbles, IoPerson, IoSchool } from "react-icons/io5";

const TABS: { href: string; label: string; icon: IconType }[] = [
  { href: "/lessons", label: "Lessons", icon: IoSchool },
  { href: "/conversations", label: "Conversations", icon: IoChatbubbles },
  { href: "/profile", label: "Profile", icon: IoPerson },
];

const ACTIVE_COLOR = "#0a7ea4";
const INACTIVE_COLOR = "#687076";

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="flex shrink-0 border-t border-border bg-white pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const color = active ? ACTIVE_COLOR : INACTIVE_COLOR;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5"
            style={{ color }}
          >
            <Icon size={28} aria-hidden />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
