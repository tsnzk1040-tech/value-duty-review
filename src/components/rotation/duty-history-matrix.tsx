"use client";

import { buildMemberThemeMatrix } from "@/lib/rotation/duty-history";
import type { Member, RotationCycle, ValueItem } from "@/lib/rotation/types";

export function DutyHistoryMatrix({
  cycles,
  members,
  valueItems,
}: {
  cycles: RotationCycle[];
  members: Member[];
  valueItems: ValueItem[];
}) {
  const matrix = buildMemberThemeMatrix(cycles, members, valueItems);

  if (matrix.columns.length === 0 || matrix.rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        保存済みのローテがない。ノート用コピーで周が残ると、ここに並ぶ。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-max min-w-full border-collapse text-left text-xs">
        <caption className="sr-only">
          人ごとの当番履歴。列はテーマ番号、セルは回数と日付。
        </caption>
        <thead>
          <tr className="border-b border-border bg-muted">
            <th
              scope="col"
              className="sticky left-0 z-20 bg-muted px-2 py-2 font-medium text-muted-foreground"
            >
              当番
            </th>
            {matrix.columns.map((col) => (
              <th
                key={col.themeId}
                scope="col"
                className="min-w-16 px-1.5 py-2 text-center font-medium text-foreground"
              >
                {col.themeCode}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr key={row.memberId} className="border-b border-border last:border-b-0">
              <th
                scope="row"
                className="sticky left-0 z-10 whitespace-nowrap bg-background px-2 py-2 font-medium text-foreground"
              >
                {row.memberName}
              </th>
              {row.cells.map((cell, colIndex) => (
                <td
                  key={`${row.memberId}-${matrix.columns[colIndex]?.themeId ?? colIndex}`}
                  className="px-1.5 py-2 align-top text-center text-foreground"
                >
                  {cell.count === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <span>{cell.count}回</span>
                      {cell.datesShort.map((d) => (
                        <span
                          key={d}
                          className="tabular-nums text-muted-foreground"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
