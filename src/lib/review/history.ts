import type { AppSettings } from "@/lib/settings/types";
import { themeCodeFromLabel } from "@/lib/rotation/format-notebook";

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
      const mid = item.summary
        .replace(/^Value[０-９0-9].*?行動指針について、/, "")
        .replace(/想いを共有頂きました[。．！]?$/, "")
        .trim()
        .slice(0, maxSummaryChars);
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

/**
 * 所感で引用する「言っていたこと」の核。
 * **本人コメント（投稿）を正**。リーダー所感・要約は見ない（トシオ側のレビューを引用しない）。
 */
export function extractSameThemeQuoteCore(
  item: ReviewHistoryRecord,
  maxChars = 72,
): string {
  const pickSentence = (text: string): string => {
    if (!text) return "";
    const parts = text
      .split(/[。．！？\n]/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 12);
    // 実践・気づきの文を優先（挨拶・定型は避ける）
    const preferred =
      parts.find(
        (p) =>
          !/ありがとう|振り返りコメント|共有頂き/.test(p) &&
          /してみ|していて|考え|調べ|試|置|先に|聞き|期限|曖昧|一次|捉|意識/.test(p),
      ) ??
      parts.find((p) => !/ありがとう|振り返りコメント|共有頂き/.test(p)) ??
      parts[0] ??
      text.trim();
    return preferred.slice(0, maxChars).replace(/[、,]$/, "").trim();
  };

  const source = item.sourcePost.replace(/\s+/g, " ").trim();
  const fromMember = pickSentence(source);
  if (fromMember.length >= 12) return fromMember;

  // 投稿が極端に短いときだけ、要約のあいだ（本人実践の言い換え）を退避。所感は使わない。
  const mid = item.summary
    .replace(/^Value[０-９0-9].*?行動指針について、/, "")
    .replace(/想いを共有頂きました[。．！]?$/, "")
    .trim();
  return pickSentence(mid).slice(0, maxChars);
}

/** 所感生成用。同テーマの直近1件を、必須引用の材料として渡す。 */
export function sameThemeHistoryForLeader(themeId?: string): string {
  const id = themeId?.trim() ?? "";
  if (!id) return "";
  const items = listRelatedReviews({ themeId: id, limit: 4 }).filter((item) => {
    const quote = extractSameThemeQuoteCore(item);
    return quote.length >= 12 && item.presenterName.trim().length > 0;
  });
  const primary = items[0];
  if (!primary) return "";

  const callName = presenterCallName(primary.presenterName);
  const quote = extractSameThemeQuoteCore(primary, 72);
  const extras = items.slice(1, 3).map((item, i) => {
    const name = presenterCallName(item.presenterName);
    const q = extractSameThemeQuoteCore(item, 48);
    return `${i + 2}. ${item.reviewDate} · ${name} · 本人コメント核: ${q}`;
  });

  return [
    "【必須・同テーマ前回の1件】",
    `日付: ${primary.reviewDate}`,
    `呼び名（このまま使う）: ${callName}`,
    "引用の正本: 本人の振り返りコメント（投稿）。リーダー所感・要約は引用しない。",
    `本人コメントの引用核（『』に入れる短い言い切り・言い換え可だが意味は変えない）: ${quote}`,
    "必須の文型:",
    `同テーマ前回の${callName}は、『（本人コメントの引用核）』といっていて、＋今日の投稿の具体や次の提案へ自然につなぐ。`,
    "不合格のつなぎ: 「とも重なります。」だけで終わる／名前だけ出して中身なし／形式的な並列／リーダー所感の言い回しを本人の発言として使う。",
    "合格のつなぎ例: 〜といっていて、今日の（投稿の具体）にも通じますね。／〜といっていて、だからこそ次の『こうしたら？』が効きます。",
    extras.length
      ? ["", "【同テーマのさらに前（触れてよいが主役にしない）】", ...extras].join(
          "\n",
        )
      : "",
  ]
    .filter(Boolean)
    .join("\n");
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
