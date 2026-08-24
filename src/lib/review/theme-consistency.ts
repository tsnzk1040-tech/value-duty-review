import { themeCodeFromLabel } from "@/lib/rotation/format-notebook";
import type { ValueItem } from "@/lib/rotation/types";
import { matchValueItemFromSourcePost } from "@/lib/review/match-theme";
import {
  themeCodeForSelection,
  themeCodeFromValueItemId,
  themeIdLabelMismatch,
} from "@/lib/review/theme-meta";

export type ThemeConsistencyIssue = {
  id: string;
  severity: "error" | "warn";
  message: string;
};

export type SameThemeReference = {
  reviewDate: string;
  presenterName: string;
  themeLabel: string;
  themeId: string;
  displayLine: string;
};

/** 投稿から推定したテーマと Select の themeId がズレる */
export function postThemeMismatch(
  sourcePost: string,
  themeId: string,
  valueItems: ValueItem[],
): { mismatch: boolean; postThemeId?: string; postThemeLabel?: string } {
  const post = sourcePost.trim();
  const id = themeId.trim();
  if (!post || !id || valueItems.length === 0) {
    return { mismatch: false };
  }
  const hit = matchValueItemFromSourcePost(post, valueItems);
  if (!hit || hit.id === id) return { mismatch: false };
  return {
    mismatch: true,
    postThemeId: hit.id,
    postThemeLabel: hit.label,
  };
}

export function checkDraftThemeConsistency(input: {
  themeId: string;
  themeLabel: string;
  sourcePost: string;
  valueItems: ValueItem[];
}): ThemeConsistencyIssue[] {
  const issues: ThemeConsistencyIssue[] = [];
  const { themeId, themeLabel, sourcePost, valueItems } = input;

  if (themeIdLabelMismatch(themeId, themeLabel)) {
    issues.push({
      id: "theme-id-label-mismatch",
      severity: "error",
      message: `行動指針の内部ID（${themeCodeFromValueItemId(themeId)}）と表示（${themeCodeFromLabel(themeLabel)}）が一致しない`,
    });
  }

  const post = postThemeMismatch(sourcePost, themeId, valueItems);
  if (post.mismatch && post.postThemeLabel) {
    issues.push({
      id: "post-theme-mismatch",
      severity: "warn",
      message: `投稿本文は ${themeCodeFromLabel(post.postThemeLabel)} っぽいが、選択中は ${themeCodeForSelection(themeId, themeLabel)}。要約を出し直すかテーマを合わせて`,
    });
  }

  return issues;
}

/** 履歴1件の themeId / themeLabel / 投稿 が食い違っている */
export function isHistoryRecordThemeDrift(
  record: { themeId: string; themeLabel: string; sourcePost: string },
  valueItems: ValueItem[],
): boolean {
  if (themeIdLabelMismatch(record.themeId, record.themeLabel)) return true;
  return postThemeMismatch(record.sourcePost, record.themeId, valueItems).mismatch;
}

export function formatSameThemeReference(record: {
  reviewDate: string;
  presenterName: string;
  themeLabel: string;
  themeId: string;
}): string {
  const code = themeCodeForSelection(record.themeId, record.themeLabel);
  const name = record.presenterName.trim() || "（名前不明）";
  return `参照: ${code} · ${name} · ${record.reviewDate}`;
}

export function themeConsistencyToFinalIssues(
  issues: ThemeConsistencyIssue[],
): { id: string; severity: "error" | "warn"; message: string }[] {
  return issues.map((issue) => ({
    id: issue.id,
    severity: issue.severity,
    message: issue.message,
  }));
}
