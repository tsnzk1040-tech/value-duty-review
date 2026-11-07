import { themeCodeFromLabel } from "./format-notebook";
import type { Member, RotationCycle, RotationDay, ValueItem } from "./types";

/** A later assignment of a theme that person already had. */
export type ThemeRepeat = {
  memberId: string;
  valueItemId: string;
  date: string;
  previousDate: string;
  /** 2 = second time, 3 = third, … */
  occurrence: number;
};

function remember(
  seen: Map<string, { date: string; count: number }>,
  day: RotationDay,
  hits: ThemeRepeat[],
) {
  const key = `${day.memberId}\t${day.valueItemId}`;
  const prior = seen.get(key);
  if (prior) {
    hits.push({
      memberId: day.memberId,
      valueItemId: day.valueItemId,
      date: day.date,
      previousDate: prior.date,
      occurrence: prior.count + 1,
    });
    seen.set(key, { date: day.date, count: prior.count + 1 });
    return;
  }
  seen.set(key, { date: day.date, count: 1 });
}

function byDate(a: RotationDay, b: RotationDay): number {
  return a.date.localeCompare(b.date);
}

/** Repeats inside saved cycles. Older cycles are read first. */
export function repeatedThemesInHistory(cycles: RotationCycle[]): ThemeRepeat[] {
  const seen = new Map<string, { date: string; count: number }>();
  const hits: ThemeRepeat[] = [];
  const ordered = [...cycles].sort((a, b) =>
    (a.days[0]?.date ?? "").localeCompare(b.days[0]?.date ?? ""),
  );
  for (const cycle of ordered) {
    for (const day of [...cycle.days].sort(byDate)) remember(seen, day, hits);
  }
  return hits;
}

/**
 * Repeats in a new cycle against prior history, then within the new cycle.
 * `priorDays` is every saved assignment before this cycle.
 */
export function repeatedThemesAgainstHistory(
  days: RotationDay[],
  priorDays: RotationDay[],
): ThemeRepeat[] {
  const seen = new Map<string, { date: string; count: number }>();
  const ignored: ThemeRepeat[] = [];
  for (const day of [...priorDays].sort(byDate)) remember(seen, day, ignored);
  const hits: ThemeRepeat[] = [];
  for (const day of [...days].sort(byDate)) remember(seen, day, hits);
  return hits;
}

export function formatThemeRepeat(
  hit: ThemeRepeat,
  members: Member[],
  valueItems: ValueItem[],
): string {
  const name =
    members.find((member) => member.id === hit.memberId)?.displayName ??
    hit.memberId;
  const label =
    valueItems.find((item) => item.id === hit.valueItemId)?.label ??
    hit.valueItemId;
  const code = themeCodeFromLabel(label);
  return `${name} ${code} は ${hit.date} が${hit.occurrence}度目（前回 ${hit.previousDate}）`;
}
