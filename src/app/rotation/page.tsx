import { RotationWorkbench } from "@/components/rotation/rotation-workbench";

export default function RotationPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">企業理念リレー</p>
        <h1 className="text-2xl font-semibold tracking-tight">ローテシャッフル</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          土日祝を避けて1サイクルを出し、手直ししてノート用にコピーする。
        </p>
      </header>

      <RotationWorkbench />
    </div>
  );
}
