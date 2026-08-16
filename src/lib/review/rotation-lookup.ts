import { findRotationDayByDate } from "@/lib/rotation/previous-cycle";
import type { Member, RotationCycle, ValueItem } from "@/lib/rotation/types";

export type RotationAssignment = {
  date: string;
  memberId: string;
  presenterName: string;
  themeId: string;
  themeLabel: string;
};

/** コメント対象日の確定ローテ（担当＋行動指針）。無ければ null。 */
export function assignmentForReviewDate(
  historyCycles: RotationCycle[],
  ymd: string,
  members: Member[],
  valueItems: ValueItem[],
): RotationAssignment | null {
  const day = findRotationDayByDate(historyCycles, ymd);
  if (!day) return null;
  const member = members.find((m) => m.id === day.memberId);
  const theme = valueItems.find((v) => v.id === day.valueItemId);
  return {
    date: day.date,
    memberId: day.memberId,
    presenterName: member?.displayName ?? "",
    themeId: theme?.id ?? day.valueItemId,
    themeLabel: theme?.label ?? day.valueItemId,
  };
}
