"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useSettings } from "@/components/settings/settings-provider";
import { isAuthSessionActive } from "@/lib/settings/session";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { settings, ready } = useSettings();
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (pathname === "/login" || pathname === "/icon-preview") {
      setAllowed(true);
      return;
    }
    if (!settings.auth.enabled) {
      setAllowed(true);
      return;
    }
    if (isAuthSessionActive()) {
      setAllowed(true);
      return;
    }
    setAllowed(false);
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, settings.auth.enabled, pathname, router]);

  if (!ready) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-8 text-sm text-muted-foreground">
        読み込み中…
      </div>
    );
  }

  if (!allowed && pathname !== "/login" && pathname !== "/icon-preview") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-8 text-sm text-muted-foreground">
        認証へ移動中…
      </div>
    );
  }

  return children;
}
