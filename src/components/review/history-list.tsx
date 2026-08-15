"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useSettings } from "@/components/settings/settings-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReviewHistoryRecord } from "@/lib/review/history";

type HistoryResponse = {
  configured?: boolean;
  items?: ReviewHistoryRecord[];
  message?: string;
  error?: string;
};

const ALL = "__all__";

export function HistoryList() {
  const { settings, ready } = useSettings();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [items, setItems] = useState<ReviewHistoryRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [themeId, setThemeId] = useState(ALL);
  const [presenterName, setPresenterName] = useState(ALL);

  const activeMembers = useMemo(
    () => settings.members.filter((m) => m.active !== false),
    [settings.members],
  );

  const themeLabel = useMemo(() => {
    if (themeId === ALL) return "すべてのテーマ";
    return (
      settings.valueItems.find((v) => v.id === themeId)?.label ?? themeId
    );
  }, [settings.valueItems, themeId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOpenId(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("match", "and");
      if (themeId !== ALL) params.set("themeId", themeId);
      if (presenterName !== ALL) params.set("presenterName", presenterName);

      const res = await fetch(`/api/review/history?${params.toString()}`);
      const data = (await res.json()) as HistoryResponse;
      if (!res.ok) {
        setError(data.error ?? `読み込み失敗（${res.status}）`);
        setItems([]);
        return;
      }
      setConfigured(data.configured !== false);
      setItems(data.items ?? []);
      if (data.configured === false) {
        setError(data.message ?? "履歴DB未接続");
      }
    } catch {
      setError("履歴の取得に失敗した");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [themeId, presenterName]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  async function copyFullText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setHint("レビュー全文をコピーした");
    } catch {
      setHint("コピーに失敗した");
    }
  }

  const filters = (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">検索</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="history-theme">テーマ（行動指針）</Label>
        <Select
          value={themeId}
          onValueChange={(value) => {
            if (value) setThemeId(value);
          }}
        >
          <SelectTrigger id="history-theme" className="w-full">
            <SelectValue>{themeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべてのテーマ</SelectItem>
            {settings.valueItems.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="history-presenter">担当（発表者）</Label>
        <Select
          value={presenterName}
          onValueChange={(value) => {
            if (value) setPresenterName(value);
          }}
        >
          <SelectTrigger id="history-presenter" className="w-full">
            <SelectValue>
              {presenterName === ALL ? "すべての担当" : presenterName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべての担当</SelectItem>
            {activeMembers.map((m) => (
              <SelectItem key={m.id} value={m.displayName}>
                {m.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          disabled={themeId === ALL && presenterName === ALL}
          onClick={() => {
            setThemeId(ALL);
            setPresenterName(ALL);
            setOpenId(null);
            setHint("検索条件をクリアした");
          }}
        >
          選択をクリア
        </Button>
        <p className="text-xs text-muted-foreground">
          テーマ・担当の選択を外して、直近一覧に戻す。
        </p>
      </div>
    </div>
  );

  if (!ready) {
    return <p className="text-sm text-muted-foreground">読み込み中…</p>;
  }

  if (configured === false) {
    return (
      <div className="flex flex-col gap-4">
        {filters}
        <p className="text-sm text-muted-foreground" role="status">
          {error ?? "DATABASE_URL 未設定。履歴はまだ Neon に繋がっていない。"}
        </p>
        <Button variant="outline" className="h-11 w-full" onClick={() => void load()}>
          再読み込み
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {filters}
      {hint ? (
        <p className="text-sm text-muted-foreground" role="status">
          {hint}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      ) : error && items.length === 0 ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {themeId !== ALL || presenterName !== ALL
            ? "条件に合う履歴がない。"
            : "まだ履歴がない。通読でコピーするとここに残る。"}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const open = openId === item.id;
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3"
              >
                <button
                  type="button"
                  className="flex w-full flex-col gap-1 text-left"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                >
                  <span className="text-sm font-medium text-foreground">
                    {item.reviewDate} · {item.presenterName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.themeLabel || "（指針なし）"}
                  </span>
                  {!open ? (
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {item.summary || item.fullText}
                    </span>
                  ) : null}
                </button>
                {open ? (
                  <div className="flex flex-col gap-3 border-t border-border pt-3">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        本人コメント
                      </p>
                      <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-2 font-mono text-xs text-foreground">
                        {item.sourcePost.trim() || "（未保存）"}
                      </pre>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        レビュー投稿全文
                      </p>
                      <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-background p-2 font-mono text-xs text-foreground">
                        {item.fullText}
                      </pre>
                    </div>
                    <Button
                      variant="secondary"
                      className="h-11 w-full"
                      onClick={() => void copyFullText(item.fullText)}
                    >
                      レビュー全文をコピー
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-9 w-full"
                      onClick={() => setOpenId(null)}
                    >
                      閉じる
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="outline" className="h-11 w-full" onClick={() => void load()}>
        再読み込み
      </Button>
    </div>
  );
}
