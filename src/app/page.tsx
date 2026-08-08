import Link from "next/link";

import { AppIcon } from "@/components/brand/app-icon";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <AppIcon className="size-14 rounded-2xl" markClassName="size-8" />
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">value-duty-review</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              自分用レビュー／ローテ
            </h1>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          通勤向け。マスタは端末内 JSON。ローテは公平スキル、レビューは段階UI。
        </p>
      </header>

      <nav className="flex flex-col gap-3" aria-label="主な入口">
        <Button
          size="lg"
          className="h-12 w-full justify-center text-base"
          nativeButton={false}
          render={<Link href="/review" />}
        >
          今日のレビュー
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-full justify-center text-base"
          nativeButton={false}
          render={<Link href="/rotation" />}
        >
          ローテ
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="h-12 w-full justify-center text-base"
          nativeButton={false}
          render={<Link href="/settings" />}
        >
          設定
        </Button>
      </nav>
    </div>
  );
}
