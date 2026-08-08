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
import { googleAiModeSearchUrl } from "@/lib/review/google-ai-mode";
import {
  REVIEW_STEPS,
  canEnterLeaderStep,
  createEmptyDraft,
  formatReviewPost,
  formatThanks,
  loadReviewDraft,
  saveReviewDraft,
  selectedLinkCount,
  type ReviewDraft,
  type ReviewStep,
} from "@/lib/review/draft";
import {
  checkFinalReviewPost,
  repairDuplicatedGuidelinePhrase,
  type FinalCheckResult,
} from "@/lib/review/final-check";

export function ReviewWorkbench() {
  const { settings, ready } = useSettings();
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [finalCheck, setFinalCheck] = useState<FinalCheckResult | null>(null);

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

  useEffect(() => {
    if (!draft || draft.step !== 5) {
      setFinalCheck(null);
      return;
    }
    const cleanedSummary = repairDuplicatedGuidelinePhrase(draft.summary);
    if (cleanedSummary !== draft.summary) {
      setDraft((prev) =>
        prev ? { ...prev, summary: cleanedSummary } : prev,
      );
      setHint("要約の定型二重を自動で直した。通読して確認して");
      return;
    }
    setFinalCheck(checkFinalReviewPost(finalText));
  }, [draft, finalText]);

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
            themeId: draft!.themeId,
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

  function runKeywordSuggestions() {
    void (async () => {
      setGenerating(true);
      setHint("検索ワード候補を作成中…");
      try {
        const res = await fetch("/api/review/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "keyword-suggestions",
            themeLabel,
            sourcePost: draft!.sourcePost,
            summary: draft!.summary,
            lens: draft!.lens,
          }),
        });
        const data = (await res.json()) as {
          suggestions?: string[];
          provider?: string;
          model?: string;
          fallbackReason?: string;
          error?: string;
        };
        if (!res.ok) {
          setHint(data.error ?? "検索ワード候補の作成に失敗した");
          return;
        }
        patch({
          keywordSuggestions: data.suggestions ?? [],
          keywords: "",
          linkCandidates: [],
          researchBrief: "",
        });
        const via =
          data.provider === "gemini"
            ? `Gemini${data.model ? ` (${data.model})` : ""}`
            : `スタブ退避${data.fallbackReason ? ` · ${data.fallbackReason}` : ""}`;
        setHint(
          `検索ワード候補を3つ出した（${via}）。選ぶか、下に希望ワードを入れて`,
        );
      } catch {
        setHint("検索ワード候補リクエストに失敗した");
      } finally {
        setGenerating(false);
      }
    })();
  }

  function openGoogleAiMode() {
    const q = draft!.keywords.trim();
    if (!q) {
      setHint("先に検索ワードを選ぶか入力して");
      return;
    }
    window.open(googleAiModeSearchUrl(q), "_blank", "noopener,noreferrer");
    setHint(
      "Googleを開いた。OKな参照をアプリに貼り返してから、所感の下地を揃えよう",
    );
  }

  function addManualLink() {
    const title = draft!.keywords.trim();
    if (!title) {
      setHint("先に検索ワードを選ぶか入力して（♯タイトルになる）");
      return;
    }
    let url = manualUrl.trim();
    if (!url) {
      setHint("URLを貼ってから追加して");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        setHint("http(s)のURLにして");
        return;
      }
    } catch {
      setHint("URLの形式を確認して");
      return;
    }
    const id = `manual-${Date.now()}`;
    patch({
      linkCandidates: [
        ...draft!.linkCandidates,
        { id, title, url, selected: true, snippet: "" },
      ],
      researchBrief: "",
    });
    setManualUrl("");
    setHint(`♯${title} で参照を貼り返した。続けて追加するか、フォーカスへ`);
  }

  function removeLink(id: string) {
    patch({
      linkCandidates: draft!.linkCandidates.filter((l) => l.id !== id),
      researchBrief: "",
    });
    setHint("参照を外した");
  }

  function runResearchBrief() {
    void (async () => {
      const selectedLinks = draft!.linkCandidates.map((l) => ({
        title: l.title,
        url: l.url,
      }));
      if (selectedLinks.length === 0) {
        setHint("先に参照を1つ以上貼り返して（採択）");
        return;
      }
      if (!draft!.researchFocus.trim()) {
        setHint("所感向けフォーカス指示を書いてから要点を作って");
        return;
      }
      setGenerating(true);
      setHint("要点メモを生成中…");
      try {
        const res = await fetch("/api/review/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "research-brief",
            keywords: draft!.keywords,
            researchFocus: draft!.researchFocus,
            themeLabel,
            sourcePost: draft!.sourcePost,
            summary: draft!.summary,
            selectedLinks,
          }),
        });
        const data = (await res.json()) as {
          researchBrief?: string;
          provider?: string;
          model?: string;
          fallbackReason?: string;
          error?: string;
        };
        if (!res.ok) {
          setHint(data.error ?? "要点の生成に失敗した");
          return;
        }
        patch({ researchBrief: data.researchBrief ?? "" });
        const via =
          data.provider === "gemini"
            ? `Gemini${data.model ? ` (${data.model})` : ""}`
            : `スタブ退避${data.fallbackReason ? ` · ${data.fallbackReason}` : ""}`;
        setHint(`要点メモを出した（${via}）。直してから所感下書きへ`);
      } catch {
        setHint("要点リクエストに失敗した");
      } finally {
        setGenerating(false);
      }
    })();
  }

  function runLeaderDraft() {
    void (async () => {
      if (!canEnterLeaderStep(draft!)) {
        setHint("調べるが未完了。参照の貼り返し・フォーカス・要点を揃えて");
        return;
      }
      setGenerating(true);
      setHint("所感を生成中…");
      try {
        const selectedLinkTitles = draft!.linkCandidates.map((l) => l.title);
        const res = await fetch("/api/review/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "leader",
            sourcePost: draft!.sourcePost,
            themeLabel,
            themeId: draft!.themeId,
            lens: draft!.lens,
            keywords: draft!.keywords,
            summary: draft!.summary,
            selectedLinkTitles,
            researchFocus: draft!.researchFocus,
            researchBrief: draft!.researchBrief,
            presenterName: draft!.presenterName,
          }),
        });
        const data = (await res.json()) as {
          leaderNote?: string;
          provider?: string;
          model?: string;
          fallbackReason?: string;
          error?: string;
        };
        if (!res.ok) {
          setHint(data.error ?? "所感の生成に失敗した");
          return;
        }
        patch({ leaderNote: data.leaderNote ?? "" });
        const via =
          data.provider === "gemini"
            ? `Gemini${data.model ? ` (${data.model})` : ""}`
            : `スタブ退避${data.fallbackReason ? ` · ${data.fallbackReason}` : ""}`;
        setHint(`所感下書きを出した（${via}）。貼り返した参照を踏まえ、自分のエッセンスに脚色して`);
      } catch {
        setHint("所感リクエストに失敗した。ネットワークを確認して");
      } finally {
        setGenerating(false);
      }
    })();
  }

  function runFinalCheck() {
    const result = checkFinalReviewPost(finalText);
    setFinalCheck(result);
    if (result.ok) {
      setHint(
        result.issues.length
          ? "最終チェック: 重大な問題なし（警告あり）。通読してからコピーして"
          : "最終チェック: OK。通読してからコピーして",
      );
    } else {
      setHint("最終チェック: 直す箇所あり。下の指摘を見てからコピーして");
    }
  }

  function repairFinalDuplication() {
    const current = draft;
    if (!current) return;
    const nextSummary = repairDuplicatedGuidelinePhrase(current.summary);
    const patched = { ...current, summary: nextSummary };
    patch({ summary: nextSummary });
    const after = checkFinalReviewPost(formatReviewPost(patched));
    setFinalCheck(after);
    setHint(
      after.ok
        ? "定型の二重を直した。もう一度通読して"
        : "自動修正しきれなかった。要約欄を手で直して",
    );
  }

  async function copyFinal() {
    const current = draft;
    if (!current) return;
    const result = checkFinalReviewPost(finalText);
    setFinalCheck(result);
    if (!result.ok) {
      setHint("コピー前チェックで問題あり。指摘を直してからもう一度");
      return;
    }
    try {
      await navigator.clipboard.writeText(finalText);
    } catch {
      setHint("コピーに失敗した。下のテキストを手動選択して");
      return;
    }

    setHint("投稿用テキストをコピーした。履歴へ保存中…");
    try {
      const res = await fetch("/api/review/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presenterName: current.presenterName,
          themeId: current.themeId,
          themeLabel,
          sourcePost: current.sourcePost,
          opener: current.opener,
          summary: current.summary,
          leaderNote: current.leaderNote,
          closing: current.closing,
          links: current.linkCandidates
            .filter((l) => l.selected && l.url.trim())
            .map((l) => ({ title: l.title, url: l.url })),
          fullText: finalText,
          keywords: current.keywords,
          researchBrief: current.researchBrief,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        configured?: boolean;
        item?: { id: string };
      };
      if (res.status === 503 || data.configured === false) {
        setHint(
          "コピーした。履歴DB未接続（DATABASE_URL）。グループチャットへ貼って",
        );
        return;
      }
      if (!res.ok) {
        setHint(
          `コピーした。履歴保存は失敗（${data.error ?? res.status}）。投稿は手元のコピーで続行可`,
        );
        return;
      }
      setHint("コピーした＋履歴に保存した。グループチャットへ貼って");
    } catch {
      setHint(
        "コピーした。履歴保存リクエスト失敗。投稿は手元のコピーで続行可",
      );
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
            <Label htmlFor="lens">観点メモ（要約前・任意）</Label>
            <Input
              id="lens"
              value={draft.lens}
              onChange={(e) => patch({ lens: e.target.value })}
              placeholder="要約前の薄いフック"
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
              patch({
                step: 3,
                keywords: "",
                keywordSuggestions: [],
                linkCandidates: [],
                researchBrief: "",
              });
              setHint("検索ワード候補を作成中…");
              void (async () => {
                setGenerating(true);
                try {
                  const res = await fetch("/api/review/draft", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      kind: "keyword-suggestions",
                      themeLabel,
                      sourcePost: draft.sourcePost,
                      summary: draft.summary,
                      lens: draft.lens,
                    }),
                  });
                  const data = (await res.json()) as {
                    suggestions?: string[];
                    provider?: string;
                    model?: string;
                    fallbackReason?: string;
                    error?: string;
                  };
                  if (!res.ok) {
                    setHint(data.error ?? "検索ワード候補の作成に失敗した");
                    return;
                  }
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          keywordSuggestions: data.suggestions ?? [],
                          keywords: "",
                        }
                      : prev,
                  );
                  const via =
                    data.provider === "gemini"
                      ? `Gemini${data.model ? ` (${data.model})` : ""}`
                      : `スタブ退避${data.fallbackReason ? ` · ${data.fallbackReason}` : ""}`;
                  setHint(
                    `検索ワード候補を出した（${via}）。選ぶか、希望ワードを入れて`,
                  );
                } catch {
                  setHint("検索ワード候補リクエストに失敗した");
                } finally {
                  setGenerating(false);
                }
              })();
            }}
            disabled={!draft.summary.trim() || generating}
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
          <p className="text-xs leading-relaxed text-muted-foreground">
            Googleで調べてOKなら、参照リンクをアプリに貼り返す。その内容を見てから所感下書きへ進む。
          </p>
          <div className="flex flex-col gap-1.5">
            <Label>検索ワード候補</Label>
            {draft.keywordSuggestions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {draft.keywordSuggestions.map((kw) => {
                  const active = draft.keywords.trim() === kw;
                  return (
                    <Button
                      key={kw}
                      type="button"
                      variant={active ? "default" : "outline"}
                      className="h-auto min-h-11 w-full justify-start whitespace-normal px-3 py-2 text-left"
                      onClick={() =>
                        patch({
                          keywords: kw,
                          researchBrief: "",
                        })
                      }
                    >
                      {kw}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                候補未作成。下のボタンで出せる。
              </p>
            )}
            <Button
              variant="ghost"
              className="h-9 w-full"
              onClick={runKeywordSuggestions}
              disabled={generating}
            >
              {generating ? "作成中…" : "検索ワード候補を出し直す"}
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="keywords">使う検索ワード（候補 or 希望）</Label>
            <Input
              id="keywords"
              value={draft.keywords}
              onChange={(e) =>
                patch({
                  keywords: e.target.value,
                  researchBrief: "",
                })
              }
              placeholder="候補になければ、希望のワードを入力"
            />
          </div>
          <Button
            className="h-11 w-full"
            onClick={openGoogleAiMode}
            disabled={!draft.keywords.trim()}
          >
            Googleで調べる
          </Button>
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">
              検索でOKだった参照を貼り返す。♯タイトルは「♯＋検索ワード」固定。
            </p>
            {draft.keywords.trim() ? (
              <p className="text-sm font-medium">♯{draft.keywords.trim()}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                検索ワードが空だと貼り返せない
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="manualUrl">URL</Label>
              <Input
                id="manualUrl"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full"
              onClick={addManualLink}
              disabled={!draft.keywords.trim()}
            >
              参照を貼り返す
            </Button>
          </div>
          {draft.linkCandidates.length > 0 ? (
            <ul className="flex flex-col gap-2">
              <li className="text-xs text-muted-foreground">貼り返した参照</li>
              {draft.linkCandidates.map((link) => (
                <li
                  key={link.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">♯{link.title}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 shrink-0 px-2 text-xs"
                      onClick={() => removeLink(link.id)}
                    >
                      外す
                    </Button>
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-xs text-primary underline-offset-2 hover:underline"
                  >
                    {link.url}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {selectedLinkCount(draft) === 0 ? (
            <p className="text-xs text-muted-foreground">
              参照を1つ以上貼り返すまで、所感へ進めない。
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="researchFocus">
                  所感向けフォーカス指示（自分で考えて書く）
                </Label>
                <Textarea
                  id="researchFocus"
                  className="min-h-24"
                  placeholder="例: 間接部門でも使える「誰に聞くか」の一手に寄せたい"
                  value={draft.researchFocus}
                  onChange={(e) =>
                    patch({ researchFocus: e.target.value, researchBrief: "" })
                  }
                />
              </div>
              <Button
                className="h-11 w-full"
                variant="secondary"
                onClick={runResearchBrief}
                disabled={
                  generating ||
                  !draft.researchFocus.trim() ||
                  selectedLinkCount(draft) === 0
                }
              >
                {generating ? "生成中…" : "要点メモを作る"}
              </Button>
              {draft.researchBrief.trim() ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="researchBrief">調べた要点メモ</Label>
                  <Textarea
                    id="researchBrief"
                    className="min-h-40"
                    value={draft.researchBrief}
                    onChange={(e) =>
                      patch({ researchBrief: e.target.value })
                    }
                  />
                </div>
              ) : null}
            </div>
          )}
          <Button
            className="h-11 w-full"
            onClick={() => {
              if (!canEnterLeaderStep(draft)) {
                if (selectedLinkCount(draft) === 0) {
                  setHint("参照を貼り返すまで繰り返そう");
                } else if (!draft.researchFocus.trim()) {
                  setHint("フォーカス指示を書いて");
                } else if (!draft.researchBrief.trim()) {
                  setHint("要点メモを作ってから所感下書きへ");
                }
                return;
              }
              go(4);
              setHint("貼り返した参照を見て、所感下書きを出して脚色して");
            }}
          >
            所感下書きへ
          </Button>
          <Button variant="outline" className="h-11 w-full" onClick={() => go(2)}>
            戻る
          </Button>
        </section>
      ) : null}

      {draft.step === 4 ? (
        <section className="flex flex-col gap-4" aria-label="所感">
          {!canEnterLeaderStep(draft) ? (
            <p className="text-sm text-muted-foreground">
              調べるが未完了。戻って参照の貼り返し・フォーカス・要点を揃えて。
            </p>
          ) : null}
          <Button
            className="h-11 w-full"
            onClick={runLeaderDraft}
            disabled={
              generating || !draft.summary.trim() || !canEnterLeaderStep(draft)
            }
          >
            {generating
              ? "生成中…"
              : "所感下書きを出す（貼り返した参照を下地に）"}
          </Button>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leader">所感・着想（ここで脚色）</Label>
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
          {finalCheck ? (
            <div
              className={
                finalCheck.ok
                  ? "rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                  : "rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm"
              }
              role="status"
            >
              <p className="font-medium">
                最終チェック: {finalCheck.ok ? "OK" : "要修正"}
              </p>
              {finalCheck.issues.length ? (
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {finalCheck.issues.map((i) => (
                    <li key={i.id}>
                      [{i.severity === "error" ? "必須" : "注意"}] {i.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  定型の二重・ですね語尾など、機械チェック上の問題なし
                </p>
              )}
            </div>
          ) : null}
          <Button variant="outline" className="h-11 w-full" onClick={runFinalCheck}>
            最終チェックを再実行
          </Button>
          {finalCheck &&
          !finalCheck.ok &&
          finalCheck.issues.some(
            (i) =>
              i.id === "dup-guideline-about" || i.id === "dup-prefix-phrase",
          ) ? (
            <Button
              variant="secondary"
              className="h-11 w-full"
              onClick={repairFinalDuplication}
            >
              定型の二重を自動で直す
            </Button>
          ) : null}
          <Button
            className="h-11 w-full"
            onClick={copyFinal}
            disabled={Boolean(finalCheck && !finalCheck.ok)}
          >
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
              setFinalCheck(null);
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
