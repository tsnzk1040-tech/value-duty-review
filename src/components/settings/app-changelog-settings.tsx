"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  APP_CHANGELOG,
  APP_HEAD,
  commitUrl,
  groupChangelogByYear,
  type AppChangelogEntry,
} from "@/lib/app-changelog";

function dayLabel(isoDate: string): string {
  const day = isoDate.split("-")[2];
  if (!day) return isoDate;
  return `${Number(day)}日`;
}

function monthLabel(month: string): string {
  if (!month) return month;
  return `${Number(month)}月`;
}

function CommitBadge({ hash }: { hash: string }) {
  return (
    <Badge
      variant="outline"
      render={
        <a href={commitUrl(hash)} target="_blank" rel="noopener noreferrer" />
      }
    >
      {hash}
    </Badge>
  );
}

function EntryList({ entries }: { entries: AppChangelogEntry[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => (
        <li key={entry.hash} className="flex items-start justify-between gap-2">
          <span className="text-sm text-muted-foreground">{entry.subject}</span>
          <CommitBadge hash={entry.hash} />
        </li>
      ))}
    </ul>
  );
}

export function AppChangelogSettings() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalized) return APP_CHANGELOG;
    return APP_CHANGELOG.filter((entry) => {
      const haystack = `${entry.subject} ${entry.hash} ${entry.date}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [normalized]);
  const years = groupChangelogByYear(filtered);
  const searching = normalized.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">このビルド</p>
        <div className="flex items-center gap-2">
          <CommitBadge hash={APP_HEAD} />
        </div>
        <p className="text-sm text-muted-foreground">
          リポの git と Vercel のデプロイは、このコミット番号で照合する。各行の番号も同じ。
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" htmlFor="app-changelog-query">
          絞り込み
        </label>
        <Input
          id="app-changelog-query"
          value={query}
          placeholder="内容かコミット番号"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length}件</p>
      {years.length === 0 ? (
        <p className="text-sm text-muted-foreground">一致する改修はない。</p>
      ) : (
        <div className="flex flex-col gap-2">
          {years.map((year, yearIndex) => (
            <Collapsible
              key={`${normalized}:${year.year}`}
              defaultOpen={searching || yearIndex === 0}
            >
              <CollapsibleTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-between px-2"
                  />
                }
              >
                <span className="text-sm font-medium">{year.year}年</span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform in-data-[panel-open]:rotate-180"
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-col gap-2 pt-1 pl-2">
                  {year.months.map((month, monthIndex) => (
                    <Collapsible
                      key={month.month}
                      defaultOpen={
                        searching || (yearIndex === 0 && monthIndex === 0)
                      }
                    >
                      <CollapsibleTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            className="w-full justify-between px-2"
                          />
                        }
                      >
                        <span className="text-sm font-medium">
                          {monthLabel(month.month)}
                        </span>
                        <ChevronDown
                          className="size-4 shrink-0 text-muted-foreground transition-transform in-data-[panel-open]:rotate-180"
                          aria-hidden
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="flex flex-col gap-3 py-2 pl-2">
                          {month.days.map((day) => (
                            <div key={day.date} className="flex flex-col gap-1">
                              <time
                                dateTime={day.date}
                                className="text-sm font-medium"
                              >
                                {dayLabel(day.date)}
                              </time>
                              <EntryList entries={day.entries} />
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
