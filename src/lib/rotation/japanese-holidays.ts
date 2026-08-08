import holiday_jp from "@holiday-jp/holiday_jp";

/** Format a Date as YYYY-MM-DD using UTC calendar fields (holiday_jp stores UTC midnight). */
function formatUtcYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local calendar Date for a YYYY-MM-DD (noon JST-safe via UTC noon). */
function ymdToUtcNoon(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export type JapaneseHoliday = {
  date: string; // YYYY-MM-DD
  name: string;
};

/**
 * Japanese public holidays in [fromYmd, toYmd] inclusive.
 * Uses @holiday-jp/holiday_jp (covers many years; update the package when needed).
 */
export function japaneseHolidaysBetween(
  fromYmd: string,
  toYmd: string,
): JapaneseHoliday[] {
  if (!fromYmd || !toYmd || toYmd < fromYmd) return [];
  const from = ymdToUtcNoon(fromYmd);
  const to = ymdToUtcNoon(toYmd);
  return holiday_jp.between(from, to).map((h) => ({
    date: formatUtcYmd(h.date instanceof Date ? h.date : new Date(h.date)),
    name: h.name,
  }));
}

/** Year-scoped cache for fast per-day checks while walking a calendar. */
export function createJapaneseHolidayLookup(): {
  isHoliday: (ymd: string) => boolean;
  nameOf: (ymd: string) => string | undefined;
} {
  const byYear = new Map<number, Map<string, string>>();

  function ensureYear(year: number): Map<string, string> {
    let map = byYear.get(year);
    if (map) return map;
    map = new Map();
    const list = japaneseHolidaysBetween(`${year}-01-01`, `${year}-12-31`);
    for (const h of list) map.set(h.date, h.name);
    byYear.set(year, map);
    return map;
  }

  return {
    isHoliday(ymd: string) {
      const year = Number(ymd.slice(0, 4));
      if (!Number.isFinite(year)) return false;
      return ensureYear(year).has(ymd);
    },
    nameOf(ymd: string) {
      const year = Number(ymd.slice(0, 4));
      if (!Number.isFinite(year)) return undefined;
      return ensureYear(year).get(ymd);
    },
  };
}
