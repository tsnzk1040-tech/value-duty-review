/** Business-day helpers. Weekends + Japanese public holidays + optional extras. */

import { createJapaneseHolidayLookup } from "./japanese-holidays";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type BusinessDayOptions = {
  skipWeekends?: boolean;
  /**
   * Auto-skip Japanese public holidays for years touched by the walk.
   * Default true (hands-free).
   */
  skipJapaneseHolidays?: boolean;
  /** Extra non-working days YYYY-MM-DD (company closed days, etc.) */
  holidays?: string[];
};

export type ListBusinessDaysMeta = {
  days: string[];
  /** Japanese holidays skipped while collecting `days` (may include weekend holidays). */
  skippedJapaneseHolidays: { date: string; name: string }[];
};

function isNonWorkingDay(
  ymd: string,
  options: BusinessDayOptions,
  jp: ReturnType<typeof createJapaneseHolidayLookup> | null,
): boolean {
  const skipWeekends = options.skipWeekends !== false;
  if (skipWeekends) {
    const day = parseYmd(ymd).getUTCDay();
    if (day === 0 || day === 6) return true;
  }
  if (options.skipJapaneseHolidays !== false && jp?.isHoliday(ymd)) {
    return true;
  }
  const holidays = new Set(options.holidays ?? []);
  return holidays.has(ymd);
}

export function isWeekend(ymd: string): boolean {
  const day = parseYmd(ymd).getUTCDay();
  return day === 0 || day === 6;
}

export function addCalendarDays(ymd: string, delta: number): string {
  const date = parseYmd(ymd);
  return formatYmd(new Date(date.getTime() + delta * DAY_MS));
}

/** Today as YYYY-MM-DD in Asia/Tokyo. */
export function todayYmdJst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Next business day strictly after `fromYmd` (weekends / JP holidays / extras skipped).
 * PoC default cycle start: つぎ営業日.
 */
export function nextBusinessDayAfter(
  fromYmd: string,
  options: BusinessDayOptions = {},
): string {
  const start = addCalendarDays(fromYmd, 1);
  const days = listBusinessDays(start, 1, options);
  return days[0] ?? start;
}

/** Default cycle start for fresh settings / reset. */
export function defaultCycleStartYmd(now: Date = new Date()): string {
  return nextBusinessDayAfter(todayYmdJst(now), {
    skipWeekends: true,
    skipJapaneseHolidays: true,
    holidays: [],
  });
}

/** Inclusive list of `count` business days starting at `startYmd`. */
export function listBusinessDays(
  startYmd: string,
  count: number,
  options: BusinessDayOptions = {},
): string[] {
  return listBusinessDaysWithMeta(startYmd, count, options).days;
}

/**
 * Same as listBusinessDays, plus which JP holidays were encountered in the walk window.
 */
export function listBusinessDaysWithMeta(
  startYmd: string,
  count: number,
  options: BusinessDayOptions = {},
): ListBusinessDaysMeta {
  const out: string[] = [];
  const skippedJapaneseHolidays: { date: string; name: string }[] = [];
  const jp =
    options.skipJapaneseHolidays === false
      ? null
      : createJapaneseHolidayLookup();
  let cursor = parseYmd(startYmd);
  // Safety cap to avoid infinite loop if everything is holiday
  let guard = 0;
  while (out.length < count && guard < count * 10 + 366) {
    const ymd = formatYmd(cursor);
    if (jp) {
      const name = jp.nameOf(ymd);
      if (name) {
        skippedJapaneseHolidays.push({ date: ymd, name });
      }
    }
    if (!isNonWorkingDay(ymd, options, jp)) out.push(ymd);
    cursor = new Date(cursor.getTime() + DAY_MS);
    guard += 1;
  }
  return { days: out, skippedJapaneseHolidays };
}

/**
 * Count of business days from `fromYmd` (exclusive) to `toYmd` (inclusive).
 * If to <= from, returns 0.
 */
export function businessDaysBetween(
  fromYmd: string,
  toYmd: string,
  options: BusinessDayOptions = {},
): number {
  if (toYmd <= fromYmd) return 0;
  const jp =
    options.skipJapaneseHolidays === false
      ? null
      : createJapaneseHolidayLookup();
  let n = 0;
  let cursor = new Date(parseYmd(fromYmd).getTime() + DAY_MS);
  const end = parseYmd(toYmd);
  while (cursor.getTime() <= end.getTime()) {
    const ymd = formatYmd(cursor);
    if (!isNonWorkingDay(ymd, options, jp)) n += 1;
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return n;
}
