import { ReviewWorkbench } from "@/components/review/review-workbench";

export default function ReviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">毎日レビュー POC</p>
        <h1 className="text-2xl font-semibold tracking-tight">段階UI</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          お礼 → 要約 → 調べる（貼り返し） → 所感脚色 → 通読。構成は
          drafting-daily-reviews に同期。
        </p>
      </header>

      <ReviewWorkbench />
    </div>
  );
}
