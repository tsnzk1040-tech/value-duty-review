"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AppBottomNav } from "@/components/layout/app-bottom-nav";

const NO_APP_NAV = new Set([
  "/login",
  "/icon-preview",
  "/share-target",
]);

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showNav = !NO_APP_NAV.has(pathname);

  if (!showNav) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col pb-28">{children}</div>
      <AppBottomNav />
    </>
  );
}
