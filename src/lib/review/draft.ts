import { generateLeaderStub } from "@/lib/review/providers/leader";
import { generateSummaryStub } from "@/lib/review/providers/summary";
import { looksLikeUrlInaccessible } from "@/lib/review/providers/research-brief";
import { repairDuplicatedGuidelinePhrase, repairMissingOpeningKagi } from "@/lib/review/final-check";
import { formatThanks } from "@/lib/review/thanks";
import { DEFAULT_CLOSING } from "@/lib/review/closing";
import { defaultReviewDateYmd } from "@/lib/rotation/business-days";

export { extractSummaryPoints } from "@/lib/review/draft-extract";
export { formatThanks } from "@/lib/review/thanks";
export { stubSearchLinks } from "@/lib/review/search-stub";
export {
  summaryPrefix,
  themeOrdinal,
  valueHeadingForLabel,
} from "@/lib/review/theme-meta";
export {
  CLOSING_VARIATIONS,
  DEFAULT_CLOSING,
  pickClosingVariation,
} from "@/lib/review/closing";

export const REVIEW_DRAFT_STORAGE_KEY = "vdr.review.draft.v8";

/** Fallback only — real opener is formatThanks(presenterName). */
export const DEFAULT_OPENER =
  "（お名前）さん、振り返りコメント共有頂きありがとうございます！";

export type ReviewStep = 1 | 2 | 3 | 4 | 5;

/** 調べるステップ内の段階（A: 貼り返し → 要点） */
export type ResearchPhase = "collect" | "brief";

export type LinkCandidate = {
  id: string;
  title: string;
  url: string;
  selected: boolean;
  snippet?: string;
};

export type ReviewDraft = {
  step: ReviewStep;
  /** コメント対象の営業日 YYYY-MM-DD（履歴 review_date） */
  reviewDate: string;
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
  /**
   * 開いた参照ページの本文貼付（取得失敗時に出す）。
   * 要点メモはここ＋フォーカスから AI が作る。
   */
  researchPagePaste: string;
  /** URL本文取得失敗 → 貼付欄を出す */
  researchNeedsPagePaste: boolean;
  /** 調べる内段階: collect=貼り返し / brief=要点 */
  researchPhase: ResearchPhase;
  /** 調べた要点メモ */
  researchBrief: string;
  /** 4 所感・着想 */
  leaderNote: string;
  /** 5 締め */
  closing: string;
  /**
   * 通読ステップで手直しした投稿全文。
   * 空のときは formatReviewPost で組み立て。
   */
  assembledPost: string;
};

export const REVIEW_STEPS: {
  step: ReviewStep;
  title: string;
  process: string;
  blurb: string;
}[] = [
  {
    step: 1,
    title: "貼付",
    process: "②③",
    blurb: "対象営業日・投稿・呼び名を入れ、お礼＋要約案を出す（API／Gemini）",
  },
  {
    step: 2,
    title: "要約",
    process: "④",
    blurb: "お礼と要約共有を自分の言葉に直す",
  },
  {
    step: 3,
    title: "検索",
    process: "⑤⑥",
    blurb: "検索→共有でGoogle URLを1本入れる",
  },
  {
    step: 4,
    title: "所感",
    process: "⑦⑧⑨",
    blurb: "本文貼付→要点→フォーカス→所感下書き→脚色＋締め",
  },
  {
    step: 5,
    title: "出力",
    process: "⑩⑪",
    blurb: "構成どおり1本にまとめて最終編集→コピー",
  },
];

export function createEmptyDraft(themeId = ""): ReviewDraft {
  return {
    step: 1,
    reviewDate: defaultReviewDateYmd(),
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
    researchPagePaste: "",
    researchNeedsPagePaste: false,
    researchPhase: "collect",
    researchBrief: "",
    leaderNote: "",
    closing: DEFAULT_CLOSING,
    assembledPost: "",
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

/** 調べる完了 → 所感ステップへ（参照が1本あればよい） */
export function canEnterLeaderStep(draft: ReviewDraft): boolean {
  return selectedLinkCount(draft) > 0;
}

/** 所感下書き生成（要点＋フォーカスが揃ってから） */
export function canGenerateLeaderNote(draft: ReviewDraft): boolean {
  const brief = draft.researchBrief.trim();
  return (
    canEnterLeaderStep(draft) &&
    Boolean(brief) &&
    !looksLikeUrlInaccessible(brief) &&
    Boolean(draft.researchFocus.trim())
  );
}

/** 構成順: お礼 → 要約 → 所感 → 任意♯リンク → 締め（各ブロック間は空行） */
export function formatReviewPost(draft: ReviewDraft): string {
  const links = draft.linkCandidates
    .filter((l) => l.selected && l.url.trim())
    .map((l) => `♯${l.title}\n${l.url}`)
    .join("\n\n");

  const summary = repairDuplicatedGuidelinePhrase(draft.summary.trim());
  const leader = repairMissingOpeningKagi(draft.leaderNote.trim());
  const closing = repairMissingOpeningKagi(
    draft.closing.trim() || DEFAULT_CLOSING,
  );

  const blocks = [
    draft.opener.trim() || formatThanks(draft.presenterName),
    summary,
    leader,
    links,
    closing,
  ].filter((b) => Boolean(b));

  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** 通読前: 所感・締めの開き「抜けを直した下書き */
export function withRepairedKagiQuotes(draft: ReviewDraft): ReviewDraft {
  return {
    ...draft,
    leaderNote: repairMissingOpeningKagi(draft.leaderNote),
    closing: repairMissingOpeningKagi(draft.closing),
  };
}

/** 通読用: 手直し全文があればそれ、なければ組み立て */
export function resolveAssembledPost(draft: ReviewDraft): string {
  const edited = draft.assembledPost.trim();
  return edited || formatReviewPost(draft);
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
      reviewDate:
        typeof parsed.reviewDate === "string" && parsed.reviewDate.trim()
          ? parsed.reviewDate.slice(0, 10)
          : defaultReviewDateYmd(),
      presenterName: parsed.presenterName ?? "",
      researchFocus: parsed.researchFocus ?? "",
      researchPagePaste: parsed.researchPagePaste ?? "",
      researchNeedsPagePaste: Boolean(parsed.researchNeedsPagePaste),
      researchPhase:
        parsed.researchPhase === "brief" ? "brief" : "collect",
      researchBrief: parsed.researchBrief ?? "",
      keywordSuggestions: parsed.keywordSuggestions ?? [],
      assembledPost: parsed.assembledPost ?? "",
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
