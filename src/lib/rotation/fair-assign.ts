import {
  businessDaysBetween,
  listBusinessDays,
  type BusinessDayOptions,
} from "./business-days";
import type {
  FairAssignInput,
  FairAssignResult,
  MemberId,
  RotationDay,
  ValueItemId,
} from "./types";

/** Mulberry32 — small deterministic PRNG from a numeric seed. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(
  items: T[],
  score: (item: T) => number,
  rand: () => number,
): T {
  const weights = items.map((item) => Math.max(0.0001, score(item)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export type FairAssignOptions = FairAssignInput & {
  calendar?: BusinessDayOptions;
};

/**
 * Fair rotation assigner (POC skill implementation).
 * Encodes DECISIONS §7: cooldown ~7 BD, theme diversity over ~2 cycles, balance.
 */
export function fairAssign(input: FairAssignOptions): FairAssignResult {
  const active = input.members.filter((m) => m.active);
  const warnings: string[] = [];
  if (active.length === 0) {
    return { days: [], warnings: ["アクティブなメンバーがいません"] };
  }
  if (input.valueItems.length === 0) {
    return { days: [], warnings: ["Value枝がありません"] };
  }

  const calendar = input.calendar ?? { skipWeekends: true, holidays: [] };
  const rand = mulberry32(input.seed);
  const dates = listBusinessDays(
    input.cycleStart,
    input.businessDayCount,
    calendar,
  );

  const historyDays: RotationDay[] = input.historyCycles.flatMap((c) => c.days);
  const built: RotationDay[] = [];

  const memberCount = new Map<MemberId, number>();
  const themeCount = new Map<ValueItemId, number>();
  for (const m of active) memberCount.set(m.id, 0);
  for (const v of input.valueItems) themeCount.set(v.id, 0);

  const lastAssignDate = new Map<MemberId, string>();
  for (const day of historyDays) {
    lastAssignDate.set(day.memberId, day.date);
  }

  const themesByMember = new Map<MemberId, Set<ValueItemId>>();
  for (const m of active) themesByMember.set(m.id, new Set());
  for (const day of historyDays) {
    const set = themesByMember.get(day.memberId);
    if (set) set.add(day.valueItemId);
  }

  for (const date of dates) {
    const member = pickWeighted(
      active,
      (m) => {
        let score = 10;
        const last = lastAssignDate.get(m.id);
        if (last) {
          const gap = businessDaysBetween(last, date, calendar);
          if (gap < input.cooldownBusinessDays) {
            score -= (input.cooldownBusinessDays - gap) * 8;
          }
        }
        const assigned = memberCount.get(m.id) ?? 0;
        const avg =
          built.length === 0 ? 0 : built.length / Math.max(active.length, 1);
        score -= (assigned - avg) * 3;
        if (built.length > 0 && built[built.length - 1].memberId === m.id) {
          score -= 12;
        }
        return score;
      },
      rand,
    );

    const usedThemes = themesByMember.get(member.id) ?? new Set();
    const valueItem = pickWeighted(
      input.valueItems,
      (v) => {
        let score = 10;
        if (usedThemes.has(v.id)) score -= 9;
        const tc = themeCount.get(v.id) ?? 0;
        const avg =
          built.length === 0
            ? 0
            : built.length / Math.max(input.valueItems.length, 1);
        score -= (tc - avg) * 2;
        return score;
      },
      rand,
    );

    const day: RotationDay = {
      date,
      memberId: member.id,
      valueItemId: valueItem.id,
    };
    built.push(day);

    lastAssignDate.set(member.id, date);
    memberCount.set(member.id, (memberCount.get(member.id) ?? 0) + 1);
    themeCount.set(valueItem.id, (themeCount.get(valueItem.id) ?? 0) + 1);
    usedThemes.add(valueItem.id);
  }

  for (const m of active) {
    const count = memberCount.get(m.id) ?? 0;
    if (count === 0) warnings.push(`${m.displayName} が0回です（手直し推奨）`);
  }

  let cooldownHits = 0;
  for (let i = 0; i < built.length; i += 1) {
    const day = built[i];
    const prev = [...historyDays, ...built.slice(0, i)]
      .filter((d) => d.memberId === day.memberId)
      .map((d) => d.date)
      .sort()
      .at(-1);
    if (prev) {
      const gap = businessDaysBetween(prev, day.date, calendar);
      if (gap > 0 && gap < input.cooldownBusinessDays) cooldownHits += 1;
    }
  }
  if (cooldownHits > 0) {
    warnings.push(
      `クールダウン未達が ${cooldownHits} 日あります（メンバー数に対して日数が多いと起きやすい。手直し可）`,
    );
  }

  return { days: built, warnings };
}
