"use client";

import { type FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { useSettings } from "@/components/settings/settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyPassword } from "@/lib/settings/password";
import { setAuthSessionActive } from "@/lib/settings/session";

export function LoginForm() {
  const { settings, ready } = useSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (!settings.auth.enabled) {
        router.replace("/");
        return;
      }
      const ok = await verifyPassword(
        password,
        settings.auth.salt,
        settings.auth.passwordHash,
      );
      if (!ok) {
        setError("パスワードが違う");
        return;
      }
      setAuthSessionActive(true);
      router.replace(nextPath.startsWith("/") ? nextPath : "/");
    } finally {
      setPending(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-muted-foreground">読み込み中…</p>;
  }

  if (!settings.auth.enabled) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          認証はまだオフ。設定からパスワードを有効にできる。
        </p>
        <Button render={<Link href="/settings" />} nativeButton={false}>
          設定へ
        </Button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending} className="h-11">
        {pending ? "確認中…" : "解除する"}
      </Button>
      <p className="text-xs text-muted-foreground">
        ブラウザのタブを閉じるまで有効（sessionStorage）。端末またぎはしない。
      </p>
    </form>
  );
}
