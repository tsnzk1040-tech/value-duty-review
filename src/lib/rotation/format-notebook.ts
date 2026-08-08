import type { Member, RotationDay, ValueItem } from "./types";

export function formatNotebookCopy(
  days: RotationDay[],
  members: Member[],
  valueItems: ValueItem[],
): string {
  const memberName = new Map(members.map((m) => [m.id, m.displayName]));
  const valueLabel = new Map(valueItems.map((v) => [v.id, v.label]));

  const lines = [
    "日別ローテ（アプリ出力・ノート貼付用）",
    "日付\t当番\tテーマ",
    ...days.map((d) => {
      const who = memberName.get(d.memberId) ?? d.memberId;
      const theme = valueLabel.get(d.valueItemId) ?? d.valueItemId;
      return `${d.date}\t${who}\t${theme}`;
    }),
  ];
  return lines.join("\n");
}
