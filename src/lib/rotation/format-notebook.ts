import type { Member, RotationDay, ValueItem } from "./types";
import { ROTATION_INSTRUCTION_BLOCK } from "./seed";

/** Leading theme code like `1-①` / `6-④`. */
export function themeCodeFromLabel(label: string): string {
  const m = label.match(/^(\d+-[①②③④⑤⑥⑦⑧⑨⑩]+)/);
  return m?.[1] ?? label;
}

/**
 * Notebook paste: keep full text only for 1-①; other themes → code only.
 */
export function formatThemeForNotebook(label: string): string {
  const code = themeCodeFromLabel(label);
  if (code === "1-①") return label;
  return code;
}

/** Notebook column for prior-assignment gap (business days). */
export function formatGapForNotebook(
  gapFromPreviousBusinessDays: number | undefined,
): string {
  if (gapFromPreviousBusinessDays == null) return "";
  return `${gapFromPreviousBusinessDays}営業日`;
}

/** Field separator for paste rows (spaces, not tabs — tab stops make short names look wider). */
const NOTEBOOK_COL_SEP = "  ";

export function formatNotebookCopy(
  days: RotationDay[],
  members: Member[],
  valueItems: ValueItem[],
): string {
  const memberName = new Map(members.map((m) => [m.id, m.displayName]));
  const valueLabel = new Map(valueItems.map((v) => [v.id, v.label]));

  const lines = [
    "日別ローテ（アプリ出力・ノート貼付用）",
    "",
    ...ROTATION_INSTRUCTION_BLOCK.split("\n"),
    "",
    "新ローテーション",
    ["日付", "当番", "テーマ", "前回間隔"].join(NOTEBOOK_COL_SEP),
    ...days.map((d) => {
      const who = memberName.get(d.memberId) ?? d.memberId;
      const full = valueLabel.get(d.valueItemId) ?? d.valueItemId;
      const theme = formatThemeForNotebook(full);
      const gap = formatGapForNotebook(d.gapFromPreviousBusinessDays);
      return [d.date, who, theme, gap].join(NOTEBOOK_COL_SEP);
    }),
  ];
  return lines.join("\n");
}
