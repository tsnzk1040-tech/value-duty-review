import type { AppSettings } from "@/lib/settings/types";
import { themeCodeFromLabel } from "@/lib/rotation/format-notebook";
import { stripThemeLabelFromText } from "@/lib/review/theme-meta";

export type ReviewHistoryLink = {
  title: string;
  url: string;
};

export type ReviewHistoryRecord = {
  id: string;
  createdAt: string;
  reviewDate: string;
  presenterName: string;
  themeId: string;
  themeLabel: string;
  sourcePost: string;
  opener: string;
  summary: string;
  leaderNote: string;
  closing: string;
  links: ReviewHistoryLink[];
  fullText: string;
  keywords: string;
  researchBrief: string;
};

export type SaveReviewHistoryInput = {
  presenterName: string;
  themeId: string;
  themeLabel: string;
  sourcePost: string;
  opener: string;
  summary: string;
  leaderNote: string;
  closing: string;
  links: ReviewHistoryLink[];
  fullText: string;
  keywords?: string;
  researchBrief?: string;
  reviewDate?: string;
};

export const HISTORY_STORAGE_KEY = "vdr.review.history.v1";

/**
 * 画面・プロンプト用の投稿全文。
 * キーは変えない。起動・履歴確認は既存LSを読むだけで書き戻さない。
 * fullText が空の古い形だけ、保存済みパーツから組む。
 */
export function reviewHistoryPostedText(item: ReviewHistoryRecord): string {
  const stored = item.fullText?.trim();
  if (stored) return stored;
  const links = (item.links ?? [])
    .filter((link) => link.url?.trim())
    .map((link) => `♯${link.title}\n${link.url}`)
    .join("\n\n");
  return [item.opener, item.summary, item.leaderNote, links, item.closing]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

/** 残す件数の目安＝各テーマ 今回＋前回（カタログ件数×2）。ローテ人数ではない。 */
export function reviewHistoryKeepCount(settings: AppSettings): number {
  const themeCount = settings.valueItems.length;
  if (themeCount > 0) return themeCount * 2;
  const active = settings.members.filter((m) => m.active !== false).length;
  return Math.max(active * 2, 1);
}

/**
 * 日付の新しい順で、同じ行動指針は最大 `perTheme` 件。
 * 2＝周の途中の保険（今回＋前回）。1＝6-④で1周閉じたあと（当該周だけ残し前回周を外す）。
 * 起動・履歴確認では呼ばない（既存LSを読むだけ）。
 */
export function retainThemeLaps(
  items: ReviewHistoryRecord[],
  perTheme: 1 | 2,
): ReviewHistoryRecord[] {
  const cap = perTheme < 1 ? 1 : perTheme;
  const sorted = items.slice().sort((a, b) => {
    const byDate = b.reviewDate.localeCompare(a.reviewDate);
    if (byDate !== 0) return byDate;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
  const counts = new Map<string, number>();
  const kept: ReviewHistoryRecord[] = [];
  for (const item of sorted) {
    const key = item.themeId.trim() || "__none__";
    const n = counts.get(key) ?? 0;
    if (n >= cap) continue;
    kept.push(item);
    counts.set(key, n + 1);
  }
  return kept.sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));
}

/** カタログ末尾（既定は 6-④）の記録＝テーマ1周の閉じ。 */
export function isThemeLapEnd(
  themeId: string,
  themeLabel: string,
  valueItems: { id: string; label: string }[],
): boolean {
  const last = valueItems[valueItems.length - 1];
  if (!last) return false;
  if (themeId.trim() && themeId.trim() === last.id) return true;
  const got = themeCodeFromLabel(themeLabel);
  const end = themeCodeFromLabel(last.label);
  return Boolean(got) && got === end;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readAll(): ReviewHistoryRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReviewHistoryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(items: ReviewHistoryRecord[], perTheme: 1 | 2) {
  if (!isBrowser()) return;
  const next = retainThemeLaps(items, perTheme);
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
}

export function saveReviewHistory(
  input: SaveReviewHistoryInput,
  valueItems: { id: string; label: string }[],
): { record: ReviewHistoryRecord; closedThemeLap: boolean } {
  const reviewDate =
    input.reviewDate?.slice(0, 10) ||
    new Date().toISOString().slice(0, 10);
  const record: ReviewHistoryRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    reviewDate,
    presenterName: input.presenterName.trim(),
    themeId: input.themeId.trim(),
    themeLabel: input.themeLabel.trim(),
    sourcePost: input.sourcePost,
    opener: input.opener,
    summary: input.summary,
    leaderNote: input.leaderNote,
    closing: input.closing,
    links: input.links ?? [],
    fullText: input.fullText,
    keywords: input.keywords?.trim() ?? "",
    researchBrief: input.researchBrief?.trim() ?? "",
  };
  const next = readAll().filter((item) => item.reviewDate !== reviewDate);
  next.unshift(record);
  const closedThemeLap = isThemeLapEnd(
    record.themeId,
    record.themeLabel,
    valueItems,
  );
  persist(next, closedThemeLap ? 1 : 2);
  return { record, closedThemeLap };
}

export function listStoredReviews(): ReviewHistoryRecord[] {
  return readAll()
    .slice()
    .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));
}

export function exportReviewHistoryJson(): string {
  return `${JSON.stringify(listStoredReviews(), null, 2)}\n`;
}

function asHistoryLink(raw: unknown): ReviewHistoryLink | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { title?: unknown; url?: unknown };
  if (typeof o.url !== "string" || !o.url.trim()) return null;
  return {
    title: typeof o.title === "string" ? o.title : "",
    url: o.url,
  };
}

function asHistoryRecord(raw: unknown): ReviewHistoryRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<ReviewHistoryRecord>;
  if (typeof o.reviewDate !== "string" || !o.reviewDate.trim()) return null;
  const links = Array.isArray(o.links)
    ? o.links.map(asHistoryLink).filter((link): link is ReviewHistoryLink => Boolean(link))
    : [];
  return {
    id: typeof o.id === "string" && o.id.trim() ? o.id : crypto.randomUUID(),
    createdAt:
      typeof o.createdAt === "string" && o.createdAt.trim()
        ? o.createdAt
        : new Date().toISOString(),
    reviewDate: o.reviewDate.slice(0, 10),
    presenterName: typeof o.presenterName === "string" ? o.presenterName : "",
    themeId: typeof o.themeId === "string" ? o.themeId : "",
    themeLabel: typeof o.themeLabel === "string" ? o.themeLabel : "",
    sourcePost: typeof o.sourcePost === "string" ? o.sourcePost : "",
    opener: typeof o.opener === "string" ? o.opener : "",
    summary: typeof o.summary === "string" ? o.summary : "",
    leaderNote: typeof o.leaderNote === "string" ? o.leaderNote : "",
    closing: typeof o.closing === "string" ? o.closing : "",
    links,
    fullText: typeof o.fullText === "string" ? o.fullText : "",
    keywords: typeof o.keywords === "string" ? o.keywords : "",
    researchBrief: typeof o.researchBrief === "string" ? o.researchBrief : "",
  };
}

export function parseReviewHistoryJson(text: string): ReviewHistoryRecord[] {
  const parsed = JSON.parse(text) as unknown;
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { records?: unknown }).records)
      ? (parsed as { records: unknown[] }).records
      : null;
  if (!rows) {
    throw new Error("履歴JSONの形が不正です");
  }
  const records = rows
    .map(asHistoryRecord)
    .filter((item): item is ReviewHistoryRecord => Boolean(item));
  if (records.length === 0) {
    throw new Error("履歴が1件も読めなかった");
  }
  return records;
}

/** 同じ営業日は取り込み側で上書き。各テーマは今回＋前回を残す（1-①追加でも前回の1-②〜6-④は残る）。 */
export function importReviewHistory(text: string): number {
  const incoming = parseReviewHistoryJson(text);
  const byDate = new Map<string, ReviewHistoryRecord>();
  for (const item of listStoredReviews()) {
    byDate.set(item.reviewDate, item);
  }
  for (const item of incoming) {
    byDate.set(item.reviewDate, item);
  }
  persist([...byDate.values()], 2);
  return incoming.length;
}

export function listRecentReviews(
  limit: number,
): ReviewHistoryRecord[] {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  return readAll()
    .slice()
    .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate))
    .slice(0, safeLimit);
}

export function listRelatedReviews(input: {
  themeId?: string;
  presenterName?: string;
  limit?: number;
  match?: "or" | "and";
}): ReviewHistoryRecord[] {
  const safeLimit = Math.min(Math.max(input.limit ?? 10, 1), 200);
  const themeId = input.themeId?.trim() ?? "";
  const presenterName = input.presenterName?.trim() ?? "";
  const matchAnd = input.match === "and";
  const all = readAll()
    .slice()
    .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));

  if (!themeId && !presenterName) {
    return all.slice(0, safeLimit);
  }

  return all
    .filter((item) => {
      const themeOk = themeId ? item.themeId === themeId : false;
      const presenterOk = presenterName
        ? item.presenterName === presenterName
        : false;
      if (themeId && presenterName) {
        return matchAnd ? themeOk && presenterOk : themeOk || presenterOk;
      }
      if (themeId) return themeOk;
      return presenterOk;
    })
    .slice(0, safeLimit);
}

export function formatHistoryForPrompt(
  items: ReviewHistoryRecord[],
  opts?: {
    maxItems?: number;
    maxSummaryChars?: number;
    maxCommentChars?: number;
  },
): string {
  const maxItems = opts?.maxItems ?? 3;
  const maxSummaryChars = opts?.maxSummaryChars ?? 120;
  const maxCommentChars = opts?.maxCommentChars ?? 0;
  const slice = items.slice(0, maxItems);
  if (!slice.length) return "";

  return slice
    .map((item, i) => {
      const mid = extractSummaryMidBody(item.summary, item.themeLabel).slice(
        0,
        maxSummaryChars,
      );
      const note = item.leaderNote.trim().slice(0, 80);
      const source = item.sourcePost.replace(/\s+/g, " ").trim().slice(0, 80);
      const comment =
        maxCommentChars > 0
          ? reviewHistoryPostedText(item)
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, maxCommentChars)
          : "";
      return [
        `${i + 1}. ${item.reviewDate} · ${item.presenterName}` +
          (item.themeLabel ? ` · ${item.themeLabel}` : ""),
        mid ? `   要約要旨: ${mid}` : "",
        comment
          ? `   同テーマ前回のコメント: ${comment}`
          : note
            ? `   所感要旨: ${note}`
            : "",
        source ? `   投稿抜粋: ${source}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
}

/** 呼び名を『〇〇さん』形に揃える（重複さん防止）。 */
export function presenterCallName(name: string): string {
  const raw = name.trim().replace(/\s+/g, "");
  if (!raw) return "（名前不明）さん";
  if (/さん$/.test(raw)) return raw;
  return `${raw}さん`;
}

/** valueItem id（v4-3）→ 行動指針コード（4-③）。 */
export function themeCodeFromValueItemId(themeId: string): string {
  const m = themeId.trim().match(/^v(\d+)-(\d+)$/i);
  if (!m) return "";
  const circled = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"] as const;
  const n = Number(m[2]);
  if (n < 1 || n > 10) return "";
  return `${Number(m[1])}-${circled[n]}`;
}

function lookupThemeCodes(themeId: string, themeLabel: string): string[] {
  const codes = new Set<string>();
  const add = (c: string) => {
    const t = c.trim();
    if (t && /^\d+-[①-⑩]/.test(t)) codes.add(themeCodeFromLabel(t));
  };
  add(themeLabel);
  add(themeCodeFromValueItemId(themeId));
  add(themeId);
  return [...codes];
}

/** 定型枠だけ外す（テーマ文言の除去はしない）。 */
function stripSummaryFrame(summary: string): string {
  return summary
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/^Value[０-９0-9ivxlcdmIVXLCDM]*[\s\S]*?行動指針について[、,]/u, "")
    .replace(/^[\s\S]*?の(?:\d+|当該)番目の行動指針について[、,]/u, "")
    .replace(/想いを共有頂きました[。．！!]?$/u, "")
    .replace(/[　\s]+/g, " ")
    .trim();
}

/** 要約から定型枠を外した「あいだ」本文。 */
export function extractSummaryMidBody(
  summary: string,
  themeLabel = "",
): string {
  let mid = stripSummaryFrame(summary);
  mid = stripThemeLabelFromText(mid, themeLabel);
  mid = mid
    .replace(/^Value[０-９0-9][^\s、。]{0,20}\s*/u, "")
    .replace(/[　\s]+/g, " ")
    .trim();
  return mid;
}

function bareThemeText(themeLabel: string): string {
  return themeLabel
    .replace(/^\d+\s*[-－]\s*[①-⑩]\s*/u, "")
    .replace(/[「」『』"']/g, "")
    .replace(/[　\s]+/g, "")
    .trim();
}

/** テーマラベル全文と実質同じだけ、を弾く。 */
function isOnlyThemeLabel(text: string, themeLabel: string): boolean {
  const bare = bareThemeText(themeLabel);
  const compact = text.replace(/[「」『』"'\s　、。．！？]/g, "").trim();
  if (!bare || compact.length < 4) return false;
  if (compact === bare) return true;
  if (bare.includes(compact) && compact.length >= Math.min(10, bare.length)) {
    return true;
  }
  return false;
}

/** 要約あいだを一言に圧縮。 */
function condenseToOneLiner(text: string, maxChars: number): string {
  let t = text.replace(/[「」『』]/g, "").trim();
  t = t
    .replace(/^(そして|また|なお|ただ)[、,]?/u, "")
    .replace(/という(実践|気づき|想い).*$/u, "")
    .replace(/[、,。．！？]+$/u, "")
    .trim();
  if (t.length < 6) return "";
  if (t.length <= maxChars) return t;

  const window = t.slice(0, maxChars);
  const cut = Math.max(window.lastIndexOf("、"), window.lastIndexOf("・"));
  if (cut >= Math.floor(maxChars * 0.35)) {
    const clipped = window.slice(0, cut).trim();
    if (clipped.length >= 6) return clipped;
  }
  for (let i = Math.min(maxChars, t.length); i >= Math.floor(maxChars * 0.45); i -= 1) {
    if (/[たているうくすつぬぶむよろをん]$/u.test(t.slice(0, i))) {
      return t.slice(0, i).trim();
    }
  }
  return window.replace(/[、,\s　]+$/u, "").trim();
}

function scorePracticeCue(sentence: string): number {
  let score = 1;
  if (/試してみ|やってみた|実践|取り組|意識して|取り入れ/.test(sentence)) score += 10;
  if (/調べ|検索|意味を|定義を|捉えて/.test(sentence)) score += 8;
  if (/してみ|していて|考え|置|先に|聞き|期限|曖昧|一次|確認/.test(sentence)) {
    score += 5;
  }
  if (/ありがとう|振り返りコメント|共有頂き|想いを共有|行動指針について|企業理念/.test(sentence)) {
    return -100;
  }
  if (sentence.length >= 12 && sentence.length <= 56) score += 3;
  return score;
}

function pickOneLinerFromText(
  text: string,
  themeLabel: string,
  maxChars: number,
): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length < 6) return "";
  if (isOnlyThemeLabel(cleaned, themeLabel)) return "";

  const parts = cleaned
    .split(/[。．！？\n]/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 6 && !isOnlyThemeLabel(p, themeLabel));

  const ranked = (parts.length ? parts : [cleaned])
    .map((part) => ({ part, score: scorePracticeCue(part) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const row of ranked) {
    const q = condenseToOneLiner(row.part, maxChars);
    if (q.length >= 6 && !isOnlyThemeLabel(q, themeLabel)) return q;
  }

  const q = condenseToOneLiner(cleaned, maxChars);
  if (q.length >= 6 && !isOnlyThemeLabel(q, themeLabel)) return q;
  return "";
}

/**
 * 所感②用の核。前回レビューの**要約あいだ**を一言にしたもの。
 * 取れなければ投稿の具体を退避。理念テーマ文言だけは使わない。
 */
export function extractSameThemeQuoteCore(
  item: ReviewHistoryRecord,
  maxChars = 56,
): string {
  const themeLabel = item.themeLabel ?? "";

  const mid = extractSummaryMidBody(item.summary ?? "", themeLabel);
  const fromMid = pickOneLinerFromText(mid, themeLabel, maxChars);
  if (fromMid) return fromMid;

  const framed = stripSummaryFrame(item.summary ?? "");
  const fromFramed = pickOneLinerFromText(framed, themeLabel, maxChars);
  if (fromFramed) return fromFramed;

  const source = (item.sourcePost ?? "").replace(/\s+/g, " ").trim();
  return pickOneLinerFromText(source, themeLabel, maxChars);
}

/**
 * 前回一言を今日につなげてよいか。
 * 同テーマ候補に乗っている前提で、中身のある一言なら通じるとみなす
 * （字面の完全一致は求めない。同テーマ実践同士は通じるのが既定）。
 */
export function sameThemeQuoteConnectsWithToday(
  quote: string,
  todaySummary: string,
  todaySourcePost: string,
  themeLabel = "",
): boolean {
  const q = quote.replace(/[「」『』]/g, "").trim();
  if (q.length < 6) return false;
  if (isOnlyThemeLabel(q, themeLabel)) return false;

  const today = [
    extractSummaryMidBody(todaySummary, themeLabel),
    stripSummaryFrame(todaySummary),
    todaySourcePost.replace(/\s+/g, " ").trim(),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  // 今日側がまだほぼ空（要約前など）でも、同テーマ一言は出してよい
  if (today.length < 6) return true;

  // 今日側がテーマ文言だけなら、引用しても会話にならないので止める
  if (isOnlyThemeLabel(today, themeLabel)) return false;

  return true;
}

/** 通じる前提の末尾プール（A/B/D/E/F/G/H/J）。 */
export const SAME_THEME_ENDING_POOL = [
  "と通じるものがありますね。", // A
  "と、今日の話と重なりますね。", // B
  "を思い出しますね。", // D
  "とつながる感じがします。", // E
  "と、投稿していました。", // F
  "と触れていました。", // G
  "という実践がありました。", // H
  "とまとめていました。", // J
] as const;

const SAME_THEME_STEM_RE =
  /^(同テーマ前回の.+?の(?:要約|投稿)では、「[^」]+」)/u;

/** 固定文から幹（「……」まで）を取る。末尾は含めない。 */
export function sameThemeFixedStem(fixedOrStem: string): string {
  const t = fixedOrStem.trim();
  if (!t) return "";
  const m = t.match(SAME_THEME_STEM_RE);
  if (m) return m[1]!;
  if (/」$/u.test(t) && t.includes("同テーマ前回の")) return t;
  return t;
}

function endingPoolForSource(fromSummary: boolean): readonly string[] {
  if (fromSummary) return SAME_THEME_ENDING_POOL;
  return SAME_THEME_ENDING_POOL.filter((e) => e !== "とまとめていました。");
}

/**
 * 所感①の直後／②のあとに置いたときのまとまり点。
 * 高い候補の中からランダムに選ぶ。
 */
export function scoreSameThemeEndingFit(
  before: string,
  after: string,
  ending: string,
): number {
  let score = 0;
  const ctx = `${before}\n${after}`;
  const afterTrim = after.replace(/\s+/g, " ").trim();
  const beforeTrim = before.replace(/\s+/g, " ").trim();

  // 所感の「ですね」トーン → ね系末尾
  if (/ですね|ますね|いいですね/.test(ctx) && /ね[。．]?$/u.test(ending)) score += 2;
  // あとに「こうしたら？」提案 → 観察系（ました）もね系も可
  if (/どうでしょう|してみたら|したらどう|チームの型/.test(afterTrim)) {
    if (/ました[。．]?$/u.test(ending)) score += 2;
    if (/ね[。．]?$/u.test(ending)) score += 1;
  }
  // 続きが「通じ／つなが／重な／同じ」系 → ブリッジ末尾
  if (/通じ|つなが|重な|同じ|前回|続き/.test(afterTrim)) {
    if (/通じ|重な|つなが|思い出し/.test(ending)) score += 3;
  }
  if (/実践|取り組|やってみた|試して/.test(afterTrim) && /実践がありました/.test(ending)) {
    score += 2;
  }
  if (/まとめ|要約|要点/.test(ctx) && /まとめていました/.test(ending)) score += 2;
  if (/共有|触れ|書いて/.test(beforeTrim) && /投稿していました|触れていました/.test(ending)) {
    score += 1;
  }
  // 直前がすでに「ました。」なら、ました系を少し避ける
  if (/ました[。．]?$/u.test(beforeTrim) && /ました[。．]?$/u.test(ending)) score -= 1;
  // 引用が具体的なら「思い出します」も自然
  if (/思い出し/.test(ending) && beforeTrim.length >= 20) score += 1;
  // デフォルトの底上げ（ゼロ点ばかりにしない）
  score += 1;
  return score;
}

/** 前後文とのまとまりが良い末尾を、同点上位からランダム選択。 */
export function pickSameThemeEndingForContext(
  before: string,
  after: string,
  fromSummary: boolean,
): string {
  const pool = endingPoolForSource(fromSummary);
  const scored = pool.map((ending) => ({
    ending,
    score: scoreSameThemeEndingFit(before, after, ending),
  }));
  const max = Math.max(...scored.map((row) => row.score));
  const threshold = max > 1 ? max - 1 : max;
  const top = scored.filter((row) => row.score >= threshold);
  const i = Math.floor(Math.random() * top.length);
  return top[i]!.ending;
}

/**
 * 所感②用の固定文幹。末尾は所感生成後に前後のまとまりで選ぶ。
 * 返す形: `同テーマ前回の〇〇さんの要約では、「……」`
 */
export function buildSameThemeFixedSentence(
  item: ReviewHistoryRecord,
  opts?: {
    todaySummary?: string;
    todaySourcePost?: string;
    themeLabel?: string;
  },
): string {
  const callName = presenterCallName(item.presenterName);
  const quote = extractSameThemeQuoteCore(item, 56);
  if (quote.length < 6) return "";

  const probe = quote.slice(0, Math.min(10, quote.length));
  const fromSummary =
    extractSummaryMidBody(item.summary ?? "", item.themeLabel ?? "").includes(
      probe,
    ) || stripSummaryFrame(item.summary ?? "").includes(probe);

  const connects = sameThemeQuoteConnectsWithToday(
    quote,
    opts?.todaySummary ?? "",
    opts?.todaySourcePost ?? "",
    opts?.themeLabel ?? item.themeLabel ?? "",
  );
  if (!connects) return "";

  const sourceLabel = fromSummary ? "要約" : "投稿";
  return `同テーマ前回の${callName}の${sourceLabel}では、「${quote}」`;
}

/**
 * モデルが書いた同テーマ前回の文を外し、固定文を①の直後に差し込む。
 * 末尾8案のうち、前後のまとまりが良いものからランダムに選ぶ。
 */
export function applySameThemeFixedSentence(
  body: string,
  fixedSentence: string,
): string {
  const raw = fixedSentence.trim();
  if (!raw) return body.trim();

  const stem = sameThemeFixedStem(raw);
  if (!stem || !stem.includes("同テーマ前回の") || !/」$/u.test(stem)) {
    return body.trim();
  }

  // モデルが本文・注釈・行頭メモに書いた同テーマ行を広く除去
  let out = body
    .replace(/\r\n/g, "\n")
    .replace(/[（(][^）\n]*同テーマ前回の[^）\n]*[）)]/g, "")
    .replace(/^.*同テーマ前回の.*$/gm, "")
    .replace(/同テーマ前回の[^\n]*?[。．！]?/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[、,。．\s]+/u, "")
    .replace(/[、,]{2,}/g, "、")
    .trim();

  const fromSummary = stem.includes("の要約では");
  const m = out.match(/^([\s\S]*?[。．！])([\s\S]*)$/u);
  let merged: string;
  if (m) {
    const before = m[1]!;
    const after = m[2]!.replace(/^[、,\s]+/u, "");
    const ending = pickSameThemeEndingForContext(before, after, fromSummary);
    merged = `${before}${stem}${ending}${after}`.trim();
  } else {
    const ending = pickSameThemeEndingForContext(out, "", fromSummary);
    const fixed = `${stem}${ending}`;
    if (!out) {
      merged = fixed;
    } else {
      merged = `${out}${/[。．！]$/u.test(out) ? "" : "。"}${fixed}`.trim();
    }
  }

  // 差し込み必須。無ければ先頭共感のあとに強制
  if (!merged.includes("同テーマ前回の")) {
    const ending = pickSameThemeEndingForContext(out, "", fromSummary);
    const fixed = `${stem}${ending}`;
    const again = out.match(/^([\s\S]*?[。．！])([\s\S]*)$/u);
    if (again) {
      merged = `${again[1]}${fixed}${again[2]!.replace(/^[、,\s]+/u, "")}`.trim();
    } else {
      merged = out ? `${out}${/[。．！]$/u.test(out) ? "" : "。"}${fixed}` : fixed;
    }
  }
  return merged;
}

function sameThemeHistoryCandidates(
  themeId: string,
  themeLabel: string,
  excludeReviewDate?: string,
): ReviewHistoryRecord[] {
  const id = themeId.trim();
  const label = themeLabel.trim();
  const codes = lookupThemeCodes(id, label);
  const exclude = excludeReviewDate?.slice(0, 10) ?? "";

  const all = listStoredReviews();
  const matched = all.filter((item) => {
    if (exclude && item.reviewDate === exclude) return false;
    if (!(item.summary?.trim() || item.sourcePost?.trim())) return false;
    if (id && item.themeId === id) return true;
    if (label && item.themeLabel === label) return true;
    const itemCodes = lookupThemeCodes(item.themeId, item.themeLabel);
    return itemCodes.some((c) => codes.includes(c));
  });
  return matched.slice(0, 8);
}

/** 所感生成用。固定文＋参考メモ（履歴は端末 localStorage）。 */
export function getSameThemeLeaderQuote(
  themeId?: string,
  opts?: {
    themeLabel?: string;
    excludeReviewDate?: string;
    todaySummary?: string;
    todaySourcePost?: string;
  },
): {
  fixedSentence: string;
  notes: string;
  reasonIfEmpty: string;
} {
  const id = themeId?.trim() ?? "";
  const label = opts?.themeLabel?.trim() ?? "";
  if (!id && !label) {
    return { fixedSentence: "", notes: "", reasonIfEmpty: "テーマ未選択" };
  }

  const pickUsable = (excludeDate?: string) =>
    sameThemeHistoryCandidates(id, label, excludeDate).filter((item) => {
      const quote = extractSameThemeQuoteCore(item);
      return quote.length >= 6 && item.presenterName.trim().length > 0;
    });

  let items = pickUsable(opts?.excludeReviewDate);
  if (!items.length && opts?.excludeReviewDate) {
    items = pickUsable(undefined);
  }

  if (!items.length) {
    const rawCount = sameThemeHistoryCandidates(id, label, undefined).length;
    return {
      fixedSentence: "",
      notes: "",
      reasonIfEmpty:
        rawCount === 0
          ? "同テーマの履歴がこの端末にない（コピー／共有で保存された回だけが対象）"
          : "同テーマ履歴はあるが要約・投稿から一言を作れなかった",
    };
  }

  // 今日と通じる候補だけ採用（通じない引用は出さない）
  let primary: ReviewHistoryRecord | undefined;
  let fixedSentence = "";
  for (const item of items) {
    const built = buildSameThemeFixedSentence(item, {
      todaySummary: opts?.todaySummary,
      todaySourcePost: opts?.todaySourcePost,
      themeLabel: label || item.themeLabel,
    });
    if (built) {
      primary = item;
      fixedSentence = built;
      break;
    }
  }

  if (!primary || !fixedSentence) {
    return {
      fixedSentence: "",
      notes: "",
      reasonIfEmpty:
        "同テーマ履歴はあるが、使える一言（テーマ文言以外）を作れなかった",
    };
  }

  const extras = items
    .filter((item) => item.id !== primary!.id)
    .slice(0, 2)
    .map((item, i) => {
      const name = presenterCallName(item.presenterName);
      return `${i + 2}. ${item.reviewDate} · ${name}`;
    });

  const notes = [
    "【同テーマ前回】",
    "②はアプリが所感本文へ差し込む。所感にも注釈にも書かない。",
    `日付: ${primary.reviewDate}`,
    extras.length ? ["", "【同テーマのさらに前】", ...extras].join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { fixedSentence, notes, reasonIfEmpty: "" };
}

/** @deprecated getSameThemeLeaderQuote を使う */
export function sameThemeHistoryForLeader(themeId?: string): string {
  return getSameThemeLeaderQuote(themeId).notes;
}

export function historyNotesForDraft(input: {
  themeId?: string;
  presenterName?: string;
}): string {
  const items = listRelatedReviews({
    themeId: input.themeId,
    presenterName: input.presenterName,
    limit: 5,
  });
  return formatHistoryForPrompt(items);
}
