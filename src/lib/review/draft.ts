import { extractSummaryPoints } from "@/lib/review/draft-extract";
import { generateSummaryStub } from "@/lib/review/providers/summary";
import { formatThanks } from "@/lib/review/thanks";

export { extractSummaryPoints } from "@/lib/review/draft-extract";
export { formatThanks } from "@/lib/review/thanks";
export {
  summaryPrefix,
  themeOrdinal,
  valueHeadingForLabel,
} from "@/lib/review/theme-meta";

export const REVIEW_DRAFT_STORAGE_KEY = "vdr.review.draft.v2";

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
};

export type ReviewDraft = {
  step: ReviewStep;
  /** ① paste from group chat */
  sourcePost: string;
  /** 呼び名（お礼用） */
  presenterName: string;
  themeId: string;
  lens: string;
  /** 1 お礼 */
  opener: string;
  /** 2 要約共有 */
  summary: string;
  keywords: string;
  linkCandidates: LinkCandidate[];
  /** 3 所感・着想 */
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
    blurb: "キーワード→参考リンク候補→採否（任意）",
  },
  {
    step: 4,
    title: "所感",
    process: "⑦⑧⑨",
    blurb: "所感・着想＋締め（リンクは採択分）",
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
    keywords: "",
    linkCandidates: [],
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

/** POC stub search — replace with in-app Gemini grounding later. */
export function stubSearchLinks(keywords: string): LinkCandidate[] {
  const q = keywords.trim() || "行動指針";
  const enc = encodeURIComponent(q);
  return [
    {
      id: "stub-1",
      title: `${q}とは`,
      url: `https://www.google.com/search?q=${enc}`,
      selected: false,
    },
    {
      id: "stub-2",
      title: `${q} 事例`,
      url: `https://www.google.com/search?q=${enc}+事例`,
      selected: false,
    },
    {
      id: "stub-3",
      title: `${q} とは わかりやすく`,
      url: `https://www.google.com/search?q=${enc}+わかりやすく`,
      selected: false,
    },
  ];
}

export function stubLeaderNote(input: {
  themeLabel: string;
  keywords: string;
  lens: string;
  sourcePost: string;
}): string {
  const points = extractSummaryPoints(input.sourcePost, 2);
  const hook =
    input.lens.trim() ||
    input.keywords.trim() ||
    (points[0] ? points[0].slice(0, 40) : "");

  return [
    hook
      ? `「${hook}」を自分の仕事に引きつけて実践した点が、チームの今日の一歩につながると感じます。`
      : `今日の振り返り実践が、チームの理念浸透の一歩になっていると感じます。`,
    "明日も一言だけ決めて動けると、リレーが続きそうです。",
  ].join("\n");
}

/** 構成順: お礼 → 要約 → 所感 → 任意♯リンク → 締め */
export function formatReviewPost(draft: ReviewDraft): string {
  const links = draft.linkCandidates
    .filter((l) => l.selected)
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
