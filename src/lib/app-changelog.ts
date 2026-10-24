import data from "@/lib/app-changelog.json";

export const APP_REPO_COMMIT_BASE =
  "https://github.com/tsnzk1040-tech/value-duty-review/commit";

export type AppChangelogEntry = {
  hash: string;
  date: string;
  subject: string;
};

export type AppChangelogDay = {
  date: string;
  entries: AppChangelogEntry[];
};

export type AppChangelogMonth = {
  month: string;
  days: AppChangelogDay[];
};

export type AppChangelogYear = {
  year: string;
  months: AppChangelogMonth[];
};

export const APP_HEAD = data.head;

export const APP_CHANGELOG: AppChangelogEntry[] = data.entries;

export function commitUrl(hash: string): string {
  return `${APP_REPO_COMMIT_BASE}/${hash}`;
}

/** 新しい順の履歴を、年 → 月 → 日にまとめる。 */
export function groupChangelogByYear(
  entries: AppChangelogEntry[],
): AppChangelogYear[] {
  const years: AppChangelogYear[] = [];
  for (const entry of entries) {
    const [year = entry.date, month = ""] = entry.date.split("-");
    let yearGroup = years.find((group) => group.year === year);
    if (!yearGroup) {
      yearGroup = { year, months: [] };
      years.push(yearGroup);
    }
    let monthGroup = yearGroup.months.find((group) => group.month === month);
    if (!monthGroup) {
      monthGroup = { month, days: [] };
      yearGroup.months.push(monthGroup);
    }
    let dayGroup = monthGroup.days.find((day) => day.date === entry.date);
    if (!dayGroup) {
      dayGroup = { date: entry.date, entries: [] };
      monthGroup.days.push(dayGroup);
    }
    dayGroup.entries.push(entry);
  }
  return years;
}
