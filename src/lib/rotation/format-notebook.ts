import type { Member, RotationDay, ValueItem } from "./types";

/** ノート共有面に載せる当番向け運用指示（WowTalk振り返り） */
export const ROTATION_ASSIGNEE_INSTRUCTION =
  "各担当者は、該当日のテーマ(コード内容は下記参照）について、当該内容を意識して行動し、翌日午前中を目途に自身の行動結果(振り返り)をWowTalkに投稿してください。";

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
    ROTATION_ASSIGNEE_INSTRUCTION,
    "",
    "日付\t当番\tテーマ",
    ...days.map((d) => {
      const who = memberName.get(d.memberId) ?? d.memberId;
      const theme = valueLabel.get(d.valueItemId) ?? d.valueItemId;
      return `${d.date}\t${who}\t${theme}`;
    }),
  ];
  return lines.join("\n");
}
