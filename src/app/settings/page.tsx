import Link from "next/link";

import { SettingsForm } from "@/components/settings/settings-form";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">設定</p>
        <h1 className="text-2xl font-semibold tracking-tight">マスタ／認証</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          localStorage の JSON が正本。端末またぎはしない。理念全文はリポに置かない。
        </p>
      </header>

      <SettingsForm />

      <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
        ホームへ
      </Button>
    </div>
  );
}
