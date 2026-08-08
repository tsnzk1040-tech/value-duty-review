import {
  businessDaysBetween,
  listBusinessDaysWithMeta,
  type BusinessDayOptions,
} from "./business-days";
import { hasPreviousRotation, latestPreviousCycle } from "./previous-cycle";
import { resolveCycleStart } from "./cycle-start";
import { resolveThemeStart } from "./theme-start";
import type {
  FairAssignInput,
  FairAssignResult,
  Member,
  MemberId,
  RotationDay,
  ValueItemId,
} from "./types";
import { valueGroupForItem } from "./value-group";

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
 * Theme-first rotation assigner.
 * Essence: walk themes; place on non-weekend/holiday dates; space people;
 * avoid same Value as last turn; 常塚 (closer) last so next cycle can be designed.
 */
export function fairAssign(input: FairAssignOptions): FairAssignResult {
  const active = input.members.filter((m) => m.active);
  const warnings: string[] = [];
  if (active.length === 0) {
    return { days: [], warnings: ["アクティブなメンバーがいません"] };
  }
  if (input.valueItems.length === 0) {
    return { days: [], warnings: ["行動指針がありません"] };
  }
  if (!hasPreviousRotation(input.historyCycles)) {
    return {
      days: [],
      warnings: [
        "前回のローテが必須です。前回分を登録してから生成してください。",
      ],
    };
  }

  const calendar: BusinessDayOptions = {
    skipWeekends: input.calendar?.skipWeekends ?? true,
    skipJapaneseHolidays: input.calendar?.skipJapaneseHolidays ?? true,
    holidays: input.calendar?.holidays ?? [],
  };
  const rand = mulberry32(input.seed);

  const cycleResolved = resolveCycleStart(
    input.cycleStart,
    input.historyCycles,
    calendar,
  );
  if (cycleResolved.source === "auto") {
    warnings.push(
      `開始日（自動）: ${cycleResolved.ymd}（いま決まっているローテ最終のつぎ営業日）`,
    );
  } else {
    warnings.push(`開始日（手動）: ${cycleResolved.ymd}`);
  }

  const themeResolved = resolveThemeStart(
    input.themeStartValueItemId,
    input.historyCycles,
    input.valueItems,
  );
  const themeStartIndex = themeResolved.index;

  // Slots always follow active headcount (no sit-outs). Catalog wraps.
  const themeSlotCount = active.length;

  const themeSequence = Array.from({ length: themeSlotCount }, (_, di) => {
    return input.valueItems[
      (themeStartIndex + di) % input.valueItems.length
    ]!;
  });

  const { days: dates, skippedJapaneseHolidays } = listBusinessDaysWithMeta(
    cycleResolved.ymd,
    themeSlotCount,
    calendar,
  );
  if (skippedJapaneseHolidays.length > 0) {
    const sample = skippedJapaneseHolidays
      .map((h) => `${h.date}（${h.name}）`)
      .join("、");
    warnings.push(
      `土日祝を避けて日付配置（スキップした祝日 ${skippedJapaneseHolidays.length}日）: ${sample}`,
    );
  }

  if (themeResolved.source === "auto" && themeResolved.previousValueItemId) {
    const prevLabel =
      input.valueItems.find((v) => v.id === themeResolved.previousValueItemId)
        ?.label ?? themeResolved.previousValueItemId;
    const nextLabel =
      input.valueItems.find((v) => v.id === themeResolved.valueItemId)?.label ??
      themeResolved.valueItemId;
    warnings.push(
      `開始テーマ（自動）: ${nextLabel} ← 前サイクル最終 ${themeResolved.previousDate ?? ""} ${prevLabel} の次`,
    );
  } else if (themeResolved.source === "manual") {
    const label =
      input.valueItems.find((v) => v.id === themeResolved.valueItemId)?.label ??
      themeResolved.valueItemId;
    warnings.push(`開始テーマ（手動）: ${label}`);
  } else if (themeResolved.source === "fallback") {
    const label =
      input.valueItems.find((v) => v.id === themeResolved.valueItemId)?.label ??
      themeResolved.valueItemId;
    warnings.push(
      `開始テーマ（フォールバック）: ${label}（履歴なし、または指定ID不明）`,
    );
  }

  warnings.push(
    `テーマ枠 ${themeSlotCount}（カタログ ${input.valueItems.length}・メンバー ${active.length}）。テーマ巡回が本質。日付は土日祝を避けて乗せる。休み番なし。`,
  );

  const themeStartMeta = {
    valueItemId: themeResolved.valueItemId,
    source: themeResolved.source,
    previousValueItemId: themeResolved.previousValueItemId,
  };

  const historyDays: RotationDay[] = input.historyCycles.flatMap((c) => c.days);
  const historyLastAssignDate = new Map<MemberId, string>();
  for (const day of historyDays) {
    historyLastAssignDate.set(day.memberId, day.date);
  }

  const prevCycle = latestPreviousCycle(input.historyCycles);
  const prevCycleLast = prevCycle?.days[prevCycle.days.length - 1]?.date;
  if (prevCycleLast) {
    const cycleGap = businessDaysBetween(
      prevCycleLast,
      cycleResolved.ymd,
      calendar,
    );
    warnings.push(
      `前回ローテとの間隔: 最終 ${prevCycleLast} → 開始 ${cycleResolved.ymd}（${cycleGap}営業日）`,
    );
  }

  const built: RotationDay[] = [];

  const memberCount = new Map<MemberId, number>();
  for (const m of active) memberCount.set(m.id, 0);

  const lastAssignDate = new Map<MemberId, string>();
  const lastThemeId = new Map<MemberId, ValueItemId>();
  for (const day of historyDays) {
    lastAssignDate.set(day.memberId, day.date);
    lastThemeId.set(day.memberId, day.valueItemId);
  }

  const closerId = input.lastAssigneeMemberId?.trim() || "";
  const closer =
    closerId.length > 0 ? active.find((m) => m.id === closerId) : undefined;
  if (closerId && !closer) {
    warnings.push(
      `最終当番メンバー（${closerId}）がアクティブ一覧にいません。最終日ロックをスキップします`,
    );
  }

  const newcomers = active.filter(
    (m) => m.newcomer && (!closer || m.id !== closer.id),
  );
  if (newcomers.length > 0) {
    warnings.push(
      `新人 ${newcomers.length}名はローテ後方（最終当番の直前）に配置: ${newcomers
        .map((m) => m.displayName)
        .join("、")}`,
    );
  }

  for (let di = 0; di < dates.length; di += 1) {
    const date = dates[di]!;
    const valueItem = themeSequence[di]!;
    const themeValue = valueGroupForItem(valueItem.id, input.valueItems);
    const isLastDay = di === dates.length - 1;
    const forceCloser = Boolean(isLastDay && closer);

    const pool: Member[] =
      closer && !forceCloser
        ? active.filter((m) => m.id !== closer.id)
        : active;

    const veterans = pool.filter((m) => !m.newcomer);
    const newcomerPool = pool.filter((m) => Boolean(m.newcomer));

    // Veterans first; newcomers only after all veterans have their turn (end of cycle, before closer).
    const veteranPending = veterans.filter(
      (m) => (memberCount.get(m.id) ?? 0) === 0,
    );
    const stagePool =
      !forceCloser && veteranPending.length > 0 ? veterans : pool;
    const stageFocus =
      !forceCloser && veteranPending.length > 0
        ? veteranPending
        : !forceCloser && newcomerPool.length > 0 && veteranPending.length === 0
          ? newcomerPool.filter((m) => (memberCount.get(m.id) ?? 0) === 0)
          : stagePool;

    const minCount = stageFocus.reduce(
      (min, m) => Math.min(min, memberCount.get(m.id) ?? 0),
      Number.POSITIVE_INFINITY,
    );
    let eligible =
      stageFocus.length === 0
        ? pool
        : stageFocus.filter((m) => (memberCount.get(m.id) ?? 0) === minCount);

    // Prefer people whose previous Value ≠ this theme's Value
    if (themeValue != null && !forceCloser) {
      const differentValue = eligible.filter((m) => {
        const prevId = lastThemeId.get(m.id);
        if (!prevId) return true;
        const prevVal = valueGroupForItem(prevId, input.valueItems);
        return prevVal !== themeValue;
      });
      if (differentValue.length > 0) eligible = differentValue;
    }

    const member = forceCloser
      ? closer!
      : pickWeighted(
          eligible.length > 0 ? eligible : pool,
          (m) => {
            let score = 10;
            if (m.newcomer && veteranPending.length > 0) score -= 30;
            const last = lastAssignDate.get(m.id);
            if (last) {
              const gap = businessDaysBetween(last, date, calendar);
              if (gap < input.cooldownBusinessDays) {
                score -= (input.cooldownBusinessDays - gap) * 10;
              }
            }
            const prevId = lastThemeId.get(m.id);
            if (prevId && themeValue != null) {
              const prevVal = valueGroupForItem(prevId, input.valueItems);
              if (prevVal === themeValue) score -= 20;
            }
            if (built.length > 0 && built[built.length - 1]!.memberId === m.id) {
              score -= 12;
            }
            return score;
          },
          rand,
        );

    const prevHistoryDate = historyLastAssignDate.get(member.id);
    const gapFromPreviousBusinessDays = prevHistoryDate
      ? businessDaysBetween(prevHistoryDate, date, calendar)
      : undefined;

    const day: RotationDay = {
      date,
      memberId: member.id,
      valueItemId: valueItem.id,
      gapFromPreviousBusinessDays,
    };
    built.push(day);

    lastAssignDate.set(member.id, date);
    lastThemeId.set(member.id, valueItem.id);
    memberCount.set(member.id, (memberCount.get(member.id) ?? 0) + 1);
  }

  if (closer && built.length > 0) {
    const last = built[built.length - 1]!;
    if (last.memberId !== closer.id) {
      warnings.push(
        `最低限ルール未達: 最終が ${closer.displayName} になっていません（次ローテ設計のため最終固定）`,
      );
    }
  }

  const doubles = active.filter((m) => (memberCount.get(m.id) ?? 0) >= 2);
  if (doubles.length > 0) {
    warnings.push(
      `同一サイクルで2回以上: ${doubles
        .map((m) => `${m.displayName}×${memberCount.get(m.id)}`)
        .join("、")}`,
    );
  }

  for (const m of active) {
    const count = memberCount.get(m.id) ?? 0;
    if (count === 0) {
      warnings.push(`${m.displayName} が0回です（想定外・手直し推奨）`);
    }
  }

  let cooldownHits = 0;
  let sameValueHits = 0;
  for (let i = 0; i < built.length; i += 1) {
    const day = built[i]!;
    const prevDays = [...historyDays, ...built.slice(0, i)].filter(
      (d) => d.memberId === day.memberId,
    );
    const prev = prevDays.map((d) => d.date).sort().at(-1);
    if (prev) {
      const gap = businessDaysBetween(prev, day.date, calendar);
      if (gap > 0 && gap < input.cooldownBusinessDays) cooldownHits += 1;
    }
    const prevTheme = prevDays.at(-1)?.valueItemId;
    if (prevTheme) {
      const a = valueGroupForItem(prevTheme, input.valueItems);
      const b = valueGroupForItem(day.valueItemId, input.valueItems);
      if (a != null && a === b) sameValueHits += 1;
    }
  }
  if (cooldownHits > 0) {
    warnings.push(
      `日付が近すぎる当番が ${cooldownHits} 件（クールダウン目安 ${input.cooldownBusinessDays} 営業日）`,
    );
  }
  if (sameValueHits > 0) {
    warnings.push(
      `前回と同じ Value 帯の当番が ${sameValueHits} 件（手直し可）`,
    );
  }

  return { days: built, warnings, themeStart: themeStartMeta };
}
