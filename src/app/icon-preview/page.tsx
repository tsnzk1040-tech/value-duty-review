import Link from "next/link";

import { AppIcon } from "@/components/brand/app-icon";

/**
 * 一時比較用。スマホに出てる旧焼き vs 画面内 vs 静的 PNG。
 * 確定後にまた消してよい。
 */
export default function IconPreviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">一時プレビュー</p>
        <h1 className="text-xl font-semibold tracking-tight">アイコン比較</h1>
        <p className="text-sm text-muted-foreground">
          正解は「画面内 AppIcon」。スマホの旧焼き（S／目）は本番の古い /icon。静的
          PNG を正解に揃えて載せる。
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">スマホに出ている（報告）</h2>
        <div className="flex items-end gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-options/phone-now.png"
            alt="スマホのホーム画面アイコン"
            className="size-28 rounded-[22%] bg-neutral-900 object-cover shadow"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-options/phone-now.png"
            alt=""
            className="size-14 rounded-[22%] bg-neutral-900 object-cover shadow"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          ImageResponse で歪んだ旧マーク（S／目っぽく見える）。本番キャッシュの可能性大。
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">画面内 AppIcon（ヘッダと同じ）</h2>
        <div className="flex items-end gap-4">
          <AppIcon className="size-28 rounded-[22%] shadow" markClassName="size-16" />
          <AppIcon className="size-14 rounded-[22%] shadow" markClassName="size-8" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">静的 PNG（これから載せたい・向かい合う矢印）</h2>
        <div className="flex items-end gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-options/static-now.png"
            alt="静的 icon.png"
            className="size-28 rounded-[22%] bg-neutral-900 object-cover shadow"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-options/static-now.png"
            alt=""
            className="size-14 rounded-[22%] bg-neutral-900 object-cover shadow"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          向かい合う2矢印。favicon.ico も古いとスマホが拾うことがある。
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">本番 /icon（いま配信中）</h2>
        <div className="flex items-end gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://value-duty-review.vercel.app/icon?v=cachebust"
            alt="本番 icon"
            className="size-28 rounded-[22%] bg-neutral-900 object-cover shadow"
          />
        </div>
      </section>

      <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
        ホームへ戻る
      </Link>
    </main>
  );
}
