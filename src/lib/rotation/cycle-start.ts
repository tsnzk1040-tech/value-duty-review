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
 * Auto start = later of:
 * - 今日のつぎ営業日
 * - 前回ローテ最終日のつぎ営業日
 * so daily operation never overlaps the previous cycle and stays current.
 */
export function autoCycleStartYmd(
  historyCycles: RotationCycle[],
  calendar?: BusinessDayOptions,
  now: Date = new Date(),
): string {
  const opts = calendarOpts(calendar);
  const fromToday = defaultCycleStartYmd(now);
  const prev = latestPreviousCycle(historyCycles);
  const last = prev?.days[prev.days.length - 1]?.date;
  if (!last) return fromToday;
  const fromPrev = nextBusinessDayAfter(last, opts);
  return fromPrev > fromToday ? fromPrev : fromToday;
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
