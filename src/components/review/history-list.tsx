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
import {
  historyExamplePreview,
  listRecentReviews,
  listRelatedReviews,
  pruneReviewHistory,
  reviewHistoryKeepCount,
  type ReviewHistoryRecord,
} from "@/lib/review/history";
import { assignmentForReviewDate } from "@/lib/review/rotation-lookup";
import { valueGroupFromLabel } from "@/lib/rotation/value-group";
import { valueHeadingForLabel } from "@/lib/review/theme-meta";

const ALL = "__all__";
const ALL_GROUP = "__all_group__";

export function HistoryList() {
  const { settings, ready } = useSettings();
  const [items, setItems] = useState<ReviewHistoryRecord[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [themeId, setThemeId] = useState(ALL);
  const [valueGroup, setValueGroup] = useState(ALL_GROUP);
  const [presenterName, setPresenterName] = useState(ALL);

  const activeMembers = useMemo(
    () => settings.members.filter((m) => m.active !== false),
    [settings.members],
  );

  const valueHeadings = settings.creed.valueHeadings;

  const filteredThemes = useMemo(() => {
    if (valueGroup === ALL_GROUP) return settings.valueItems;
    const group = Number(valueGroup);
    return settings.valueItems.filter(
      (v) => valueGroupFromLabel(v.label) === group,
    );
  }, [settings.valueItems, valueGroup]);

  const themeLabel = useMemo(() => {
    if (themeId === ALL) return "すべての指針";
    return (
      settings.valueItems.find((v) => v.id === themeId)?.label ?? themeId
    );
  }, [settings.valueItems, themeId]);

  const valueGroupLabel = useMemo(() => {
    if (valueGroup === ALL_GROUP) return "すべての理念";
    const group = Number(valueGroup);
    return valueHeadings[group - 1] ?? `Value${group}`;
  }, [valueGroup, valueHeadings]);

  const hasFilter =
    themeId !== ALL || presenterName !== ALL || valueGroup !== ALL_GROUP;

  const load = useCallback(() => {
    setOpenId(null);
    const keep = reviewHistoryKeepCount(settings);
    pruneReviewHistory(keep);
    const group =
      valueGroup === ALL_GROUP ? undefined : Number(valueGroup);
    const next =
      hasFilter
        ? listRelatedReviews({
            themeId: themeId === ALL ? undefined : themeId,
            presenterName:
              presenterName === ALL ? undefined : presenterName,
            valueGroup: group,
            limit: keep,
            match: "and",
          })
        : listRecentReviews(keep);
    setItems(next);
  }, [themeId, presenterName, valueGroup, settings, hasFilter]);

  useEffect(() => {
    if (!ready) return;
    load();
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
      <p className="text-xs font-medium text-muted-foreground">
        企業理念の実践例を探す
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="history-value">理念（Value帯）</Label>
        <Select
          value={valueGroup}
          onValueChange={(value) => {
            if (!value) return;
            setValueGroup(value);
            if (value === ALL_GROUP) return;
            const group = Number(value);
            const current = settings.valueItems.find((v) => v.id === themeId);
            if (
              current &&
              valueGroupFromLabel(current.label) !== group
            ) {
              setThemeId(ALL);
            }
          }}
        >
          <SelectTrigger id="history-value" className="w-full">
            <SelectValue>{valueGroupLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_GROUP}>すべての理念</SelectItem>
            {valueHeadings.map((heading, i) => (
              <SelectItem key={heading} value={String(i + 1)}>
                {heading}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="history-theme">テーマ（行動指針）</Label>
        <Select
          value={themeId}
          onValueChange={(value) => {
            if (!value) return;
            setThemeId(value);
            if (value === ALL) return;
            const item = settings.valueItems.find((v) => v.id === value);
            const group = item ? valueGroupFromLabel(item.label) : null;
            if (group != null) setValueGroup(String(group));
          }}
        >
          <SelectTrigger id="history-theme" className="w-full">
            <SelectValue>{themeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>すべての指針</SelectItem>
            {filteredThemes.map((v) => (
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
          disabled={!hasFilter}
          onClick={() => {
            setThemeId(ALL);
            setValueGroup(ALL_GROUP);
            setPresenterName(ALL);
            setOpenId(null);
            setHint("検索条件をクリアした");
          }}
        >
          選択をクリア
        </Button>
        <p className="text-xs text-muted-foreground">
          理念・指針・担当の選択を外して、直近の実践例に戻す。この端末の履歴。
        </p>
      </div>
    </div>
  );

  if (!ready) {
    return <p className="text-sm text-muted-foreground">読み込み中…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {filters}
      {hint ? (
        <p className="text-sm text-muted-foreground" role="status">
          {hint}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hasFilter
            ? "条件に合う実践例がない。"
            : "まだ実践例がない。通読でコピーするとこの端末に残る。"}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const open = openId === item.id;
            const heading = valueHeadingForLabel(item.themeLabel);
            const preview = historyExamplePreview(item);
            const rotation = assignmentForReviewDate(
              settings.rotation.historyCycles,
              item.reviewDate,
              settings.members,
              settings.valueItems,
            );
            const rotationDiffers =
              rotation &&
              rotation.themeId &&
              item.themeId &&
              rotation.themeId !== item.themeId;
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
                  <span className="text-xs font-medium text-primary">
                    {heading}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.themeLabel || "（指針なし）"}
                  </span>
                  {rotationDiffers ? (
                    <span className="text-xs text-muted-foreground">
                      ローテ当日は {rotation.themeLabel}
                    </span>
                  ) : null}
                  {!open ? (
                    <span className="line-clamp-3 text-sm text-foreground">
                      {preview || "（実践例の本文なし）"}
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
      <Button variant="outline" className="h-11 w-full" onClick={load}>
        再読み込み
      </Button>
    </div>
  );
}
