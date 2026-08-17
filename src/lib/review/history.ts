import type { AppSettings } from "@/lib/settings/types";
import { latestPreviousCycle } from "@/lib/rotation/previous-cycle";

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
 * 端末に残っている1周分をそのまま使う（キー変更・再保存はしない）。
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

/** 残す件数＝前回ローテ1周（日数）。2周分は残さない。無ければ当番人数。 */
export function reviewHistoryKeepCount(settings: AppSettings): number {
  const prev = latestPreviousCycle(settings.rotation.historyCycles);
  if (prev && prev.days.length > 0) return prev.days.length;
  const active = settings.members.filter((m) => m.active !== false).length;
  return Math.max(settings.rotation.businessDayCount || 0, active, 1);
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

function writeAll(items: ReviewHistoryRecord[], keep: number) {
  if (!isBrowser()) return;
  const cap = Math.max(keep, 1);
  const capped = items
    .slice()
    .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate))
    .slice(0, cap);
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(capped));
}

export function pruneReviewHistory(keep: number): ReviewHistoryRecord[] {
  const items = readAll();
  writeAll(items, keep);
  return readAll();
}

export function saveReviewHistory(
  input: SaveReviewHistoryInput,
  keep: number,
): ReviewHistoryRecord {
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
  writeAll(next, keep);
  return record;
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
  const safeLimit = Math.min(Math.max(input.limit ?? 10, 1), 100);
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
          ? `   前回コメント: ${comment}`
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

export function sameThemeHistoryForLeader(themeId?: string): string {
  const id = themeId?.trim() ?? "";
  if (!id) return "";
  const items = listRelatedReviews({ themeId: id, limit: 4 });
  return formatHistoryForPrompt(items, { maxItems: 3, maxCommentChars: 240 });
}
