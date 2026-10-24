import assert from "node:assert/strict";
import test from "node:test";

import { groupChangelogByYear } from "./app-changelog.ts";

test("groupChangelogByYear groups newest-first entries under year, month, then day", () => {
  const groups = groupChangelogByYear([
    { hash: "a", date: "2026-10-24", subject: "新しい" },
    { hash: "b", date: "2026-10-24", subject: "同じ日" },
    { hash: "c", date: "2026-10-23", subject: "前日" },
    { hash: "d", date: "2026-09-05", subject: "前月" },
    { hash: "e", date: "2025-12-01", subject: "前年" },
  ]);

  assert.deepEqual(
    groups.map((group) => group.year),
    ["2026", "2025"],
  );
  assert.deepEqual(
    groups[0]?.months.map((month) => month.month),
    ["10", "09"],
  );
  assert.deepEqual(
    groups[0]?.months[0]?.days.map((day) => day.date),
    ["2026-10-24", "2026-10-23"],
  );
  assert.deepEqual(
    groups[0]?.months[0]?.days[0]?.entries.map((entry) => entry.hash),
    ["a", "b"],
  );
  assert.equal(groups[1]?.months[0]?.days[0]?.entries[0]?.subject, "前年");
});
