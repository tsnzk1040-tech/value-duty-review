import { HistoryList } from "@/components/review/history-list";

export default function HistoryPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">企業理念リレー</p>
        <h1 className="text-2xl font-semibold tracking-tight">履歴確認</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          テーマ・担当で絞り込み。タップで本人コメントとレビュー全文を対比。この端末の履歴を読むだけ。6-④保存で前の1周と入れ替える。
        </p>
      </header>

      <HistoryList />
    </div>
  );
}
