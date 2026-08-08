import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ReviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">毎日レビュー</p>
        <h1 className="text-2xl font-semibold tracking-tight">段階UI（準備中）</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          下書き → 直す → 調べる → 所感 → 通読・コピー。実装は POC で埋める。
        </p>
      </header>

      <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-foreground">
        <li>下書き（定型＋要約案）</li>
        <li>直す（自分の言葉）</li>
        <li>調べる（アプリ内検索→参考リンク）</li>
        <li>所感（提案・問い＋リンク＋締め）</li>
        <li>通読→コピー</li>
      </ol>

      <Button variant="outline" render={<Link href="/" />}>
        ホームへ
      </Button>
    </div>
  );
}
