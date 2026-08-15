"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
import { CorporateCreedPanel } from "@/components/creed/corporate-creed-panel";
import { ReviewStepLayout } from "@/components/review/review-two-pane";
import { googleAiModeSearchUrl } from "@/lib/review/google-ai-mode";
import {
  REVIEW_STEPS,
  canEnterLeaderStep,
  canGenerateLeaderNote,
  createEmptyDraft,
  formatReviewPost,
  formatThanks,
  loadReviewDraft,
  resolveAssembledPost,
  saveReviewDraft,
  selectedLinkCount,
  withRepairedKagiQuotes,
  type ReviewDraft,
  type ReviewStep,
} from "@/lib/review/draft";
import {
  checkFinalReviewPost,
  repairDuplicatedGuidelinePhrase,
  textMayMissOpeningKagi,
  type FinalCheckResult,
} from "@/lib/review/final-check";
import { PAGE_PASTE_MIN_CHARS } from "@/lib/review/providers/research-brief";
import { consumePendingShare } from "@/lib/review/share-target";
import {
  historyNotesForDraft,
  reviewHistoryKeepCount,
  sameThemeHistoryForLeader,
  saveReviewHistory,
} from "@/lib/review/history";
import { matchValueItemFromSourcePost } from "@/lib/review/match-theme";

function providerLabel(
  provider?: string,
  model?: string,
  fallback?: string,
): string {
  if (provider === "chatgpt") {
    return `ChatGPT${model ? ` (${model})` : ""}`;
  }
  if (provider === "gemini") {
    return `Gemini${model ? ` (${model})` : ""}`;
  }
  return `スタブ退避${fallback ? ` · ${fallback}` : ""}`;
}

export function ReviewWorkbench() {
  const { settings, ready } = useSettings();
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [finalCheck, setFinalCheck] = useState<FinalCheckResult | null>(null);
  const [closingCandidates, setClosingCandidates] = useState<string[]>([]);
  const [summaryCandidates, setSummaryCandidates] = useState<
    {
      provider: string;
      summary: string;
      model?: string;
      fallbackReason?: string;
    }[]
  >([]);
  const [summaryRevise, setSummaryRevise] = useState("");
  const shareAppliedRef = useRef(false);

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
    if (!draft || shareAppliedRef.current) return;
    const pending = consumePendingShare();
    if (!pending) return;
    shareAppliedRef.current = true;

    if (pending.intent === "post") {
      const body = pending.text.trim() || pending.title.trim();
      const hit = matchValueItemFromSourcePost(body, settings.valueItems);
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              step: 1,
              sourcePost: body,
              ...(hit ? { themeId: hit.id } : {}),
            }
          : prev,
      );
      setHint(
        hit
          ? `共有から投稿を受け取り、行動指針をセットした: ${hit.label}`
          : "共有からメンバー投稿を受け取った",
      );
      return;
    }

    const url = pending.url.trim();
    if (!url) {
      setHint("共有にURLがなかった。Googleからもう一度共有して");
      return;
    }
    const sharp =
      (pending.title.trim() || pending.text.trim() || "共有リンク").slice(0, 40);
    const id = `share-${Date.now()}`;
    setDraft((prev) => {
      if (!prev) return prev;
      const keywords = prev.keywords.trim() || sharp;
      return {
        ...prev,
        step: 3,
        researchPhase: "collect",
        keywords,
        // 共有は常に参照1本に差し替え（二重防止）
        linkCandidates: [
          {
            id,
            title: keywords,
            url,
            selected: true,
          },
        ],
        researchBrief: "",
        researchPagePaste: "",
        researchNeedsPagePaste: false,
        researchFocus: "",
      };
    });
    setHint("共有からGoogle参照を1本入れた。所感へ進んで要点を作って");
  }, [draft, settings.valueItems]);

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
    () => (draft ? resolveAssembledPost(draft) : ""),
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
    if (step === 5 && draft) {
      const repaired = withRepairedKagiQuotes(draft);
      const assembled = formatReviewPost(repaired);
      patch({
        step: 5,
        leaderNote: repaired.leaderNote,
        closing: repaired.closing,
        assembledPost: assembled,
      });
      return;
    }
    patch({ step });
  }

  /** 投稿本文から行動指針を推定してセット（Selectで直せる） */
  function applyThemeFromSourcePost(sourcePost: string) {
    const hit = matchValueItemFromSourcePost(
      sourcePost,
      settings.valueItems,
    );
    if (!hit) {
      patch({ sourcePost });
      return;
    }
    const changed = hit.id !== draft!.themeId;
    patch({ sourcePost, themeId: hit.id });
    if (changed) {
      setHint(`投稿から行動指針をセットした: ${hit.label}（直せる）`);
    }
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
            historyNotes: historyNotesForDraft({
              themeId: draft!.themeId,
              presenterName: draft!.presenterName,
            }),
          }),
        });
        const data = (await res.json()) as {
          opener?: string;
          summary?: string;
          provider?: string;
          model?: string;
          fallbackReason?: string;
          error?: string;
          providerFailures?: { provider: string; reason: string }[];
          candidates?: {
            provider: string;
            summary: string;
            model?: string;
            fallbackReason?: string;
          }[];
        };
        if (!res.ok) {
          setHint(data.error ?? "生成に失敗した");
          return;
        }
        const candidates = data.candidates ?? [];
        setSummaryCandidates(candidates);
        const opener = data.opener ?? formatThanks(draft!.presenterName);
        const failHint =
          data.providerFailures
            ?.map((f) => `${f.provider}: ${f.reason}`)
            .join(" / ") ?? "";
        if (candidates.length > 1) {
          patch({
            opener,
            summary: "",
            summaryProvider: "",
            step: 2,
          });
          setHint("要約が2案出た。使うほうを選ぶ。選んだモデルであとから要点もまとめる");
          return;
        }
        const only = candidates[0];
        const provider =
          only?.provider === "chatgpt" ||
          only?.provider === "gemini" ||
          only?.provider === "stub"
            ? only.provider
            : "stub";
        patch({
          opener,
          summary: only?.summary ?? data.summary ?? "",
          summaryProvider: provider === "stub" ? "" : provider,
          step: 2,
        });
        setHint(
          failHint
            ? `お礼＋要約を出した（${providerLabel(provider, only?.model, data.fallbackReason)}）。ChatGPTは出なかった（${failHint}）`
            : `お礼＋要約を出した（${providerLabel(provider, only?.model, data.fallbackReason)}）。必要なら直して`,
        );
      } catch {
        setHint("生成リクエストに失敗した。ネットワークを確認して");
      } finally {
        setGenerating(false);
      }
    })();
  }

  function adoptSummaryCandidate(candidate: {
    provider: string;
    summary: string;
    model?: string;
  }) {
    const provider =
      candidate.provider === "chatgpt" || candidate.provider === "gemini"
        ? candidate.provider
        : "";
    patch({
      summary: candidate.summary,
      summaryProvider: provider,
    });
    setHint(
      `${providerLabel(candidate.provider, candidate.model)} を採用した。このモデルで要点メモもまとめる`,
    );
  }

  function runSummaryRevise(instruction: string) {
    const text = instruction.trim();
    if (!text) {
      setHint("直し方を書いてから押して");
      return;
    }
    if (!draft!.summary.trim()) {
      setHint("先に要約案を選ぶか、下書きを出して");
      return;
    }
    void (async () => {
      setGenerating(true);
      setHint("要約を直してる…");
      try {
        const preferred =
          draft!.summaryProvider === "chatgpt" ? "chatgpt" : "gemini";
        const res = await fetch("/api/review/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "summary-revise",
            sourcePost: draft!.sourcePost,
            themeLabel,
            themeId: draft!.themeId,
            lens: draft!.lens,
            presenterName: draft!.presenterName,
            currentSummary: draft!.summary,
            instruction: text,
            preferredProvider: preferred,
            historyNotes: historyNotesForDraft({
              themeId: draft!.themeId,
              presenterName: draft!.presenterName,
            }),
          }),
        });
        const data = (await res.json()) as {
          summary?: string;
          provider?: string;
          model?: string;
          fallbackReason?: string;
          error?: string;
        };
        if (!res.ok) {
          setHint(data.error ?? "直しに失敗した");
          return;
        }
        patch({ summary: data.summary ?? "" });
        setHint(
          `要約を直した（${providerLabel(data.provider, data.model, data.fallbackReason)}）`,
        );
      } catch {
        setHint("直しリクエストに失敗した");
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
          researchFocus: "",
          researchPagePaste: "",
          researchNeedsPagePaste: false,
          researchPhase: "collect",
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
      "Googleを開いた。OKな結果を共有→「企業理念リレー」で参照を1本入れる",
    );
  }

  function removeLink(id: string) {
    const next = draft!.linkCandidates.filter((l) => l.id !== id);
    patch({
      linkCandidates: next,
      researchBrief: "",
      researchPagePaste: next.length === 0 ? "" : draft!.researchPagePaste,
      researchNeedsPagePaste:
        next.length === 0 ? false : draft!.researchNeedsPagePaste,
      researchFocus: next.length === 0 ? "" : draft!.researchFocus,
    });
    setHint("参照を外した");
  }

  async function pastePageFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setHint("クリップボードが空。ページでコピーしてから再度");
        return;
      }
      patch({
        researchPagePaste: text,
        researchBrief: "",
        researchNeedsPagePaste: true,
      });
      if (text.trim().length < PAGE_PASTE_MIN_CHARS) {
        setHint("貼ったが短い。もう少し本文を足すと要点が走る");
        return;
      }
      setHint("本文を貼った。要点メモを作ってる…");
      runResearchBrief({ pagePaste: text });
    } catch {
      setHint("クリップボードを読めなかった。下の欄に直接貼って");
    }
  }

  function runResearchBrief(overrides?: { pagePaste?: string }) {
    void (async () => {
      const selectedLinks = draft!.linkCandidates.map((l) => ({
        title: l.title,
        url: l.url,
      }));
      if (selectedLinks.length === 0) {
        setHint("先に調べるで参照を1本入れて");
        return;
      }
      const pagePaste = overrides?.pagePaste ?? draft!.researchPagePaste;
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
            pagePaste,
            preferredProvider: draft!.summaryProvider || "gemini",
          }),
        });
        const data = (await res.json()) as {
          researchBrief?: string;
          provider?: string;
          model?: string;
          fallbackReason?: string;
          needsPagePaste?: boolean;
          error?: string;
        };
        if (!res.ok) {
          setHint(data.error ?? "要点の生成に失敗した");
          return;
        }
        if (data.needsPagePaste) {
          patch({ researchBrief: "", researchNeedsPagePaste: true });
          setHint(
            "URLの本文を取れなかった。ページを開いてコピー→「クリップボードから貼る」→もう一度要点メモ",
          );
          return;
        }
        patch({
          researchBrief: data.researchBrief ?? "",
          researchNeedsPagePaste: false,
        });
        const via = providerLabel(
          data.provider,
          data.model,
          data.fallbackReason,
        );
        setHint(`要点メモを出した（${via}）。所感向けフォーカスを書いてから下書きへ`);
      } catch {
        setHint("要点リクエストに失敗した");
      } finally {
        setGenerating(false);
      }
    })();
  }

  function runLeaderDraft() {
    void (async () => {
      if (!canGenerateLeaderNote(draft!)) {
        setHint("要点と所感向けフォーカスを揃えてから下書きを出して");
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
            keywords: draft!.keywords,
            summary: draft!.summary,
            selectedLinkTitles,
            researchFocus: draft!.researchFocus,
            researchBrief: draft!.researchBrief,
            presenterName: draft!.presenterName,
            historyNotes: sameThemeHistoryForLeader(draft!.themeId),
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
        const leaderNote = data.leaderNote ?? "";
        patch({ leaderNote });
        const via =
          data.provider === "gemini"
            ? `Gemini${data.model ? ` (${data.model})` : ""}`
            : `スタブ退避${data.fallbackReason ? ` · ${data.fallbackReason}` : ""}`;
        const gaHint =
          leaderNote && textMayMissOpeningKagi(leaderNote)
            ? " 開きの「が抜けてないか見て。"
            : "";
        setHint(
          `所感下書きを出した（${via}）。${gaHint}締めを本文に合わせて提案中…`,
        );

        const closingRes = await fetch("/api/review/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "closing",
            leaderNote,
            summary: draft!.summary,
            sourcePost: draft!.sourcePost,
            themeLabel,
            exclude: draft!.closing,
          }),
        });
        const closingData = (await closingRes.json()) as {
          closing?: string;
          candidates?: string[];
          provider?: string;
          error?: string;
        };
        if (closingRes.ok && closingData.closing) {
          patch({ closing: closingData.closing });
          setClosingCandidates(closingData.candidates ?? [closingData.closing]);
          setHint(
            `所感と、本文に対応した締め案を出した（${via}）。脚色して選んで`,
          );
        } else {
          setHint(
            `所感下書きを出した（${via}）。締め案の取得に失敗したので、下のボタンで再提案して`,
          );
        }
      } catch {
        setHint("所感リクエストに失敗した。ネットワークを確認して");
      } finally {
        setGenerating(false);
      }
    })();
  }

  function runClosingDraft() {
    void (async () => {
      if (!draft?.leaderNote.trim()) {
        setHint("先に所感本文を書いてから締めを提案する");
        return;
      }
      setGenerating(true);
      setHint("締めの呼びかけを、所感に合わせて提案中…");
      try {
        const res = await fetch("/api/review/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "closing",
            leaderNote: draft.leaderNote,
            summary: draft.summary,
            sourcePost: draft.sourcePost,
            themeLabel,
            exclude: draft.closing,
          }),
        });
        const data = (await res.json()) as {
          closing?: string;
          candidates?: string[];
          provider?: string;
          model?: string;
          fallbackReason?: string;
          error?: string;
        };
        if (!res.ok) {
          setHint(data.error ?? "締め案の生成に失敗した");
          return;
        }
        if (data.closing) {
          patch({ closing: data.closing });
          setClosingCandidates(data.candidates ?? [data.closing]);
        }
        const via =
          data.provider === "gemini"
            ? `Gemini${data.model ? ` (${data.model})` : ""}`
            : `スタブ退避${data.fallbackReason ? ` · ${data.fallbackReason}` : ""}`;
        setHint(`締め案を出した（${via}）。しっくり来なければ別案を選ぶか再提案して`);
      } catch {
        setHint("締め案のリクエストに失敗した");
      } finally {
        setGenerating(false);
      }
    })();
  }

  function enterReadStep() {
    if (!draft) return;
    const repaired = withRepairedKagiQuotes(draft);
    const kagiFixed =
      repaired.leaderNote !== draft.leaderNote ||
      repaired.closing !== draft.closing;
    const assembled = formatReviewPost(repaired);
    patch({
      step: 5,
      leaderNote: repaired.leaderNote,
      closing: repaired.closing,
      assembledPost: assembled,
    });
    setHint(
      kagiFixed
        ? "開きの「が抜けていたので通読文で補った。最終編集してからコピーして"
        : "通読して最終編集してからコピーして",
    );
  }

  function rebuildAssembledFromParts() {
    if (!draft) return;
    const repaired = withRepairedKagiQuotes(draft);
    const assembled = formatReviewPost(repaired);
    patch({
      leaderNote: repaired.leaderNote,
      closing: repaired.closing,
      assembledPost: assembled,
    });
    setFinalCheck(checkFinalReviewPost(assembled));
    setHint("各欄から投稿全文を組み立て直した。必要なら手直しして");
  }

  async function runFinalCheck() {
    const result = checkFinalReviewPost(finalText);
    setFinalCheck(result);
    setGenerating(true);
    setHint("最終チェック（機械＋AI照合）…");
    try {
      const res = await fetch("/api/review/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "final-check", text: finalText }),
      });
      const data = (await res.json()) as {
        issues?: { id: string; severity: "error" | "warn"; message: string }[];
        error?: string;
      };
      const extra = res.ok ? (data.issues ?? []) : [];
      const merged = {
        ok: result.ok,
        issues: [...result.issues, ...extra],
      };
      setFinalCheck(merged);
      if (!merged.ok) {
        setHint("最終チェック: 直す箇所あり。下の指摘を見てからコピーして");
      } else if (merged.issues.length) {
        setHint("最終チェック: 重大な問題なし（警告あり）。通読してからコピーして");
      } else {
        setHint("最終チェック: OK。通読してからコピーして");
      }
    } catch {
      setHint("AI照合はスキップした。機械チェックの結果だけ表示してる");
    } finally {
      setGenerating(false);
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
    if (!current.reviewDate.trim()) {
      setHint("コメント対象の営業日が空。下書きに戻って日付を入れて");
      return;
    }
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
      saveReviewHistory({
        reviewDate: current.reviewDate.slice(0, 10),
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
      }, reviewHistoryKeepCount(settings));
      setHint("コピーした＋この端末の履歴に保存した。グループチャットへ貼って");
    } catch {
      setHint(
        "コピーした。履歴保存に失敗した。投稿は手元のコピーで続行可",
      );
    }
  }

  const canGenerate =
    Boolean(draft.sourcePost.trim()) &&
    Boolean(draft.presenterName.trim()) &&
    Boolean(draft.reviewDate.trim());

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-30 -mx-4 flex flex-col gap-2 border-b border-border bg-background/95 px-4 pb-2.5 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <header className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">企業理念リレー</p>
          <h1 className="text-lg font-semibold tracking-tight">レビュープロセス</h1>
        </header>

        <nav
          aria-label="レビュープロセス"
          className="rounded-md border border-primary bg-primary p-1.5 text-primary-foreground"
        >
          <ol className="grid w-full grid-cols-5 gap-1">
            {REVIEW_STEPS.map((step) => {
              const active = step.step === draft.step;
              const done = step.step < draft.step;
              return (
                <li key={step.step} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => go(step.step)}
                    title={`${step.step}.${step.title}`}
                    className={
                      active
                        ? "flex h-10 w-full flex-col items-center justify-center gap-0.5 rounded-md bg-primary-foreground px-0.5 text-primary"
                        : done
                          ? "flex h-10 w-full flex-col items-center justify-center gap-0.5 rounded-md bg-primary-foreground/20 px-0.5 text-primary-foreground"
                          : "flex h-10 w-full flex-col items-center justify-center gap-0.5 rounded-md border border-primary-foreground/40 px-0.5 text-primary-foreground/90"
                    }
                  >
                    <span className="text-[10px] leading-none opacity-80">
                      {step.step}
                    </span>
                    <span className="max-w-full truncate text-xs font-medium leading-tight">
                      {step.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="rounded-md border border-border bg-card px-2.5 py-1.5">
          <p className="text-xs font-medium text-foreground">
            レビュープロセス {draft.step}/5
          </p>
          <p className="text-xs leading-snug text-muted-foreground">
            実プロセス {stepMeta.process} — {stepMeta.blurb}
          </p>
        </div>

        <CorporateCreedPanel themeLabel={themeLabel} compact />
      </div>

      <div className="flex flex-col gap-4 pt-4">
      {hint ? (
        <p className="text-sm text-muted-foreground" role="status">
          {hint}
        </p>
      ) : null}

      {draft.step === 1 ? (
        <section aria-label="貼付">
          <ReviewStepLayout
            work={
              <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-date">コメント対象の営業日</Label>
            <Input
              id="review-date"
              type="date"
              value={draft.reviewDate}
              onChange={(e) => patch({ reviewDate: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              履歴に残す日付。既定は今日（JST）以前の直近営業日。土日・祝なら直す。
            </p>
          </div>
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
            <p className="text-xs text-muted-foreground">
              投稿本文から自動セットする。違ったらここで直す。
            </p>
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
              onChange={(e) => applyThemeFromSourcePost(e.target.value)}
              placeholder="グループチャットの今日のテーマ投稿を貼る"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lens">観点メモ（要約を厚くする・任意）</Label>
            <Input
              id="lens"
              value={draft.lens}
              onChange={(e) => patch({ lens: e.target.value })}
              placeholder="例: 調べて取り入れた具体を厚く"
            />
            <p className="text-xs text-muted-foreground">
              要約に効く。所感には渡さない。所感の芯はあとでフォーカスに書く。
            </p>
          </div>
          <Button
            className="h-11 w-full"
            onClick={runDraftGenerate}
            disabled={!canGenerate || generating}
          >
            {generating ? "生成中…" : "下書きを出す（AI要約）"}
          </Button>
              </>
            }
            
          />
        </section>
      ) : null}

      {draft.step === 2 ? (
        <section aria-label="要約">
          <ReviewStepLayout
            work={
              <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opener">お礼</Label>
            <Textarea
              id="opener"
              className="min-h-16"
              value={draft.opener}
              onChange={(e) => patch({ opener: e.target.value })}
            />
          </div>
          {summaryCandidates.length > 1 ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                使う要約を選ぶ。選んだモデルで、あとの要点メモもまとめる。
              </p>
              {summaryCandidates.map((c) => (
                <div
                  key={`${c.provider}-${c.model ?? ""}`}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3"
                >
                  <p className="text-xs font-medium">
                    {providerLabel(c.provider, c.model, c.fallbackReason)}
                  </p>
                  <p className="text-sm leading-relaxed">{c.summary}</p>
                  <Button
                    type="button"
                    variant={
                      draft.summary === c.summary ? "default" : "outline"
                    }
                    className="h-11 w-full"
                    onClick={() => adoptSummaryCandidate(c)}
                  >
                    {draft.summary === c.summary ? "採用中" : "これを使う"}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="summary">要約共有（自分の言葉へ）</Label>
            <Textarea
              id="summary"
              className="min-h-40"
              value={draft.summary}
              onChange={(e) => patch({ summary: e.target.value })}
            />
          </div>
          {draft.summary.trim() ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="summary-revise">直し指示（任意）</Label>
              <p className="text-xs text-muted-foreground">
                採用したモデルで直す。定型の枠は維持する。
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  disabled={generating}
                  onClick={() => runSummaryRevise("もう少し厚めに、実践の具体を足して")}
                >
                  厚めに
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  disabled={generating}
                  onClick={() => runSummaryRevise("簡潔に。重複を削って")}
                >
                  簡潔に
                </Button>
              </div>
              <Input
                id="summary-revise"
                value={summaryRevise}
                onChange={(e) => setSummaryRevise(e.target.value)}
                placeholder="例: 調べた行為を前に出す"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-11 w-full"
                disabled={generating || !summaryRevise.trim()}
                onClick={() => runSummaryRevise(summaryRevise)}
              >
                {generating ? "直し中…" : "指示どおり直す"}
              </Button>
            </div>
          ) : null}
          <Button
            className="h-11 w-full"
            onClick={() => {
              patch({
                step: 3,
                keywords: "",
                keywordSuggestions: [],
                linkCandidates: [],
                researchFocus: "",
                researchPagePaste: "",
                researchNeedsPagePaste: false,
                researchPhase: "collect",
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
            要約できた → 検索へ
          </Button>
          <Button variant="outline" className="h-11 w-full" onClick={() => go(1)}>
            戻る
          </Button>
              </>
            }
            
          />
        </section>
      ) : null}

      {draft.step === 3 ? (
        <section aria-label="検索">
          <ReviewStepLayout
            work={
              <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            検索ワードでGoogleを開き、OKな結果を共有→「企業理念リレー」で参照を1本入れる。要点は所感側。
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
          {draft.keywords.trim() ? (
            <p className="text-sm font-medium">
              ♯{draft.keywords.trim()}（共有時のタイトル）
            </p>
          ) : null}
          <Button
            className="h-11 w-full"
            onClick={openGoogleAiMode}
            disabled={!draft.keywords.trim()}
          >
            Googleで調べる
          </Button>
          {draft.linkCandidates.length > 0 ? (
            <ul className="flex flex-col gap-2">
              <li className="text-xs text-muted-foreground">参照（共有で1本）</li>
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
          ) : (
            <p className="text-xs text-muted-foreground">
              まだ参照なし。Googleから共有するとここに1本入る。
            </p>
          )}
          <Button
            className="h-11 w-full"
            onClick={() => {
              if (!canEnterLeaderStep(draft)) {
                setHint("Googleから参照を共有してから所感へ");
                return;
              }
              go(4);
              setHint("本文が取れなければ貼って要点→フォーカス→所感下書き");
            }}
            disabled={!canEnterLeaderStep(draft)}
          >
            所感へ
          </Button>
          <Button variant="outline" className="h-11 w-full" onClick={() => go(2)}>
            戻る
          </Button>
              </>
            }
            
          />
        </section>
      ) : null}

      {draft.step === 4 ? (
        <section aria-label="所感">
          <ReviewStepLayout
            work={
              <>
          {!canEnterLeaderStep(draft) ? (
            <p className="text-sm text-muted-foreground">
              調べるが未完了。戻ってGoogle参照を1本入れて。
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="researchPagePaste">
                  開いたページの本文（任意／取得失敗時）
                </Label>
                <p className="text-xs text-muted-foreground">
                  ページの本文を貼ると要点メモが走る。手直しは下の欄。短すぎると走らない。
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  disabled={generating}
                  onClick={() => void pastePageFromClipboard()}
                >
                  クリップボードから貼る
                </Button>
                <Textarea
                  id="researchPagePaste"
                  className="min-h-28"
                  placeholder="ページからコピーした本文…"
                  value={draft.researchPagePaste}
                  onChange={(e) =>
                    patch({
                      researchPagePaste: e.target.value,
                      researchBrief: "",
                    })
                  }
                  onPaste={(e) => {
                    const inserted = e.clipboardData.getData("text");
                    window.setTimeout(() => {
                      const el = document.getElementById(
                        "researchPagePaste",
                      ) as HTMLTextAreaElement | null;
                      const next = el?.value ?? inserted;
                      if (next.trim().length < PAGE_PASTE_MIN_CHARS) return;
                      runResearchBrief({ pagePaste: next });
                    }, 0);
                  }}
                />
              </div>
              <Button
                className="h-11 w-full"
                variant="secondary"
                onClick={() => runResearchBrief()}
                disabled={generating || selectedLinkCount(draft) === 0}
              >
                {generating ? "生成中…" : "要点メモを出し直す"}
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
              {draft.researchBrief.trim() ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="researchFocus">所感向けフォーカス</Label>
                  <p className="text-xs text-muted-foreground">
                    要点を見たうえで、所感の芯になる一文を書く。
                  </p>
                  <Textarea
                    id="researchFocus"
                    className="min-h-20"
                    value={draft.researchFocus}
                    onChange={(e) => patch({ researchFocus: e.target.value })}
                    placeholder="例: 思考を深化させるアウトプットの3ステップ"
                  />
                </div>
              ) : null}
            </>
          )}
          <Button
            className="h-11 w-full"
            onClick={runLeaderDraft}
            disabled={
              generating ||
              !draft.summary.trim() ||
              !canGenerateLeaderNote(draft)
            }
          >
            {generating
              ? "生成中…"
              : "所感下書きを出す（共感→指針→提案→薄い問い）"}
          </Button>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leader">所感・着想（ここで脚色）</Label>
            <Textarea
              id="leader"
              className="min-h-48"
              value={draft.leaderNote}
              onChange={(e) => patch({ leaderNote: e.target.value })}
            />
            {draft.leaderNote.trim() &&
            textMayMissOpeningKagi(draft.leaderNote) ? (
              <p className="text-xs text-amber-800 dark:text-amber-200">
                鉤括弧の開き「が抜けているかも（」だけある）。文頭に「を足して。
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="closing">締めの呼びかけ（所感に対応）</Label>
            <p className="text-xs text-muted-foreground">
              『ちょっとやってみよう』『そういう考え方もあるんだ』と感じてもらう一文。所感の具体に合わせて提案する。
            </p>
            <Textarea
              id="closing"
              className="min-h-20"
              value={draft.closing}
              onChange={(e) => patch({ closing: e.target.value })}
            />
            {draft.closing.trim() && textMayMissOpeningKagi(draft.closing) ? (
              <p className="text-xs text-amber-800 dark:text-amber-200">
                鉤括弧の開き「が抜けているかも（」だけある）。文頭に「を足して。
              </p>
            ) : null}
            {closingCandidates.length > 1 ? (
              <ul className="flex flex-col gap-2">
                {closingCandidates.map((c) => (
                  <li key={c}>
                    <Button
                      type="button"
                      variant={c === draft.closing ? "secondary" : "outline"}
                      className="h-auto min-h-11 w-full whitespace-normal px-3 py-2 text-left text-sm"
                      onClick={() => patch({ closing: c })}
                    >
                      {c}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              disabled={generating || !draft.leaderNote.trim()}
              onClick={runClosingDraft}
            >
              {generating ? "提案中…" : "本文に合わせた呼びかけを提案"}
            </Button>
          </div>
          <Button
            className="h-11 w-full"
            onClick={enterReadStep}
            disabled={!draft.leaderNote.trim()}
          >
            出力へ
          </Button>
          <Button variant="outline" className="h-11 w-full" onClick={() => go(3)}>
            戻る
          </Button>
              </>
            }
            
          />
        </section>
      ) : null}

      {draft.step === 5 ? (
        <section aria-label="出力">
          <ReviewStepLayout
            work={
              <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-date-final">コメント対象の営業日（履歴）</Label>
            <Input
              id="review-date-final"
              type="date"
              value={draft.reviewDate}
              onChange={(e) => patch({ reviewDate: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="final">投稿用プレビュー（最終編集可）</Label>
            <p className="text-xs text-muted-foreground">
              ここで全文を直せる。コピー・履歴保存はこの内容。
            </p>
            <Textarea
              id="final"
              className="min-h-64 font-mono text-xs"
              value={draft.assembledPost || finalText}
              onChange={(e) => {
                patch({ assembledPost: e.target.value });
                setFinalCheck(null);
              }}
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
                  定型の二重・要約のですね等、機械チェック上の問題なし
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              通読に入ると自動で走る。直し後は「最終チェックを再実行」。
            </p>
          )}
          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={rebuildAssembledFromParts}
          >
            各欄から組み立て直す
          </Button>
          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={() => void runFinalCheck()}
            disabled={generating}
          >
            {generating ? "照合中…" : "最終チェックを再実行"}
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
              </>
            }
            
          />
        </section>
      ) : null}
      </div>
    </div>
  );
}
