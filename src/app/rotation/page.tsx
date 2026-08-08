import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function RotationPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">ローテ</p>
        <h1 className="text-2xl font-semibold tracking-tight">アサイン（準備中）</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          公平ルール付きスキル（クールダウン約7営業日・テーマ多様性）で1サイクルを出し、ノート用にコピーする。
        </p>
      </header>

      <Button variant="outline" render={<Link href="/" />}>
        ホームへ
      </Button>
    </div>
  );
}
