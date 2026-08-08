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
    "日付\t当番\tテーマ",
    ...days.map((d) => {
      const who = memberName.get(d.memberId) ?? d.memberId;
      const full = valueLabel.get(d.valueItemId) ?? d.valueItemId;
      const theme = formatThemeForNotebook(full);
      return `${d.date}\t${who}\t${theme}`;
    }),
  ];
  return lines.join("\n");
}
