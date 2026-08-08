export const REVIEW_DRAFT_STORAGE_KEY = "vdr.review.draft.v1";

export const DEFAULT_OPENER =
  "本日の行動指針への振り返り共有です。";

export const DEFAULT_CLOSING =
  "本日もありがとうございました。";

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
  themeId: string;
  lens: string;
  opener: string;
  /** ④ summary share block */
  summary: string;
  keywords: string;
  linkCandidates: LinkCandidate[];
  /** ⑦ leader note */
  leaderNote: string;
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
    blurb: "投稿を貼り、定型＋要約案を出す",
  },
  {
    step: 2,
    title: "直す",
    process: "④",
    blurb: "自分の言葉に直して要約共有部を完成",
  },
  {
    step: 3,
    title: "調べる",
    process: "⑤⑥",
    blurb: "キーワード→参考リンク候補→採否",
  },
  {
    step: 4,
    title: "所感",
    process: "⑦⑧⑨",
    blurb: "所感・問い＋選んだリンク＋締め",
  },
  {
    step: 5,
    title: "通読→コピー",
    process: "⑩⑪",
    blurb: "1本にまとめて読み返し、投稿用にコピー",
  },
];

export function createEmptyDraft(themeId = ""): ReviewDraft {
  return {
    step: 1,
    sourcePost: "",
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

/** Split post into short shareable points (extractive POC stub). */
export function extractSummaryPoints(sourcePost: string, max = 3): string[] {
  const raw = sourcePost.replace(/\r\n/g, "\n").trim();
  if (!raw) return [];

  const chunks = raw
    .split(/\n+|。|！|？/)
    .map((s) => s.replace(/^[\s・\-–—*]+/, "").trim())
    .filter((s) => s.length >= 8)
    .filter((s) => !/^(本日の|今日の|テーマ|行動指針|ありがとうございます)/.test(s));

  const unique: string[] = [];
  for (const c of chunks) {
    const clipped = c.length > 72 ? `${c.slice(0, 72)}…` : c;
    if (unique.some((u) => u === clipped)) continue;
    unique.push(clipped);
    if (unique.length >= max) break;
  }
  return unique;
}

/**
 * POC stub — 方針は `.claude/skills/drafting-daily-reviews`（output-taste）。
 * 冒頭定型は formatReviewPost 側。後で Gemini ハーネスに差し替え。
 */
export function stubDraftSummary(input: {
  sourcePost: string;
  themeLabel: string;
  lens: string;
  opener?: string;
}): string {
  const theme = input.themeLabel.trim() || "（未選択）";
  const points = extractSummaryPoints(input.sourcePost);
  const bulletBlock =
    points.length > 0
      ? points.map((p) => `・${p}`).join("\n")
      : "・（投稿から要点を拾いきれなかった。原文を見ながら手で足して）";

  const lensBit = input.lens.trim()
    ? `観点「${input.lens.trim()}」ともつながる内容で、`
    : "";

  const praise = `${lensBit}現場の具体が伝わる振り返りです。テーマ「${theme}」への向き合いが共有しやすくまとまっています。`;

  return [
    `【今日のテーマ】${theme}`,
    "",
    "【共有用の要約】",
    bulletBlock,
    "",
    "【ひとこと】",
    praise,
  ].join("\n");
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
      selected: true,
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
}): string {
  const theme = input.themeLabel.trim() || "（未選択）";
  const kw = input.keywords.trim();
  return [
    `今日の振り返りは、テーマ「${theme}」を自分ごとにする好例だと感じました。`,
    kw
      ? `「${kw}」を手がかりに、明日の自分の一言を一つだけ決めてみるとよさそうです。`
      : "明日の現場で試す一言を、一つだけ決めてみるとよさそうです。",
    "",
    "問い: いまの自分の一言は、誰の何を楽にするか？",
  ].join("\n");
}

export function formatReviewPost(draft: ReviewDraft): string {
  const links = draft.linkCandidates
    .filter((l) => l.selected)
    .map((l) => `#${l.title}\n${l.url}`)
    .join("\n\n");

  return [
    draft.opener.trim() || DEFAULT_OPENER,
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
    return JSON.parse(raw) as ReviewDraft;
  } catch {
    return null;
  }
}

export function saveReviewDraft(draft: ReviewDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REVIEW_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}
