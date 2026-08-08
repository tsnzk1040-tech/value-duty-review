import type { Member, RotationCycle, ValueItem } from "./types";

/** Fictional POC seed — not real colleagues. */
export const POC_MEMBERS: Member[] = [
  { id: "m1", displayName: "Aさん", active: true },
  { id: "m2", displayName: "Bさん", active: true },
  { id: "m3", displayName: "Cさん", active: true },
  { id: "m4", displayName: "Dさん", active: true },
  { id: "m5", displayName: "Eさん", active: true },
];

/**
 * Value枝カタログ（短いラベルのみ。理念の全文はリポに置かない）。
 * id: v{Value番号}-{枝番号}
 */
export const POC_VALUE_ITEMS: ValueItem[] = [
  { id: "v1-1", label: "1-① お客様を深く知る" },
  { id: "v1-2", label: "1-② どうすればできるか" },
  { id: "v1-3", label: "1-③ 限界を決めない" },
  { id: "v1-4", label: "1-④ 学び続ける" },
  { id: "v2-1", label: "2-① 感謝を言葉で" },
  { id: "v2-2", label: "2-② 感動を分かち合う" },
  { id: "v3-1", label: "3-① 今の先を見る" },
  { id: "v3-2", label: "3-② デジタルで最先端" },
  { id: "v3-3", label: "3-③ 地域と共生" },
  { id: "v4-1", label: "4-① 新たな領域へ" },
  { id: "v4-2", label: "4-② 挑戦を糧に" },
  { id: "v4-3", label: "4-③ ポジティブに楽しむ" },
  { id: "v5-1", label: "5-① 寄り添い助け合う" },
  { id: "v5-2", label: "5-② 個性を認め合う" },
  { id: "v5-3", label: "5-③ 共に成長を喜ぶ" },
  { id: "v6-1", label: "6-① 胸を張れるか" },
  { id: "v6-2", label: "6-② 立ち止まり聴く" },
  { id: "v6-3", label: "6-③ 正す勇気" },
  { id: "v6-4", label: "6-④ 誠実を貫く" },
];

const VALUE_IDS = POC_VALUE_ITEMS.map((v) => v.id);

function themeAt(index: number): string {
  return VALUE_IDS[index % VALUE_IDS.length]!;
}

/**
 * Synthetic prior cycle ending just before POC cycle start,
 * so cooldown / theme diversity have something to chew on.
 */
export const POC_HISTORY_CYCLES: RotationCycle[] = [
  {
    id: "hist-1",
    label: "前々サイクル（仮）",
    days: [
      { date: "2026-06-02", memberId: "m1", valueItemId: themeAt(0) },
      { date: "2026-06-03", memberId: "m2", valueItemId: themeAt(1) },
      { date: "2026-06-04", memberId: "m3", valueItemId: themeAt(2) },
      { date: "2026-06-05", memberId: "m4", valueItemId: themeAt(3) },
      { date: "2026-06-06", memberId: "m5", valueItemId: themeAt(4) },
      { date: "2026-06-09", memberId: "m1", valueItemId: themeAt(5) },
      { date: "2026-06-10", memberId: "m2", valueItemId: themeAt(6) },
      { date: "2026-06-11", memberId: "m3", valueItemId: themeAt(7) },
      { date: "2026-06-12", memberId: "m4", valueItemId: themeAt(8) },
      { date: "2026-06-13", memberId: "m5", valueItemId: themeAt(9) },
      { date: "2026-06-16", memberId: "m1", valueItemId: themeAt(10) },
      { date: "2026-06-17", memberId: "m2", valueItemId: themeAt(11) },
      { date: "2026-06-18", memberId: "m3", valueItemId: themeAt(12) },
      { date: "2026-06-19", memberId: "m4", valueItemId: themeAt(13) },
      { date: "2026-06-20", memberId: "m5", valueItemId: themeAt(14) },
      { date: "2026-06-23", memberId: "m1", valueItemId: themeAt(15) },
      { date: "2026-06-24", memberId: "m2", valueItemId: themeAt(16) },
      { date: "2026-06-25", memberId: "m3", valueItemId: themeAt(17) },
      { date: "2026-06-26", memberId: "m4", valueItemId: themeAt(18) },
      { date: "2026-06-27", memberId: "m5", valueItemId: themeAt(0) },
      { date: "2026-06-30", memberId: "m1", valueItemId: themeAt(1) },
    ],
  },
  {
    id: "hist-2",
    label: "前サイクル（仮）",
    days: [
      { date: "2026-07-01", memberId: "m2", valueItemId: themeAt(2) },
      { date: "2026-07-02", memberId: "m3", valueItemId: themeAt(3) },
      { date: "2026-07-03", memberId: "m4", valueItemId: themeAt(4) },
      { date: "2026-07-06", memberId: "m5", valueItemId: themeAt(5) },
      { date: "2026-07-07", memberId: "m1", valueItemId: themeAt(6) },
      { date: "2026-07-08", memberId: "m2", valueItemId: themeAt(7) },
      { date: "2026-07-09", memberId: "m3", valueItemId: themeAt(8) },
      { date: "2026-07-10", memberId: "m4", valueItemId: themeAt(9) },
      { date: "2026-07-13", memberId: "m5", valueItemId: themeAt(10) },
      { date: "2026-07-14", memberId: "m1", valueItemId: themeAt(11) },
      { date: "2026-07-15", memberId: "m2", valueItemId: themeAt(12) },
      { date: "2026-07-16", memberId: "m3", valueItemId: themeAt(13) },
      { date: "2026-07-17", memberId: "m4", valueItemId: themeAt(14) },
      { date: "2026-07-21", memberId: "m5", valueItemId: themeAt(15) },
      { date: "2026-07-22", memberId: "m1", valueItemId: themeAt(16) },
      { date: "2026-07-23", memberId: "m2", valueItemId: themeAt(17) },
      { date: "2026-07-24", memberId: "m3", valueItemId: themeAt(18) },
      { date: "2026-07-27", memberId: "m4", valueItemId: themeAt(0) },
      { date: "2026-07-28", memberId: "m5", valueItemId: themeAt(1) },
      { date: "2026-07-29", memberId: "m1", valueItemId: themeAt(2) },
      { date: "2026-07-30", memberId: "m2", valueItemId: themeAt(3) },
    ],
  },
];

/** POC new cycle starts the business day after hist-2 ends. */
export const POC_CYCLE_START = "2026-07-31";
export const POC_BUSINESS_DAY_COUNT = 21;
export const POC_COOLDOWN_BUSINESS_DAYS = 7;
