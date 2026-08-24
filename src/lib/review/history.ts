import type { AppSettings } from "@/lib/settings/types";
import { themeCodeFromLabel } from "@/lib/rotation/format-notebook";
import { stripThemeLabelFromText } from "@/lib/review/theme-meta";
import {
  formatSameThemeReference,
  isHistoryRecordThemeDrift,
  type SameThemeReference,
} from "@/lib/review/theme-consistency";
import { themeCodeFromValueItemId } from "@/lib/review/theme-meta";

export { themeCodeFromValueItemId } from "@/lib/review/theme-meta";

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
export const HISTORY_BACKUP_STORAGE_KEY = "vdr.review.history.backup.v1";

export type ReviewHistoryBackupMeta = {
  savedAt: string;
  recordCount: number;
  trigger: "6-4-lap-close";
};

type ReviewHistoryBackupPayload = {
  meta: ReviewHistoryBackupMeta;
  records: ReviewHistoryRecord[];
};

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

function readHistoryBackupPayload(): ReviewHistoryBackupPayload | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(HISTORY_BACKUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReviewHistoryBackupPayload>;
    if (!parsed || !Array.isArray(parsed.records)) return null;
    const records = parsed.records
      .map(asHistoryRecord)
      .filter((item): item is ReviewHistoryRecord => Boolean(item));
    if (records.length === 0) return null;
    const meta = parsed.meta;
    return {
      meta: {
        savedAt:
          typeof meta?.savedAt === "string" && meta.savedAt.trim()
            ? meta.savedAt
            : new Date().toISOString(),
        recordCount: records.length,
        trigger: "6-4-lap-close",
      },
      records,
    };
  } catch {
    return null;
  }
}

function writeHistoryBackup(items: ReviewHistoryRecord[]): void {
  if (!isBrowser()) return;
  const payload: ReviewHistoryBackupPayload = {
    meta: {
      savedAt: new Date().toISOString(),
      recordCount: items.length,
      trigger: "6-4-lap-close",
    },
    records: items,
  };
  window.localStorage.setItem(
    HISTORY_BACKUP_STORAGE_KEY,
    JSON.stringify(payload),
  );
}

export function hasReviewHistoryBackup(): boolean {
  return readHistoryBackupPayload() !== null;
}

/** 6-④保存時の退避。再読み込みで復元する。 */
export function reviewHistoryBackupSummary(): {
  savedAt: string;
  recordCount: number;
} | null {
  const payload = readHistoryBackupPayload();
  if (!payload) return null;
  return {
    savedAt: payload.meta.savedAt,
    recordCount: payload.meta.recordCount,
  };
}

/** 6-④保存時のJSONバックアップで、いまの履歴を上書き復元する。 */
export function restoreReviewHistoryFromBackup(): number {
  const payload = readHistoryBackupPayload();
  if (!payload) {
    throw new Error("6-④保存時のバックアップがない");
  }
  persist(payload.records, 2);
  return payload.records.length;
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
  if (closedThemeLap) {
    writeHistoryBackup(retainThemeLaps(next, 2));
  }
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
    .replace(/(?:想いを)?共有頂(?:だ)?きました[。．！!]?$/u, "")
    .replace(/[　\s]+/g, " ")
    .trim();
}

/**
 * レビュー投稿全文から要約あいだを切り出す（参照時）。
 * 「…について、」の直後〜「（想いを）共有頂(だ)きました」の直前。
 * 保存時に summary が空でも fullText から復旧する。
 */
export function extractSummaryMidFromPostedText(
  posted: string,
  themeLabel = "",
): string {
  const t = posted.replace(/\r\n/g, "\n").trim();
  if (!t) return "";

  const m = t.match(
    /(?:行動指針について|について)[、,]\s*([\s\S]*?)(?:想いを)?共有頂(?:だ)?きました[!！]?/u,
  );
  if (!m?.[1]) return "";

  let mid = m[1].replace(/[　\s]+/g, " ").trim();
  mid = stripThemeLabelFromText(mid, themeLabel);
  mid = mid.replace(/[　\s]+/g, " ").trim();
  if (mid.length < 12 || isOnlyThemeLabel(mid, themeLabel)) return "";
  return mid;
}

/** 要約フィールド優先。空・所感混入なら投稿全文から定型あいだを切り出す。 */
export function summaryMidForSameThemeQuote(
  item: ReviewHistoryRecord,
): string {
  return resolveSummaryMidForSameThemeQuote(item).mid;
}

export type SameThemeMidSource = "summary-field" | "posted-text" | "";

/** 引用用要約あいだと、その出典（監査・UI用）。 */
export function resolveSummaryMidForSameThemeQuote(
  item: ReviewHistoryRecord,
): { mid: string; source: SameThemeMidSource } {
  const themeLabel = item.themeLabel ?? "";
  const fromSummary = extractSummaryMidBody(item.summary ?? "", themeLabel);
  const summaryUsable =
    fromSummary.length >= 12 &&
    !isOnlyThemeLabel(fromSummary, themeLabel) &&
    !looksLikeLeaderEmpathyQuote(fromSummary);

  if (summaryUsable) {
    return { mid: fromSummary, source: "summary-field" };
  }

  const posted = reviewHistoryPostedText(item);
  const fromPosted = extractSummaryMidFromPostedText(posted, themeLabel);
  if (fromPosted.length >= 12) {
    return { mid: fromPosted, source: "posted-text" };
  }

  if (
    fromSummary.length >= 12 &&
    !isOnlyThemeLabel(fromSummary, themeLabel)
  ) {
    return { mid: fromSummary, source: "summary-field" };
  }
  return { mid: "", source: "" };
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
  // 完結文の適度な長さを優遇（切らない前提）
  if (sentence.length >= 16 && sentence.length <= 100) score += 3;
  if (sentence.length > 140) score -= 2;
  return score;
}

/**
 * 文区切り（。！？）された**完結文だけ**から選ぶ。
 * 字数スライスや記号末尾ヒューリスティックでは切らない。
 */
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
    .filter((p) => p.length >= 12 && !isOnlyThemeLabel(p, themeLabel));

  if (!parts.length) {
    // 句点のない一塊は、短く完結していそうなときだけ採用（切らない）
    if (
      cleaned.length >= 12 &&
      cleaned.length <= maxChars &&
      !isOnlyThemeLabel(cleaned, themeLabel)
    ) {
      return cleaned.replace(/[「」『』]/g, "").trim();
    }
    return "";
  }

  const ranked = parts
    .map((part) => ({
      part: part.replace(/[「」『』]/g, "").trim(),
      score: scorePracticeCue(part),
    }))
    .filter(
      (row) =>
        row.score > 0 &&
        row.part.length >= 12 &&
        !looksLikeLeaderEmpathyQuote(row.part),
    )
    .sort((a, b) => b.score - a.score);

  // まず maxChars に収まる完結文
  for (const row of ranked) {
    if (row.part.length <= maxChars) return row.part;
  }
  // やや長い完結文も許容（切るより全文）
  const hardMax = Math.max(maxChars, 140);
  for (const row of ranked) {
    if (row.part.length <= hardMax) return row.part;
  }
  // 長すぎる完結文は切らずに見送る（サーバ側 Gemini 整文に回す材料として raw を別途渡す想定）
  return ranked[0] && ranked[0].part.length <= 200 ? ranked[0].part : "";
}

/**
 * 所感②用の核。前回レビューの**要約あいだの完結文のみ**。
 * summary が空でも fullText 等から定型あいだを切り出して使う。
 */
export function extractSameThemeQuoteCore(
  item: ReviewHistoryRecord,
  maxChars = 100,
): string {
  const themeLabel = item.themeLabel ?? "";
  const mid = summaryMidForSameThemeQuote(item);
  return pickOneLinerFromText(mid, themeLabel, maxChars);
}

/** Gemini 選定用。要約あいだのみ（所感・投稿本文は渡さない）。 */
export function extractSameThemeQuoteMaterial(
  item: ReviewHistoryRecord,
  maxChars = 240,
): string {
  const mid = summaryMidForSameThemeQuote(item);
  if (mid.length < 12) return "";
  return mid.slice(0, maxChars).trim();
}

/** 所感・共感口調っぽい一文（引用に使わない）。 */
export function looksLikeLeaderEmpathyQuote(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (
    /分かります|わかります|いいですね|共有ありがとう|どうでしょう|してみたら|現場でも使え|思い出しますね|つながる感じ|と通じる/.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

/** 固定文幹から「」内の引用を取り出す。 */
export function extractQuoteFromSameThemeStem(stem: string): string {
  const m = stem.trim().match(/「([^」]*)」\s*$/u);
  return m?.[1]?.trim() ?? "";
}

/** 固定文幹の「」内だけ差し替える。 */
export function replaceQuoteInSameThemeStem(
  stem: string,
  quote: string,
): string {
  const q = quote.replace(/[「」『』]/g, "").trim();
  if (!q) return "";
  const base = sameThemeFixedStem(stem);
  if (!base) return "";
  if (/「[^」]*」\s*$/u.test(base)) {
    return base.replace(/「[^」]*」\s*$/u, `「${q}」`);
  }
  return `${base.replace(/」?\s*$/u, "")}「${q}」`;
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

/** 今日の主線とつなぐ末尾（bridge）。 */
export const SAME_THEME_BRIDGE_ENDING_POOL = [
  "と通じるものがありますね。", // A
  "と、今日の話と重なりますね。", // B
  "を思い出しますね。", // D
  "とつながる感じがします。", // E
] as const;

/** 単なる紹介の末尾（intro）。通じる／つながるは使わない。 */
export const SAME_THEME_INTRO_ENDING_POOL = [
  "と、投稿していました。", // F
  "と触れていました。", // G
  "という実践がありました。", // H
  "とまとめていました。", // J
  "と書いていました。",
  "と共有していました。",
] as const;

/** 互換: bridge + intro の合算。 */
export const SAME_THEME_ENDING_POOL = [
  ...SAME_THEME_BRIDGE_ENDING_POOL,
  ...SAME_THEME_INTRO_ENDING_POOL,
] as const;

export type SameThemeEndingMode = "bridge" | "intro";

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

function endingPoolForMode(
  mode: SameThemeEndingMode,
  fromSummary: boolean,
): readonly string[] {
  if (mode === "intro") {
    if (fromSummary) return SAME_THEME_INTRO_ENDING_POOL;
    return SAME_THEME_INTRO_ENDING_POOL.filter(
      (e) => e !== "とまとめていました。",
    );
  }
  return SAME_THEME_BRIDGE_ENDING_POOL;
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
  mode: SameThemeEndingMode = "bridge",
): string {
  const pool = endingPoolForMode(mode, fromSummary);
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
 * 返す形: `同テーマ前回の〇〇さんの要約では、「……」`（出典は常に要約）
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
  const quote = extractSameThemeQuoteCore(item, 100);
  if (quote.length < 6) return "";
  if (looksLikeLeaderEmpathyQuote(quote)) return "";

  const connects = sameThemeQuoteConnectsWithToday(
    quote,
    opts?.todaySummary ?? "",
    opts?.todaySourcePost ?? "",
    opts?.themeLabel ?? item.themeLabel ?? "",
  );
  if (!connects) return "";

  return `同テーマ前回の${callName}の要約では、「${quote}」`;
}

/**
 * モデルが書いた同テーマ前回の文を外し、固定文を①の直後に差し込む。
 * mode=bridge: 今日とつなぐ末尾 / mode=intro: 単なる紹介の末尾。
 */
export function applySameThemeFixedSentence(
  body: string,
  fixedSentence: string,
  opts?: { mode?: SameThemeEndingMode },
): string {
  const raw = fixedSentence.trim();
  if (!raw) return body.trim();

  const stem = sameThemeFixedStem(raw);
  if (!stem || !stem.includes("同テーマ前回の") || !/」$/u.test(stem)) {
    return body.trim();
  }

  const mode: SameThemeEndingMode = opts?.mode === "intro" ? "intro" : "bridge";

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
    const ending = pickSameThemeEndingForContext(
      before,
      after,
      fromSummary,
      mode,
    );
    merged = `${before}${stem}${ending}${after}`.trim();
  } else {
    const ending = pickSameThemeEndingForContext(out, "", fromSummary, mode);
    const fixed = `${stem}${ending}`;
    if (!out) {
      merged = fixed;
    } else {
      merged = `${out}${/[。．！]$/u.test(out) ? "" : "。"}${fixed}`.trim();
    }
  }

  // 差し込み必須。無ければ先頭共感のあとに強制
  if (!merged.includes("同テーマ前回の")) {
    const ending = pickSameThemeEndingForContext(out, "", fromSummary, mode);
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
  valueItems?: { id: string; label: string }[],
): ReviewHistoryRecord[] {
  const id = themeId.trim();
  const label = themeLabel.trim();
  const codes = lookupThemeCodes(id, label);
  const exclude = excludeReviewDate?.slice(0, 10) ?? "";

  const all = listStoredReviews();
  const matched = all.filter((item) => {
    if (exclude && item.reviewDate === exclude) return false;
    if (!summaryMidForSameThemeQuote(item)) return false;

    let themeMatch = false;
    if (id) {
      themeMatch = item.themeId === id;
    } else if (label) {
      themeMatch = item.themeLabel === label;
    } else {
      const itemCodes = lookupThemeCodes(item.themeId, item.themeLabel);
      themeMatch = itemCodes.some((c) => codes.includes(c));
    }
    if (!themeMatch) return false;

    if (
      valueItems?.length &&
      isHistoryRecordThemeDrift(item, valueItems)
    ) {
      return false;
    }
    return true;
  });
  return matched.slice(0, 8);
}

function countSameThemeDriftSkipped(
  themeId: string,
  themeLabel: string,
  valueItems?: { id: string; label: string }[],
): number {
  if (!valueItems?.length) return 0;
  const id = themeId.trim();
  const label = themeLabel.trim();
  return listStoredReviews().filter((item) => {
    if (!summaryMidForSameThemeQuote(item)) return false;
    const themeMatch = id
      ? item.themeId === id
      : label
        ? item.themeLabel === label
        : false;
    return themeMatch && isHistoryRecordThemeDrift(item, valueItems);
  }).length;
}

/** 所感生成用。固定文＋参考メモ（履歴は端末 localStorage）。 */
export function getSameThemeLeaderQuote(
  themeId?: string,
  opts?: {
    themeLabel?: string;
    excludeReviewDate?: string;
    todaySummary?: string;
    todaySourcePost?: string;
    valueItems?: { id: string; label: string }[];
  },
): {
  fixedSentence: string;
  quoteMaterial: string;
  notes: string;
  reasonIfEmpty: string;
  /** 要約あいだの出典 */
  midSource: SameThemeMidSource;
  reference?: SameThemeReference;
  driftSkippedCount: number;
} {
  const id = themeId?.trim() ?? "";
  const label = opts?.themeLabel?.trim() ?? "";
  const valueItems = opts?.valueItems;
  const driftSkippedCount = countSameThemeDriftSkipped(id, label, valueItems);
  if (!id && !label) {
    return {
      fixedSentence: "",
      quoteMaterial: "",
      notes: "",
      reasonIfEmpty: "テーマ未選択",
      midSource: "",
      driftSkippedCount: 0,
    };
  }

  const pickUsable = (excludeDate?: string) =>
    sameThemeHistoryCandidates(id, label, excludeDate, valueItems).filter((item) => {
      const quote = extractSameThemeQuoteCore(item);
      return quote.length >= 6 && item.presenterName.trim().length > 0;
    });

  let items = pickUsable(opts?.excludeReviewDate);
  if (!items.length && opts?.excludeReviewDate) {
    items = pickUsable(undefined);
  }

  if (!items.length) {
    const rawMatched = listStoredReviews().filter((item) => {
      if (id && item.themeId === id) return true;
      if (label && item.themeLabel === label) return true;
      const itemCodes = lookupThemeCodes(item.themeId, item.themeLabel);
      const codes = lookupThemeCodes(id, label);
      return itemCodes.some((c) => codes.includes(c));
    }).length;
    const midFailCount = listStoredReviews().filter((item) => {
      const themeOk =
        (id && item.themeId === id) ||
        (label && item.themeLabel === label) ||
        lookupThemeCodes(item.themeId, item.themeLabel).some((c) =>
          lookupThemeCodes(id, label).includes(c),
        );
      return themeOk && !summaryMidForSameThemeQuote(item);
    }).length;
    return {
      fixedSentence: "",
      quoteMaterial: "",
      notes: "",
      reasonIfEmpty:
        driftSkippedCount > 0 && rawMatched > 0
          ? "同テーマ履歴はあるが、テーマと要約のズレで除外した（履歴の要約を直して再保存して）"
          : rawMatched === 0
            ? "同テーマの履歴がこの端末にない（コピー／共有で保存された回だけが対象）"
            : midFailCount > 0
              ? "同テーマ履歴はあるが、要約あいだ（について、〜共有頂きました）を切り出せなかった"
              : "同テーマ履歴はあるが、引用できる一言を作れなかった",
      midSource: "",
      driftSkippedCount,
    };
  }

  // 今日と通じる候補だけ採用（通じない引用は出さない）
  let primary: ReviewHistoryRecord | undefined;
  let fixedSentence = "";
  let midSource: SameThemeMidSource = "";
  for (const item of items) {
    const built = buildSameThemeFixedSentence(item, {
      todaySummary: opts?.todaySummary,
      todaySourcePost: opts?.todaySourcePost,
      themeLabel: label || item.themeLabel,
    });
    if (built) {
      primary = item;
      fixedSentence = built;
      midSource = resolveSummaryMidForSameThemeQuote(item).source;
      break;
    }
  }

  if (!primary || !fixedSentence) {
    return {
      fixedSentence: "",
      quoteMaterial: "",
      notes: "",
      reasonIfEmpty:
        "同テーマ履歴はあるが、今日とつなげる／紹介する一言を選べなかった",
      midSource: "",
      driftSkippedCount,
    };
  }

  const quoteMaterial = extractSameThemeQuoteMaterial(primary);
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
    midSource === "posted-text"
      ? "出典: 投稿全文から要約定型（について、〜共有頂きました）を切り出し"
      : "出典: 保存済み summary フィールド",
    extras.length ? ["", "【同テーマのさらに前】", ...extras].join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    fixedSentence,
    quoteMaterial,
    notes,
    reasonIfEmpty: "",
    midSource,
    reference: {
      reviewDate: primary.reviewDate,
      presenterName: primary.presenterName,
      themeLabel: primary.themeLabel,
      themeId: primary.themeId,
      displayLine: formatSameThemeReference(primary),
    },
    driftSkippedCount,
  };
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
