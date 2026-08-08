import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">value-duty-review</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          自分用レビュー／ローテ
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          通勤向け。毎日のレビューは段階UI、ローテは公平ルール付きスキルで回す。
        </p>
      </header>

      <nav className="flex flex-col gap-3" aria-label="主な入口">
        <Button
          size="lg"
          className="h-12 w-full justify-center text-base"
          render={<Link href="/review" />}
        >
          今日のレビュー
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-full justify-center text-base"
          render={<Link href="/rotation" />}
        >
          ローテ
        </Button>
      </nav>

      <p className="text-xs leading-relaxed text-muted-foreground">
        POC 前の骨格。設計正本は personal-visual-explainers の DECISIONS.md。
      </p>
    </div>
  );
}
