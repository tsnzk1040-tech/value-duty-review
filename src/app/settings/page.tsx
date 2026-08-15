import { SettingsForm } from "@/components/settings/settings-form";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">企業理念リレー</p>
        <h1 className="text-2xl font-semibold tracking-tight">各種設定</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          localStorage の JSON が正本。理念チャートは社外NGなので公開URLに置かず、この端末へ取り込む。
        </p>
      </header>

      <SettingsForm />
    </div>
  );
}
