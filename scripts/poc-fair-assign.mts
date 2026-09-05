/**
 * Fair-assign POC: seed history (optional extra notebook paste) →
 * sameThemeHits + people-once. Extra file: data/local/rotation-extra-history.txt
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { fairAssign } from "../src/lib/rotation/fair-assign.ts";
import {
  latestPreviousCycle,
  mergeCanonicalHistory,
  parseRotationPaste,
  withoutStubHistoryCycles,
} from "../src/lib/rotation/previous-cycle.ts";
import { suggestThemeStartFromHistory } from "../src/lib/rotation/theme-start.ts";
import {
  POC_BUSINESS_DAY_COUNT,
  POC_COOLDOWN_BUSINESS_DAYS,
  POC_HISTORY_CYCLES,
  POC_LAST_ASSIGNEE_MEMBER_ID,
  POC_MAX_GAP_BUSINESS_DAYS,
  POC_MEMBERS,
  POC_THEME_START_VALUE_ITEM_ID,
  POC_VALUE_ITEMS,
} from "../src/lib/rotation/seed.ts";
import type { RotationCycle, RotationDay } from "../src/lib/rotation/types.ts";
import { valueGroupForItem } from "../src/lib/rotation/value-group.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const extraPath = join(root, "data", "local", "rotation-extra-history.txt");

/** Seed history + current rotation, seed 20260808, before unused-theme harden. */
const BEFORE = {
  sameThemeHits: 0,
  doubles: 0,
  lastIsCloser: true,
  slotCount: 20,
};

function historyWithOptionalExtra(): RotationCycle[] {
  const cycles = structuredClone(POC_HISTORY_CYCLES);
  if (!existsSync(extraPath)) return cycles;
  const text = readFileSync(extraPath, "utf8");
  const parsed = parseRotationPaste(text, POC_MEMBERS, POC_VALUE_ITEMS);
  if (parsed.errors.length > 0) {
    console.error("extra history parse errors:\n", parsed.errors.join("\n"));
    process.exit(1);
  }
  const extra: RotationCycle = {
    id: "hist-extra-local",
    label: "実ローテ（data/local）",
    days: parsed.days,
  };
  console.log(`loaded extra history: ${parsed.days.length} days`);
  return [extra, ...cycles];
}

function quality(
  days: RotationDay[],
  historyCycles: RotationCycle[],
  closerId: string,
) {
  const historyDays = historyCycles.flatMap((c) => c.days);
  const counts = new Map<string, number>();
  let sameThemeHits = 0;
  for (let i = 0; i < days.length; i += 1) {
    const day = days[i]!;
    counts.set(day.memberId, (counts.get(day.memberId) ?? 0) + 1);
    const prevDays = [...historyDays, ...days.slice(0, i)].filter(
      (d) => d.memberId === day.memberId,
    );
    if (prevDays.some((d) => d.valueItemId === day.valueItemId)) {
      sameThemeHits += 1;
    }
  }
  const doubles = [...counts.values()].filter((n) => n >= 2).length;
  const last = days[days.length - 1];
  return {
    sameThemeHits,
    doubles,
    lastIsCloser: last?.memberId === closerId,
    slotCount: days.length,
  };
}

const stubDropped = withoutStubHistoryCycles([
  {
    id: "hist-prev",
    label: "前サイクル（仮）",
    days: [{ date: "2026-07-01", memberId: "m-amakawa", valueItemId: "v1-1" }],
  },
  ...POC_HISTORY_CYCLES,
]);
if (stubDropped.some((c) => c.id === "hist-prev")) {
  console.error("FAIL: stub cycle still present");
  process.exit(1);
}

const merged = mergeCanonicalHistory(
  [
    {
      id: "cycle-generated-next",
      label: "生成（捨てる）",
      days: [
        { date: "2026-09-30", memberId: "m-arita", valueItemId: "v5-3" },
      ],
    },
  ],
  POC_HISTORY_CYCLES,
);
const mergedLatest = latestPreviousCycle(merged);
if (merged.some((c) => c.days[0]?.date === "2026-09-30")) {
  console.error("FAIL: generated-after-prod survived merge");
  process.exit(1);
}
if (mergedLatest?.days.at(-1)?.date !== "2026-09-29") {
  console.error("FAIL: merge latest is not prod 2026-09-29");
  process.exit(1);
}

const historyCycles = historyWithOptionalExtra();
const result = fairAssign({
  members: POC_MEMBERS,
  valueItems: POC_VALUE_ITEMS,
  historyCycles,
  cycleStart: "",
  businessDayCount: POC_BUSINESS_DAY_COUNT,
  cooldownBusinessDays: POC_COOLDOWN_BUSINESS_DAYS,
  maxGapBusinessDays: POC_MAX_GAP_BUSINESS_DAYS,
  avoidSameValueBand: true,
  lastAssigneeMemberId: POC_LAST_ASSIGNEE_MEMBER_ID,
  themeStartValueItemId: POC_THEME_START_VALUE_ITEM_ID,
  seed: 20260808,
});

const after = quality(
  result.days,
  historyCycles,
  POC_LAST_ASSIGNEE_MEMBER_ID,
);

console.log("warnings:");
for (const w of result.warnings) console.log(`  - ${w}`);
console.log("\nbefore (seed, pre-harden snapshot):", BEFORE);
console.log("after:", after);

const themeStart = suggestThemeStartFromHistory(historyCycles, POC_VALUE_ITEMS);
if (result.days[0]?.date !== "2026-09-30") {
  console.error(`FAIL: next start ${result.days[0]?.date} != 2026-09-30`);
  process.exit(1);
}
if (themeStart.valueItemId !== "v5-3" || result.days[0]?.valueItemId !== "v5-3") {
  console.error("FAIL: next theme is not 5-③");
  process.exit(1);
}

if (after.doubles !== 0) {
  console.error("FAIL: people-once broken (doubles > 0)");
  process.exit(1);
}
if (!after.lastIsCloser) {
  console.error("FAIL: last day is not closer");
  process.exit(1);
}
if (after.slotCount !== POC_MEMBERS.filter((m) => m.active).length) {
  console.error("FAIL: slot count != active members");
  process.exit(1);
}

let sameValueHits = 0;
const historyDays = historyCycles.flatMap((c) => c.days);
for (let i = 0; i < result.days.length; i += 1) {
  const day = result.days[i]!;
  const prevDays = [...historyDays, ...result.days.slice(0, i)].filter(
    (d) => d.memberId === day.memberId,
  );
  const prevTheme = prevDays.at(-1)?.valueItemId;
  if (!prevTheme) continue;
  const a = valueGroupForItem(prevTheme, POC_VALUE_ITEMS);
  const b = valueGroupForItem(day.valueItemId, POC_VALUE_ITEMS);
  if (a != null && a === b) sameValueHits += 1;
}
console.log("sameValueHits (soft/exception ok):", sameValueHits);

if (BEFORE.sameThemeHits >= 0 && after.sameThemeHits > BEFORE.sameThemeHits) {
  console.error("FAIL: sameThemeHits increased");
  process.exit(1);
}

console.log("\nPOC ok");
