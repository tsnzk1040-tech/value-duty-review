"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  History,
  MessageSquareText,
  Settings,
  type LucideIcon,
} from "lucide-react";

const APP_TABS: {
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { href: "/review", label: "レビュー", icon: MessageSquareText },
  { href: "/history", label: "履歴", icon: History },
  { href: "/rotation", label: "ローテ", icon: CalendarRange },
  { href: "/settings", label: "設定", icon: Settings },
];

/** 画面下部の1ペイン（アプリ主要入口） */
export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主な入口"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-primary bg-primary pb-[env(safe-area-inset-bottom)] text-primary-foreground shadow-[0_-4px_24px_rgba(0,0,0,0.12)]"
    >
      <div className="mx-auto w-full max-w-xl px-4 py-2.5">
        <ul className="grid w-full grid-cols-4 gap-1.5 sm:gap-2">
          {APP_TABS.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="min-w-0">
                <Link
                  href={tab.href}
                  className={
                    active
                      ? "flex h-14 w-full flex-col items-center justify-center gap-1 rounded-lg bg-primary-foreground px-1 text-primary"
                      : "flex h-14 w-full flex-col items-center justify-center gap-1 rounded-lg border border-primary-foreground/40 px-1 text-primary-foreground/90"
                  }
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  <span className="max-w-full truncate text-sm font-medium leading-tight sm:text-base">
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
