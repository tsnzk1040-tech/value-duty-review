import Link from "next/link";

import { AppIcon } from "@/components/brand/app-icon";

function IconPair({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex items-end gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${src}?v=2`}
        alt={alt}
        className="size-28 rounded-[22%] bg-neutral-900 object-cover shadow"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${src}?v=2`}
        alt=""
        className="size-14 rounded-[22%] bg-neutral-900 object-cover shadow"
      />
    </div>
  );
}

export default function IconPreviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">企業理念リレー</p>
        <h1 className="text-xl font-semibold tracking-tight">アイコン比較</h1>
        <p className="text-sm text-muted-foreground">
          背景のコーポレート青はそのまま。円を濃くした現行と、螺旋階段の3案。
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">現行・円を濃くした矢印</h2>
        <div className="flex items-end gap-4">
          <AppIcon className="size-28 rounded-[22%] shadow" markClassName="size-16" />
          <AppIcon className="size-14 rounded-[22%] shadow" markClassName="size-8" />
        </div>
        <IconPair src="/icon-options/static-now.png" alt="静的PNG・円を濃くした矢印" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">1. 斜めの螺旋階段</h2>
        <IconPair src="/icon-options/icon-spiral-1.jpg" alt="螺旋階段 斜め" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">2. 上から見た螺旋</h2>
        <IconPair src="/icon-options/icon-spiral-2.jpg" alt="螺旋階段 上から" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">3. 簡易の重ね螺旋</h2>
        <IconPair src="/icon-options/icon-spiral-3.jpg" alt="簡易螺旋" />
      </section>

      <Link href="/review" className="text-sm text-primary underline-offset-4 hover:underline">
        レビューへ戻る
      </Link>
    </main>
  );
}
