"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useSettings } from "@/components/settings/settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  REVIEW_STEPS,
  createEmptyDraft,
  formatReviewPost,
  formatThanks,
  loadReviewDraft,
  saveReviewDraft,
  stubLeaderNote,
  stubSearchLinks,
  type ReviewDraft,
  type ReviewStep,
} from "@/lib/review/draft";

export function ReviewWorkbench() {
  const { settings, ready } = useSettings();
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const saved = loadReviewDraft();
    const fallbackTheme = settings.valueItems[0]?.id ?? "";
    if (saved) {
      setDraft({
        ...createEmptyDraft(fallbackTheme),
        ...saved,
        themeId: saved.themeId || fallbackTheme,
        presenterName: saved.presenterName ?? "",
      });
    } else {
      setDraft(createEmptyDraft(fallbackTheme));
    }
  }, [ready, settings.valueItems]);

  useEffect(() => {
    if (!draft) return;
    saveReviewDraft(draft);
  }, [draft]);

  const themeLabel = useMemo(() => {
    if (!draft) return "";
    return (
      settings.valueItems.find((v) => v.id === draft.themeId)?.label ??
      draft.themeId
    );
  }, [draft, settings.valueItems]);

  const finalText = useMemo(
    () => (draft ? formatReviewPost(draft) : ""),
    [draft],
  );

  const activeMembers = useMemo(
    () => settings.members.filter((m) => m.active),
    [settings.members],
  );

  if (!ready || !draft) {
    return <p className="text-sm text-muted-foreground">読み込み中…</p>;
  }

  const stepMeta = REVIEW_STEPS.find((s) => s.step === draft.step)!;

  function patch(p: Partial<ReviewDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...p } : prev));
    setHint(null);
  }

  function go(step: ReviewStep) {
    patch({ step });
  }

  function runDraftGenerate() {
    void (async () => {
      setGenerating(true);
      setHint("要約を生成中…");
      try {
        const res = await fetch("/api/review/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "summary",
            sourcePost: draft!.sourcePost,
            themeLabel,
            lens: draft!.lens,
            presenterName: draft!.presenterName,
          }),
        });
        const data = (await res.json()) as {
          opener?: string;
          summary?: string;
          provider?: string;
          model?: string;
          fallbackReason?: string;
          error?: string;
        };
        if (!res.ok) {
          setHint(data.error ?? "生成に失敗した");
          return;
        }
        patch({
          opener: data.opener ?? formatThanks(draft!.presenterName),
          summary: data.summary ?? "",
          step: 2,
        });
        const via =
          data.provider === "gemini"
            ? `Gemini${data.model ? ` (${data.model})` : ""}`
            : `スタブ退避${data.fallbackReason ? ` · ${data.fallbackReason}` : ""}`;
        setHint(`お礼＋要約を出した（${via}）。自分の言葉に直して`);
      } catch {
        setHint("生成リクエストに失敗した。ネットワークを確認して");
      } finally {
        setGenerating(false);
      }
    })();
  }

  function runSearch() {
    const linkCandidates = stubSearchLinks(draft!.keywords);
    patch({ linkCandidates });
    setHint("参考リンク候補（POCスタブ）を出した。共有したいものだけ選ぶ（無しでも可）");
  }

  function runLeaderDraft() {
    const leaderNote = stubLeaderNote({
      themeLabel,
      keywords: draft!.keywords,
      lens: draft!.lens,
      sourcePost: draft!.sourcePost,
    });
    patch({ leaderNote, step: 4 });
    setHint("所感下書きを出した。締めを整えて");
  }

  async function copyFinal() {
    try {
      await navigator.clipboard.writeText(finalText);
      setHint("投稿用テキストをコピーした。グループチャットへ貼って");
    } catch {
      setHint("コピーに失敗した。下のテキストを手動選択して");
    }
  }

  const canGenerate =
    Boolean(draft.sourcePost.trim()) && Boolean(draft.presenterName.trim());

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="レビュー段階" className="flex flex-col gap-2">
        <ol className="flex flex-wrap gap-2">
          {REVIEW_STEPS.map((s) => {
            const active = s.step === draft.step;
            const done = s.step < draft.step;
            return (
              <li key={s.step}>
                <button
                  type="button"
                  onClick={() => go(s.step)}
                  className={
                    active
                      ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                      : done
                        ? "rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground"
                        : "rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
                  }
                >
                  {s.step}.{s.title}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-muted-foreground">
          段階 {draft.step}/5 · 実プロセス {stepMeta.process} · {stepMeta.blurb}
        </p>
      </nav>

      {hint ? (
        <p className="text-sm text-muted-foreground" role="status">
          {hint}
        </p>
      ) : null}

      {draft.step === 1 ? (
        <section className="flex flex-col gap-4" aria-label="下書き">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="theme">今日の行動指針</Label>
            <Select
              value={draft.themeId || settings.valueItems[0]?.id || ""}
              onValueChange={(value) => {
                if (value) patch({ themeId: value });
              }}
            >
              <SelectTrigger id="theme" className="w-full">
                <SelectValue>
                  {themeLabel || "行動指針を選ぶ"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {settings.valueItems.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="presenter">発表者（呼び名）</Label>
            <Select
              value={
                activeMembers.some((m) => m.displayName === draft.presenterName)
                  ? draft.presenterName
                  : undefined
              }
              onValueChange={(value) => {
                if (value) patch({ presenterName: value });
              }}
            >
              <SelectTrigger id="presenter" className="w-full">
                <SelectValue placeholder="メンバーから選ぶ" />
              </SelectTrigger>
              <SelectContent>
                {activeMembers.map((m) => (
                  <SelectItem key={m.id} value={m.displayName}>
                    {m.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={draft.presenterName}
              onChange={(e) => patch({ presenterName: e.target.value })}
              placeholder="または手入力（例: 隆さん）"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="post">① 投稿本文（ペースト）</Label>
            <Textarea
              id="post"
              className="min-h-36"
              value={draft.sourcePost}
              onChange={(e) => patch({ sourcePost: e.target.value })}
              placeholder="グループチャットの今日のテーマ投稿を貼る"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lens">観点メモ（任意）</Label>
            <Input
              id="lens"
              value={draft.lens}
              onChange={(e) => patch({ lens: e.target.value })}
              placeholder="今日見てほしい一点"
            />
          </div>
          <Button
            className="h-11 w-full"
            onClick={runDraftGenerate}
            disabled={!canGenerate || generating}
          >
            {generating ? "生成中…" : "下書きを出す（AI要約）"}
          </Button>
        </section>
      ) : null}

      {draft.step === 2 ? (
        <section className="flex flex-col gap-4" aria-label="直す">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opener">お礼</Label>
            <Textarea
              id="opener"
              className="min-h-16"
              value={draft.opener}
              onChange={(e) => patch({ opener: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="summary">要約共有（自分の言葉へ）</Label>
            <Textarea
              id="summary"
              className="min-h-40"
              value={draft.summary}
              onChange={(e) => patch({ summary: e.target.value })}
            />
          </div>
          <Button
            className="h-11 w-full"
            onClick={() => {
              const seed =
                draft.keywords.trim() ||
                themeLabel.match(/^(\d+-[①-⑩]+)/)?.[1] ||
                themeLabel.slice(0, 12);
              patch({ keywords: seed, step: 3 });
            }}
            disabled={!draft.summary.trim()}
          >
            要約できた → 調べるへ
          </Button>
          <Button variant="outline" className="h-11 w-full" onClick={() => go(1)}>
            戻る
          </Button>
        </section>
      ) : null}

      {draft.step === 3 ? (
        <section className="flex flex-col gap-4" aria-label="調べる">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="keywords">検索キーワード</Label>
            <Input
              id="keywords"
              value={draft.keywords}
              onChange={(e) => patch({ keywords: e.target.value })}
            />
          </div>
          <Button
            className="h-11 w-full"
            variant="secondary"
            onClick={runSearch}
            disabled={!draft.keywords.trim()}
          >
            参考リンク候補を出す（POCスタブ）
          </Button>
          {draft.linkCandidates.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {draft.linkCandidates.map((link) => (
                <li
                  key={link.id}
                  className="flex flex-col gap-1 rounded-lg border border-border p-3"
                >
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={link.selected}
                      onChange={(e) =>
                        patch({
                          linkCandidates: draft.linkCandidates.map((l) =>
                            l.id === link.id
                              ? { ...l, selected: e.target.checked }
                              : l,
                          ),
                        })
                      }
                    />
                    <span className="flex flex-col gap-1">
                      <span className="font-medium">♯{link.title}</span>
                      <span className="break-all text-xs text-muted-foreground">
                        {link.url}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-muted-foreground">
            リンクは任意。採否はトシオ。本番はアプリ内検索APIに差し替え。
          </p>
          <Button className="h-11 w-full" onClick={runLeaderDraft}>
            所感へ（リンク無しでも可）
          </Button>
          <Button variant="outline" className="h-11 w-full" onClick={() => go(2)}>
            戻る
          </Button>
        </section>
      ) : null}

      {draft.step === 4 ? (
        <section className="flex flex-col gap-4" aria-label="所感">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leader">所感・着想</Label>
            <Textarea
              id="leader"
              className="min-h-48"
              value={draft.leaderNote}
              onChange={(e) => patch({ leaderNote: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="closing">締めの呼びかけ</Label>
            <Textarea
              id="closing"
              className="min-h-20"
              value={draft.closing}
              onChange={(e) => patch({ closing: e.target.value })}
            />
          </div>
          <Button
            className="h-11 w-full"
            onClick={() => go(5)}
            disabled={!draft.leaderNote.trim()}
          >
            通読へ
          </Button>
          <Button variant="outline" className="h-11 w-full" onClick={() => go(3)}>
            戻る
          </Button>
        </section>
      ) : null}

      {draft.step === 5 ? (
        <section className="flex flex-col gap-4" aria-label="通読コピー">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="final">投稿用プレビュー（構成どおり）</Label>
            <Textarea
              id="final"
              readOnly
              className="min-h-64 font-mono text-xs"
              value={finalText}
            />
          </div>
          <Button className="h-11 w-full" onClick={copyFinal}>
            投稿用にコピー
          </Button>
          <Button variant="outline" className="h-11 w-full" onClick={() => go(4)}>
            戻る
          </Button>
          <Button
            variant="ghost"
            className="h-11 w-full"
            onClick={() => {
              const next = createEmptyDraft(draft.themeId);
              setDraft(next);
              setHint("下書きをクリアした。次のレビューから");
            }}
          >
            新しいレビューを始める
          </Button>
        </section>
      ) : null}

      <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
        ホームへ
      </Button>
    </div>
  );
}
