import { generateLeaderStub } from "@/lib/review/providers/leader";
import { generateSummaryStub } from "@/lib/review/providers/summary";
import { formatThanks } from "@/lib/review/thanks";

export { extractSummaryPoints } from "@/lib/review/draft-extract";
export { formatThanks } from "@/lib/review/thanks";
export { stubSearchLinks } from "@/lib/review/search-stub";
export {
  summaryPrefix,
  themeOrdinal,
  valueHeadingForLabel,
} from "@/lib/review/theme-meta";

export const REVIEW_DRAFT_STORAGE_KEY = "vdr.review.draft.v4";

/** Fallback only — real opener is formatThanks(presenterName). */
export const DEFAULT_OPENER =
  "（お名前）さん、振り返りコメント共有頂きありがとうございます";

export const DEFAULT_CLOSING = "皆さんと一緒にやっていきましょう。";

export type ReviewStep = 1 | 2 | 3 | 4 | 5;

export type LinkCandidate = {
  id: string;
  title: string;
  url: string;
  selected: boolean;
  snippet?: string;
};

export type ReviewDraft = {
  step: ReviewStep;
  /** ① paste from group chat */
  sourcePost: string;
  /** 呼び名（お礼用） */
  presenterName: string;
  themeId: string;
  /** 要約前の薄い観点（任意） */
  lens: string;
  /** 1 お礼 */
  opener: string;
  /** 2 要約共有 */
  summary: string;
  /** 検索ワード候補（約3） */
  keywordSuggestions: string[];
  /** 実際に使う検索ワード（候補選択 or 手入力） */
  keywords: string;
  linkCandidates: LinkCandidate[];
  /** 採択後・所感向けフォーカス指示（ハーネス） */
  researchFocus: string;
  /** 調べた要点メモ */
  researchBrief: string;
  /** 4 所感・着想 */
  leaderNote: string;
  /** 5 締め */
  closing: string;
};

export const REVIEW_STEPS: {
  step: ReviewStep;
  title: string;
  process: string;
  blurb: string;
}[] = [
  {
    step: 1,
    title: "下書き",
    process: "②③",
    blurb: "投稿・呼び名を入れ、お礼＋要約案を出す（API／Gemini）",
  },
  {
    step: 2,
    title: "直す",
    process: "④",
    blurb: "お礼と要約共有を自分の言葉に直す",
  },
  {
    step: 3,
    title: "調べる",
    process: "⑤⑥",
    blurb: "Googleで調べ→参照を貼り返す→フォーカス→要点（所感の前）",
  },
  {
    step: 4,
    title: "所感",
    process: "⑦⑧⑨",
    blurb: "貼り返した参照を見て所感下書き→自分のエッセンスに脚色＋締め",
  },
  {
    step: 5,
    title: "通読→コピー",
    process: "⑩⑪",
    blurb: "構成どおり1本にまとめてコピー",
  },
];

export function createEmptyDraft(themeId = ""): ReviewDraft {
  return {
    step: 1,
    sourcePost: "",
    presenterName: "",
    themeId,
    lens: "",
    opener: DEFAULT_OPENER,
    summary: "",
    keywordSuggestions: [],
    keywords: "",
    linkCandidates: [],
    researchFocus: "",
    researchBrief: "",
    leaderNote: "",
    closing: DEFAULT_CLOSING,
  };
}

/**
 * @deprecated クライアント直呼び用の退避。本線は POST /api/review/draft
 */
export function stubDraftSummary(input: {
  sourcePost: string;
  themeLabel: string;
  lens: string;
}): string {
  return generateSummaryStub(input).summary;
}

export function stubLeaderNote(input: {
  themeLabel: string;
  keywords: string;
  lens: string;
  sourcePost: string;
  summary?: string;
  selectedLinkTitles?: string[];
  researchFocus?: string;
  researchBrief?: string;
}): string {
  return generateLeaderStub({
    themeLabel: input.themeLabel,
    keywords: input.keywords,
    lens: input.lens,
    sourcePost: input.sourcePost,
    summary: input.summary ?? "",
    selectedLinkTitles: input.selectedLinkTitles ?? [],
    researchFocus: input.researchFocus ?? "",
    researchBrief: input.researchBrief ?? "",
  }).leaderNote;
}

export function selectedLinkCount(draft: ReviewDraft): number {
  return draft.linkCandidates.length;
}

export function canEnterLeaderStep(draft: ReviewDraft): boolean {
  return (
    selectedLinkCount(draft) > 0 &&
    Boolean(draft.researchFocus.trim()) &&
    Boolean(draft.researchBrief.trim())
  );
}

/** 構成順: お礼 → 要約 → 所感 → 任意♯リンク → 締め */
export function formatReviewPost(draft: ReviewDraft): string {
  const links = draft.linkCandidates
    .map((l) => `♯${l.title}\n${l.url}`)
    .join("\n\n");

  return [
    draft.opener.trim() || formatThanks(draft.presenterName),
    "",
    draft.summary.trim(),
    "",
    draft.leaderNote.trim(),
    links ? `\n${links}` : "",
    "",
    draft.closing.trim() || DEFAULT_CLOSING,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function loadReviewDraft(): ReviewDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REVIEW_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReviewDraft>;
    return {
      ...createEmptyDraft(parsed.themeId ?? ""),
      ...parsed,
      presenterName: parsed.presenterName ?? "",
      researchFocus: parsed.researchFocus ?? "",
      researchBrief: parsed.researchBrief ?? "",
      keywordSuggestions: parsed.keywordSuggestions ?? [],
      step: parsed.step ?? 1,
    };
  } catch {
    return null;
  }
}

export function saveReviewDraft(draft: ReviewDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REVIEW_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}
