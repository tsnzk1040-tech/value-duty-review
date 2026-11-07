import type { Member, MemberId, RotationCycle, RotationDay, ValueItem } from "./types";
import { themeCodeFromLabel } from "./format-notebook";

/** At least one prior cycle with days — required before generating. */
export function hasPreviousRotation(historyCycles: RotationCycle[]): boolean {
  return historyCycles.some((c) => c.days.length > 0);
}

export function latestPreviousCycle(
  historyCycles: RotationCycle[],
): RotationCycle | undefined {
  const withDays = historyCycles.filter((c) => c.days.length > 0);
  if (withDays.length === 0) return undefined;
  return withDays[withDays.length - 1];
}

/** Keep newest cycles only. Default covers a full guideline catalog tour. */
export function historyCycleKeepCount(themeCount: number): number {
  return Math.max(2, themeCount);
}

/** Keep newest cycles so the same guideline is not forgotten. */
export function appendHistoryCycle(
  historyCycles: RotationCycle[],
  cycle: RotationCycle,
  keep = 20,
): RotationCycle[] {
  return withoutStubHistoryCycles([...historyCycles, cycle]).slice(-keep);
}

/** Seed/demo stub — must not pollute unused-theme history. */
export function isStubHistoryCycle(cycle: RotationCycle): boolean {
  return cycle.id === "hist-prev" || /（仮）/.test(cycle.label);
}

export function withoutStubHistoryCycles(
  cycles: RotationCycle[],
): RotationCycle[] {
  return cycles.filter((c) => !isStubHistoryCycle(c) && c.days.length > 0);
}

/**
 * Keep stored cycles that sit outside the canonical actuals, then append seed.
 * A stored cycle is dropped when its start matches a canonical start, or when
 * it begins inside the latest canonical window (generated stand-in).
 * A stored cycle that starts after the latest canonical end is kept, so the
 * next rotation set in the app survives reload and becomes the comparison base.
 */
export function mergeCanonicalHistory(
  stored: RotationCycle[],
  canonical: RotationCycle[],
): RotationCycle[] {
  const canon = withoutStubHistoryCycles(canonical);
  const storedClean = withoutStubHistoryCycles(stored);
  if (canon.length === 0) return storedClean;

  const canonicalStarts = new Set(
    canon
      .map((c) => c.days[0]?.date)
      .filter((d): d is string => Boolean(d)),
  );
  const latest = canon[canon.length - 1]!;
  const latestStart = latest.days[0]!.date;
  const latestEnd = latest.days[latest.days.length - 1]!.date;

  const older: RotationCycle[] = [];
  const newer: RotationCycle[] = [];
  for (const cycle of storedClean) {
    const first = cycle.days[0]?.date;
    if (!first) continue;
    if (canonicalStarts.has(first)) continue;
    if (first > latestEnd) {
      newer.push(cycle);
      continue;
    }
    if (first < latestStart) older.push(cycle);
  }

  const merged = [
    ...older,
    ...canon.map((c) => ({
      ...c,
      days: structuredClone(c.days),
    })),
    ...newer,
  ];
  return merged.sort((a, b) =>
    (a.days[0]?.date ?? "").localeCompare(b.days[0]?.date ?? ""),
  );
}

/** Undirected next-door pairs from one cycle (consecutive days only). */
export function cycleNeighborIds(
  cycle: RotationCycle | undefined,
): Map<MemberId, Set<MemberId>> {
  const map = new Map<MemberId, Set<MemberId>>();
  const add = (a: MemberId, b: MemberId) => {
    if (!a || !b || a === b) return;
    const set = map.get(a) ?? new Set<MemberId>();
    set.add(b);
    map.set(a, set);
  };
  const days = cycle?.days ?? [];
  for (let i = 0; i < days.length - 1; i += 1) {
    add(days[i]!.memberId, days[i + 1]!.memberId);
    add(days[i + 1]!.memberId, days[i]!.memberId);
  }
  return map;
}

export function cycleFromDays(
  days: RotationDay[],
  labelPrefix = "確定サイクル",
): RotationCycle {
  const first = days[0]?.date ?? "unknown";
  const last = days[days.length - 1]?.date ?? first;
  return {
    id: `cycle-${first}-${last}-${Date.now().toString(36)}`,
    label: `${labelPrefix} ${first}〜${last}`,
    days: structuredClone(days),
  };
}

function resolveThemeId(
  themeCell: string,
  valueItems: ValueItem[],
): string | undefined {
  const cell = themeCell.trim();
  const byId = valueItems.find((v) => v.id === cell);
  if (byId) return byId.id;
  const byExact = valueItems.find((v) => v.label === cell);
  if (byExact) return byExact.id;
  const code = themeCodeFromLabel(cell);
  const byCode = valueItems.find(
    (v) => themeCodeFromLabel(v.label) === code || v.label.startsWith(cell),
  );
  return byCode?.id;
}

function resolveMemberId(
  nameCell: string,
  members: Member[],
): string | undefined {
  const name = nameCell.trim();
  const aliases: Record<string, string> = {
    "小林(拓)さん": "m-kobayashi-taku",
  };
  const aliased = aliases[name];
  if (aliased && members.some((m) => m.id === aliased)) return aliased;
  return members.find((m) => m.displayName === name)?.id;
}

export type ParseRotationResult = {
  days: RotationDay[];
  errors: string[];
};

const GAP_CELL_RE = /^(前回から)?\d+営業日$/;

/**
 * Parse notebook-like lines: `YYYY-MM-DD  当番名  テーマ`（Tab も可。任意で前回間隔）。
 */
export function parseRotationPaste(
  text: string,
  members: Member[],
  valueItems: ValueItem[],
): ParseRotationResult {
  const days: RotationDay[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]!.trim();
    if (!raw) continue;
    if (raw.startsWith("日付") || raw.includes("ローテ（")) continue;
    if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) continue;

    const parts = raw.includes("\t")
      ? raw.split("\t").map((s) => s.trim())
      : raw.split(/\s{2,}/).map((s) => s.trim());

    let date = "";
    let who = "";
    let theme = "";
    if (parts.length >= 3) {
      date = parts[0]!;
      who = parts[1]!;
      const rest = parts.slice(2).filter(Boolean);
      if (rest.length >= 2 && GAP_CELL_RE.test(rest[rest.length - 1]!)) {
        theme = rest.slice(0, -1).join(" ");
      } else {
        theme = rest.join(" ");
      }
    } else {
      const m = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\S+)\s+(.+)$/);
      if (!m) {
        errors.push(`${i + 1}行目を読めなかった: ${raw}`);
        continue;
      }
      date = m[1]!;
      who = m[2]!;
      theme = m[3]!.replace(/\s+(前回から)?\d+営業日$/, "").trim();
    }

    const memberId = resolveMemberId(who, members);
    if (!memberId) {
      errors.push(`${date}: メンバー「${who}」がマスタにない`);
      continue;
    }
    const valueItemId = resolveThemeId(theme, valueItems);
    if (!valueItemId) {
      errors.push(`${date}: テーマ「${theme}」がマスタにない`);
      continue;
    }
    days.push({ date, memberId, valueItemId });
  }

  if (days.length === 0 && errors.length === 0) {
    errors.push(
      "日別行が見つからない。形式は「YYYY-MM-DD  当番  テーマ」（任意で前回間隔）",
    );
  }

  return { days, errors };
}
