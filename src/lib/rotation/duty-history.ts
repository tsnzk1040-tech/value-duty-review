import { themeCodeFromLabel } from "./format-notebook";
import type { Member, RotationCycle, ValueItem } from "./types";

export type MemberThemeCell = {
  count: number;
  dates: string[];
  datesShort: string[];
};

export type MemberThemeColumn = {
  themeId: string;
  themeCode: string;
};

export type MemberThemeRow = {
  memberId: string;
  memberName: string;
  cells: MemberThemeCell[];
};

export type MemberThemeMatrix = {
  columns: MemberThemeColumn[];
  rows: MemberThemeRow[];
};

function formatMd(ymd: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  return `${Number(m[2])}/${Number(m[3])}`;
}

/** People as rows, theme codes as columns. Cells = count + dates across saved cycles. */
export function buildMemberThemeMatrix(
  cycles: RotationCycle[],
  members: Member[],
  valueItems: ValueItem[],
): MemberThemeMatrix {
  const days = cycles.flatMap((c) => c.days);
  const byMemberTheme = new Map<string, string[]>();
  for (const day of days) {
    const key = `${day.memberId}\t${day.valueItemId}`;
    const list = byMemberTheme.get(key) ?? [];
    list.push(day.date);
    byMemberTheme.set(key, list);
  }

  const columns: MemberThemeColumn[] = valueItems.map((item) => ({
    themeId: item.id,
    themeCode: themeCodeFromLabel(item.label) || item.id,
  }));

  const rowMembers =
    members.length > 0
      ? members
      : [
          ...new Map(
            days.map((d) => [d.memberId, { id: d.memberId, displayName: d.memberId, active: true }]),
          ).values(),
        ];

  const rows: MemberThemeRow[] = rowMembers.map((member) => ({
    memberId: member.id,
    memberName: member.displayName,
    cells: valueItems.map((item) => {
      const dates = (byMemberTheme.get(`${member.id}\t${item.id}`) ?? [])
        .slice()
        .sort((a, b) => a.localeCompare(b));
      return {
        count: dates.length,
        dates,
        datesShort: dates.map(formatMd),
      };
    }),
  }));

  return { columns, rows };
}
