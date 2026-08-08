import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">アクセス解除</p>
        <h1 className="text-2xl font-semibold tracking-tight">ログイン</h1>
      </header>

      <Suspense fallback={<p className="text-sm text-muted-foreground">読み込み中…</p>}>
        <LoginForm />
      </Suspense>

      <Button variant="outline" render={<Link href="/settings" />} nativeButton={false}>
        設定へ（認証オフ時）
      </Button>
    </div>
  );
}
