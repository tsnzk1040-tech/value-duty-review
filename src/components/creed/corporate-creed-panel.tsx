"use client";

import { useEffect, useState } from "react";

import {
  CORPORATE_CREED_VISION,
  CORPORATE_CREED_VALUE_BANDS,
  creedValueBandForTheme,
} from "@/lib/creed/corporate-creed";
import { CREED_CHART_CHANGED, loadCreedChartBlob } from "@/lib/creed/creed-chart-store";

type CorporateCreedPanelProps = {
  themeLabel?: string;
  compact?: boolean;
};

export function CorporateCreedPanel({
  themeLabel,
  compact = false,
}: CorporateCreedPanelProps) {
  const band = themeLabel ? creedValueBandForTheme(themeLabel) : null;
  const [chartUrl, setChartUrl] = useState<string | null>(null);
  const [chartTick, setChartTick] = useState(0);

  useEffect(() => {
    const onChange = () => setChartTick((n) => n + 1);
    window.addEventListener(CREED_CHART_CHANGED, onChange);
    return () => window.removeEventListener(CREED_CHART_CHANGED, onChange);
  }, []);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    void loadCreedChartBlob().then((blob) => {
      if (cancelled) return;
      if (!blob) {
        setChartUrl(null);
        return;
      }
      const url = URL.createObjectURL(blob);
      revoked = url;
      setChartUrl(url);
    });
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [chartTick]);

  const chart = chartUrl ? (
    <a
      href={chartUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-md border border-border bg-card"
      title="企業理念チャートを拡大表示"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={chartUrl}
        alt="企業理念チャート（Vision・Mission・Value・行動指針）"
        className="h-auto w-full"
      />
    </a>
  ) : (
    <p className="text-xs leading-snug text-muted-foreground">
      チャートは社外NGのため公開URLには置かない。設定でこの端末に取り込む。
    </p>
  );

  if (compact) {
    return (
      <details className="group rounded-md border border-border bg-card">
        <summary className="cursor-pointer list-none px-2.5 py-1.5 text-xs font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span>企業理念（方向性の正本）</span>
            <span className="text-muted-foreground group-open:hidden">開く</span>
            <span className="hidden text-muted-foreground group-open:inline">
              閉じる
            </span>
          </span>
        </summary>
        <div className="flex flex-col gap-2 border-t border-border px-2.5 pb-2.5 pt-2">
          {band ? (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5">
              <p className="text-[10px] font-medium text-primary">今日のテーマ</p>
              <p className="text-xs font-medium">{band.heading}</p>
              <p className="text-xs leading-snug text-muted-foreground">
                {themeLabel}
              </p>
            </div>
          ) : null}
          {chart}
          <p className="text-[10px] leading-snug text-muted-foreground">
            レビューはこの理念の方向性から外れない。別 Value の話題にすり替えない。
          </p>
        </div>
      </details>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed">{CORPORATE_CREED_VISION}</p>

      {band ? (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
          <p className="text-xs font-medium text-primary">今日のテーマ（参照中）</p>
          <p className="text-sm font-medium">{band.heading}</p>
          <p className="text-xs text-muted-foreground">{themeLabel}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {band.description}
          </p>
        </div>
      ) : null}

      {chart}

      <ul className="flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
        {CORPORATE_CREED_VALUE_BANDS.map((v) => (
          <li key={v.group}>
            <span className="font-medium text-foreground">{v.heading}</span>
            <span className="text-muted-foreground">（{v.mission}）</span>
            <span> — {v.description}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        毎日のレビューは、上記理念の浸透リレー。方向性からそれた解釈・別テーマへのすり替えは避ける。
      </p>
    </div>
  );
}
