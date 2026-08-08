import type { Member, RotationCycle, ValueItem } from "./types";

/** Fictional POC seed — not real colleagues. */
export const POC_MEMBERS: Member[] = [
  { id: "m1", displayName: "Aさん", active: true },
  { id: "m2", displayName: "Bさん", active: true },
  { id: "m3", displayName: "Cさん", active: true },
  { id: "m4", displayName: "Dさん", active: true },
  { id: "m5", displayName: "Eさん", active: true },
];

export const POC_VALUE_ITEMS: ValueItem[] = [
  { id: "v1", label: "挑戦" },
  { id: "v2", label: "誠実" },
  { id: "v3", label: "共創" },
  { id: "v4", label: "顧客志向" },
  { id: "v5", label: "成長" },
];

/**
 * Synthetic prior cycle ending just before POC cycle start,
 * so cooldown / theme diversity have something to chew on.
 */
export const POC_HISTORY_CYCLES: RotationCycle[] = [
  {
    id: "hist-1",
    label: "前々サイクル（仮）",
    days: [
      { date: "2026-06-02", memberId: "m1", valueItemId: "v1" },
      { date: "2026-06-03", memberId: "m2", valueItemId: "v2" },
      { date: "2026-06-04", memberId: "m3", valueItemId: "v3" },
      { date: "2026-06-05", memberId: "m4", valueItemId: "v4" },
      { date: "2026-06-06", memberId: "m5", valueItemId: "v5" },
      { date: "2026-06-09", memberId: "m1", valueItemId: "v2" },
      { date: "2026-06-10", memberId: "m2", valueItemId: "v3" },
      { date: "2026-06-11", memberId: "m3", valueItemId: "v4" },
      { date: "2026-06-12", memberId: "m4", valueItemId: "v5" },
      { date: "2026-06-13", memberId: "m5", valueItemId: "v1" },
      { date: "2026-06-16", memberId: "m1", valueItemId: "v3" },
      { date: "2026-06-17", memberId: "m2", valueItemId: "v4" },
      { date: "2026-06-18", memberId: "m3", valueItemId: "v5" },
      { date: "2026-06-19", memberId: "m4", valueItemId: "v1" },
      { date: "2026-06-20", memberId: "m5", valueItemId: "v2" },
      { date: "2026-06-23", memberId: "m1", valueItemId: "v4" },
      { date: "2026-06-24", memberId: "m2", valueItemId: "v5" },
      { date: "2026-06-25", memberId: "m3", valueItemId: "v1" },
      { date: "2026-06-26", memberId: "m4", valueItemId: "v2" },
      { date: "2026-06-27", memberId: "m5", valueItemId: "v3" },
      { date: "2026-06-30", memberId: "m1", valueItemId: "v5" },
    ],
  },
  {
    id: "hist-2",
    label: "前サイクル（仮）",
    days: [
      { date: "2026-07-01", memberId: "m2", valueItemId: "v1" },
      { date: "2026-07-02", memberId: "m3", valueItemId: "v2" },
      { date: "2026-07-03", memberId: "m4", valueItemId: "v3" },
      { date: "2026-07-06", memberId: "m5", valueItemId: "v4" },
      { date: "2026-07-07", memberId: "m1", valueItemId: "v1" },
      { date: "2026-07-08", memberId: "m2", valueItemId: "v2" },
      { date: "2026-07-09", memberId: "m3", valueItemId: "v3" },
      { date: "2026-07-10", memberId: "m4", valueItemId: "v4" },
      { date: "2026-07-13", memberId: "m5", valueItemId: "v5" },
      { date: "2026-07-14", memberId: "m1", valueItemId: "v2" },
      { date: "2026-07-15", memberId: "m2", valueItemId: "v3" },
      { date: "2026-07-16", memberId: "m3", valueItemId: "v4" },
      { date: "2026-07-17", memberId: "m4", valueItemId: "v5" },
      { date: "2026-07-21", memberId: "m5", valueItemId: "v1" },
      { date: "2026-07-22", memberId: "m1", valueItemId: "v3" },
      { date: "2026-07-23", memberId: "m2", valueItemId: "v4" },
      { date: "2026-07-24", memberId: "m3", valueItemId: "v5" },
      { date: "2026-07-27", memberId: "m4", valueItemId: "v1" },
      { date: "2026-07-28", memberId: "m5", valueItemId: "v2" },
      { date: "2026-07-29", memberId: "m1", valueItemId: "v4" },
      { date: "2026-07-30", memberId: "m2", valueItemId: "v5" },
    ],
  },
];

/** POC new cycle starts the business day after hist-2 ends. */
export const POC_CYCLE_START = "2026-07-31";
export const POC_BUSINESS_DAY_COUNT = 21;
export const POC_COOLDOWN_BUSINESS_DAYS = 7;
