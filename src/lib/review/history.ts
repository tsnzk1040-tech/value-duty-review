import type { AppSettings } from "@/lib/settings/types";
import { latestPreviousCycle } from "@/lib/rotation/previous-cycle";
import { valueGroupFromLabel } from "@/lib/rotation/value-group";
import { extractSummaryBody } from "@/lib/review/prompts";

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

/** 残す件数＝前回ローテ1周（日数）。無ければ当番人数。 */
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
  /** Value 帯 1〜6。理念の実践例を帯で見る */
  valueGroup?: number;
  limit?: number;
  match?: "or" | "and";
}): ReviewHistoryRecord[] {
  const safeLimit = Math.min(Math.max(input.limit ?? 10, 1), 100);
  const themeId = input.themeId?.trim() ?? "";
  const presenterName = input.presenterName?.trim() ?? "";
  const valueGroup =
    input.valueGroup != null &&
    Number.isFinite(input.valueGroup) &&
    input.valueGroup >= 1 &&
    input.valueGroup <= 6
      ? input.valueGroup
      : 0;
  const matchAnd = input.match === "and";
  const all = readAll()
    .slice()
    .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));

  if (!themeId && !presenterName && !valueGroup) {
    return all.slice(0, safeLimit);
  }

  return all
    .filter((item) => {
      const checks: boolean[] = [];
      if (themeId) checks.push(item.themeId === themeId);
      if (presenterName) checks.push(item.presenterName === presenterName);
      if (valueGroup) {
        checks.push(valueGroupFromLabel(item.themeLabel) === valueGroup);
      }
      if (checks.length === 0) return true;
      return matchAnd ? checks.every(Boolean) : checks.some(Boolean);
    })
    .slice(0, safeLimit);
}

/** 履歴カード用。定型枠を外した実践例本文。 */
export function historyExamplePreview(
  item: ReviewHistoryRecord,
  maxChars = 160,
): string {
  const mid = extractSummaryBody(item.summary || "", item.themeLabel);
  if (mid) return mid.slice(0, maxChars);
  const source = item.sourcePost.replace(/\s+/g, " ").trim();
  if (source) return source.slice(0, maxChars);
  return (item.fullText || "").replace(/\s+/g, " ").trim().slice(0, maxChars);
}

export function formatHistoryForPrompt(
  items: ReviewHistoryRecord[],
  opts?: { maxItems?: number; maxSummaryChars?: number },
): string {
  const maxItems = opts?.maxItems ?? 3;
  const maxSummaryChars = opts?.maxSummaryChars ?? 120;
  const slice = items.slice(0, maxItems);
  if (!slice.length) return "";

  return slice
    .map((item, i) => {
      const mid = historyExamplePreview(item, maxSummaryChars);
      const note = item.leaderNote.trim().slice(0, 80);
      const source = item.sourcePost.replace(/\s+/g, " ").trim().slice(0, 80);
      return [
        `${i + 1}. ${item.reviewDate} · ${item.presenterName}` +
          (item.themeLabel ? ` · ${item.themeLabel}` : ""),
        mid ? `   要約要旨: ${mid}` : "",
        note ? `   所感要旨: ${note}` : "",
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
  return formatHistoryForPrompt(items, { maxItems: 3 });
}
