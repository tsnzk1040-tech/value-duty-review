import {
  defaultCycleStartYmd,
  nextBusinessDayAfter,
  type BusinessDayOptions,
} from "./business-days";
import { latestPreviousCycle } from "./previous-cycle";
import type { RotationCycle } from "./types";

/** Empty / `__auto__` = hands-free cycle start. */
export const CYCLE_START_AUTO = "";

export type CycleStartResolution = {
  ymd: string;
  source: "auto" | "manual";
};

function calendarOpts(calendar?: BusinessDayOptions): BusinessDayOptions {
  return {
    skipWeekends: calendar?.skipWeekends !== false,
    skipJapaneseHolidays: calendar?.skipJapaneseHolidays !== false,
    holidays: calendar?.holidays ?? [],
  };
}

/**
 * Auto start = いま決まっている（前回）ローテ最終日のつぎ営業日。
 * 「今日」基準にはしない（シャッフルしても同じスタートになる）。
 */
export function autoCycleStartYmd(
  historyCycles: RotationCycle[],
  calendar?: BusinessDayOptions,
  now: Date = new Date(),
): string {
  const opts = calendarOpts(calendar);
  const prev = latestPreviousCycle(historyCycles);
  const last = prev?.days[prev.days.length - 1]?.date;
  if (!last) return defaultCycleStartYmd(now);
  return nextBusinessDayAfter(last, opts);
}

export function resolveCycleStart(
  cycleStart: string | undefined,
  historyCycles: RotationCycle[],
  calendar?: BusinessDayOptions,
  now: Date = new Date(),
): CycleStartResolution {
  const raw = cycleStart?.trim() ?? "";
  const wantsAuto = raw === "" || raw === "__auto__";
  if (wantsAuto) {
    return {
      ymd: autoCycleStartYmd(historyCycles, calendar, now),
      source: "auto",
    };
  }
  return { ymd: raw, source: "manual" };
}
