/** Business-day helpers. Weekends + optional holiday list. */

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
  holidays?: string[];
};

function isNonWorkingDay(ymd: string, options: BusinessDayOptions): boolean {
  const skipWeekends = options.skipWeekends !== false;
  if (skipWeekends) {
    const day = parseYmd(ymd).getUTCDay();
    if (day === 0 || day === 6) return true;
  }
  const holidays = new Set(options.holidays ?? []);
  return holidays.has(ymd);
}

export function isWeekend(ymd: string): boolean {
  const day = parseYmd(ymd).getUTCDay();
  return day === 0 || day === 6;
}

/** Inclusive list of `count` business days starting at `startYmd`. */
export function listBusinessDays(
  startYmd: string,
  count: number,
  options: BusinessDayOptions = {},
): string[] {
  const out: string[] = [];
  let cursor = parseYmd(startYmd);
  // Safety cap to avoid infinite loop if everything is holiday
  let guard = 0;
  while (out.length < count && guard < count * 10 + 366) {
    const ymd = formatYmd(cursor);
    if (!isNonWorkingDay(ymd, options)) out.push(ymd);
    cursor = new Date(cursor.getTime() + DAY_MS);
    guard += 1;
  }
  return out;
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
  let n = 0;
  let cursor = new Date(parseYmd(fromYmd).getTime() + DAY_MS);
  const end = parseYmd(toYmd);
  while (cursor.getTime() <= end.getTime()) {
    const ymd = formatYmd(cursor);
    if (!isNonWorkingDay(ymd, options)) n += 1;
    cursor = new Date(cursor.getTime() + DAY_MS);
  }
  return n;
}
