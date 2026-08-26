import type { Member, RotationCycle, ValueItem } from "./types";

/** Verbatim roster from toshio (also in data/local/members-and-rotation.json). */
export const POC_MEMBERS: Member[] = [
  { id: "m-amakawa", displayName: "天川さん", active: true },
  { id: "m-makishima", displayName: "牧嶋さん", active: true },
  { id: "m-kato", displayName: "加藤さん", active: true },
  { id: "m-shinohara", displayName: "篠原さん", active: true },
  { id: "m-sakuma", displayName: "佐久間さん", active: true },
  { id: "m-chigira", displayName: "千木良さん", active: true },
  { id: "m-kobayashi-megumi", displayName: "小林(恵)さん", active: true },
  { id: "m-arita", displayName: "有田さん", active: true },
  { id: "m-tanaka", displayName: "田中さん", active: true },
  { id: "m-sakurai", displayName: "櫻井さん", active: true },
  { id: "m-nakajo", displayName: "中條さん", active: true },
  { id: "m-susuga", displayName: "煤賀さん", active: true },
  { id: "m-furutaka", displayName: "古高さん", active: true },
  { id: "m-takeya", displayName: "竹谷さん", active: true },
  { id: "m-tamada", displayName: "玉田さん", active: true },
  { id: "m-tateishi", displayName: "立石さん", active: true },
  { id: "m-matsumoto", displayName: "松本さん", active: true },
  { id: "m-kobayashi-taku", displayName: "小林(拓巳)さん", active: true },
  { id: "m-tagawa", displayName: "田川さん", active: true },
  { id: "m-tsunezuka", displayName: "常塚（新ローテ）", active: true },
];

/**
 * Daily rotation themes = Value 行動指針（×-① など）。
 * Labels are verbatim from the local creed master (2026-08-08).
 * Full Vision / Value headings live in data/local/corporate-creed.json (gitignored).
 */
export const POC_VALUE_ITEMS: ValueItem[] = [
  {
    id: "v1-1",
    label: "1-①目の前のお客様に興味を持ち、深く知る努力をする",
  },
  {
    id: "v1-2",
    label: "1-②「できない」より「どうすればできるか」を考え、行動する",
  },
  {
    id: "v1-3",
    label: "1-③自身の限界を決めず、さらなる可能性を追求する",
  },
  { id: "v1-4", label: "1-④わたしたちは学び続ける" },
  {
    id: "v2-1",
    label: "2-①心に思うだけではなく、感謝は言葉で伝える",
  },
  {
    id: "v2-2",
    label: "2-②お客様とワクワクする体験を通じて、感動を分かち合う",
  },
  {
    id: "v3-1",
    label: "3-①現状を的確に理解し、「今」の先にあるものに目を向ける",
  },
  {
    id: "v3-2",
    label:
      "3-②常に情報をアップデートし、デジタル技術の進化を味方につけ、最先端を目指す",
  },
  {
    id: "v3-3",
    label: "3-③地域社会の一員として責任を持ち、永続的に共生していく",
  },
  {
    id: "v4-1",
    label: "4-①新たな領域への一歩を恐れず、踏み出す",
  },
  {
    id: "v4-2",
    label: "4-②挑戦をした成果も失敗も、次のチャレンジの糧にする",
  },
  {
    id: "v4-3",
    label: "4-③どんな時でもポジティブな思考を持ち、楽しむことを忘れない",
  },
  { id: "v5-1", label: "5-①困難な時こそ寄り添い、助け合う" },
  {
    id: "v5-2",
    label: "5-②一人ひとりの個性と考え方を、認め合う",
  },
  {
    id: "v5-3",
    label: "5-③仲間の努力と成果に感謝し、互いに研鑽し、成長を喜び合う",
  },
  {
    id: "v6-1",
    label: "6-①胸を張れる言動か、胸を張って得られた結果か",
  },
  {
    id: "v6-2",
    label: "6-②迷った時は一旦立ち止まり、周りの声を聴けているか",
  },
  { id: "v6-3", label: "6-③自他の間違いを正す勇気はあるか" },
  {
    id: "v6-4",
    label: "6-④高潔な心を持ち、誠実であることを貫いているか",
  },
];

/** Verbatim Vision (also in data/local/corporate-creed.json). */
export const POC_VISION =
  "進化する情報社会の担い手として、革新的で豊かな未来を創造し続ける";

/** Verbatim Value headings (not daily themes). */
export const POC_VALUE_HEADINGS = [
  "Value１　最高の、もっと先へ",
  "Value２　笑顔も感動も、共に",
  "Value３　時代と共に変化し、前へ",
  "Value４　挑み、楽しみ、共に新しい自分へ",
  "Value５　最後まで、仲間であれ",
  "Value６　妥協なき信念、貫くは正道",
] as const;

const VALUE_IDS = POC_VALUE_ITEMS.map((v) => v.id);

function themeAt(index: number): string {
  return VALUE_IDS[index % VALUE_IDS.length]!;
}

/**
 * 新ローテーション第1周（2026-07-29〜08-27）。トシオ提供のノート出力どおり。
 */
const SHIN_CYCLE_SCHEDULE = [
  { date: "2026-07-29", memberId: "m-amakawa", valueItemId: "v4-3" },
  { date: "2026-07-30", memberId: "m-makishima", valueItemId: "v5-1" },
  { date: "2026-07-31", memberId: "m-kato", valueItemId: "v5-2" },
  { date: "2026-08-03", memberId: "m-shinohara", valueItemId: "v5-3" },
  { date: "2026-08-04", memberId: "m-sakuma", valueItemId: "v6-1" },
  { date: "2026-08-05", memberId: "m-chigira", valueItemId: "v6-2" },
  { date: "2026-08-06", memberId: "m-kobayashi-megumi", valueItemId: "v6-3" },
  { date: "2026-08-07", memberId: "m-arita", valueItemId: "v6-4" },
  { date: "2026-08-10", memberId: "m-tanaka", valueItemId: "v1-1" },
  { date: "2026-08-12", memberId: "m-sakurai", valueItemId: "v1-2" },
  { date: "2026-08-13", memberId: "m-nakajo", valueItemId: "v1-3" },
  { date: "2026-08-14", memberId: "m-susuga", valueItemId: "v1-4" },
  { date: "2026-08-17", memberId: "m-furutaka", valueItemId: "v2-1" },
  { date: "2026-08-18", memberId: "m-takeya", valueItemId: "v2-2" },
  { date: "2026-08-19", memberId: "m-tamada", valueItemId: "v3-1" },
  { date: "2026-08-20", memberId: "m-tateishi", valueItemId: "v3-2" },
  { date: "2026-08-21", memberId: "m-matsumoto", valueItemId: "v3-3" },
  { date: "2026-08-24", memberId: "m-kobayashi-taku", valueItemId: "v4-1" },
  { date: "2026-08-25", memberId: "m-tagawa", valueItemId: "v4-2" },
  { date: "2026-08-26", memberId: "m-susuga", valueItemId: "v4-3" },
  { date: "2026-08-27", memberId: "m-tsunezuka", valueItemId: "v5-1" },
] as const;

function shinCycleDays() {
  return SHIN_CYCLE_SCHEDULE.map((row) => ({
    date: row.date,
    memberId: row.memberId,
    valueItemId: row.valueItemId,
  }));
}

/** 新ローテーション第2周（2026-08-28〜）。トシオ提供の fairAssign 出力どおり。 */
const NEXT_CYCLE_SCHEDULE = [
  { date: "2026-08-28", memberId: "m-arita", valueItemId: "v5-2" },
  { date: "2026-08-31", memberId: "m-tanaka", valueItemId: "v5-3" },
  { date: "2026-09-01", memberId: "m-takeya", valueItemId: "v6-1" },
  { date: "2026-09-02", memberId: "m-tamada", valueItemId: "v6-2" },
  { date: "2026-09-03", memberId: "m-tagawa", valueItemId: "v6-3" },
  { date: "2026-09-04", memberId: "m-furutaka", valueItemId: "v6-4" },
  { date: "2026-09-07", memberId: "m-kobayashi-taku", valueItemId: "v1-1" },
  { date: "2026-09-08", memberId: "m-kobayashi-megumi", valueItemId: "v1-2" },
  { date: "2026-09-09", memberId: "m-tateishi", valueItemId: "v1-3" },
  { date: "2026-09-10", memberId: "m-matsumoto", valueItemId: "v1-4" },
  { date: "2026-09-11", memberId: "m-nakajo", valueItemId: "v2-1" },
  { date: "2026-09-14", memberId: "m-susuga", valueItemId: "v2-2" },
  { date: "2026-09-15", memberId: "m-chigira", valueItemId: "v3-1" },
  { date: "2026-09-16", memberId: "m-sakuma", valueItemId: "v3-2" },
  { date: "2026-09-17", memberId: "m-shinohara", valueItemId: "v3-3" },
  { date: "2026-09-18", memberId: "m-kato", valueItemId: "v4-1" },
  { date: "2026-09-24", memberId: "m-sakurai", valueItemId: "v4-2" },
  { date: "2026-09-25", memberId: "m-makishima", valueItemId: "v4-3" },
  { date: "2026-09-28", memberId: "m-amakawa", valueItemId: "v5-1" },
  { date: "2026-09-29", memberId: "m-tsunezuka", valueItemId: "v5-2" },
] as const;

function nextCycleDays() {
  return NEXT_CYCLE_SCHEDULE.map((row) => ({
    date: row.date,
    memberId: row.memberId,
    valueItemId: row.valueItemId,
  }));
}

/**
 * Prior cycles for fair-assign.
 * Latest = トシオ提供の「新ローテーション」（data/local/members-and-rotation.json と同内容）。
 * 1つ前 = その直前サイクル（仮・間隔計算用）。
 */
export const POC_HISTORY_CYCLES: RotationCycle[] = [
  {
    id: "hist-prev",
    label: "前サイクル（仮）",
    days: [
      { date: "2026-07-01", memberId: "m-makishima", valueItemId: themeAt(2) },
      { date: "2026-07-02", memberId: "m-kato", valueItemId: themeAt(3) },
      { date: "2026-07-03", memberId: "m-shinohara", valueItemId: themeAt(4) },
      { date: "2026-07-06", memberId: "m-sakuma", valueItemId: themeAt(5) },
      { date: "2026-07-07", memberId: "m-chigira", valueItemId: themeAt(6) },
      { date: "2026-07-08", memberId: "m-kobayashi-megumi", valueItemId: themeAt(7) },
      { date: "2026-07-09", memberId: "m-arita", valueItemId: themeAt(8) },
      { date: "2026-07-10", memberId: "m-tanaka", valueItemId: themeAt(9) },
      { date: "2026-07-13", memberId: "m-sakurai", valueItemId: themeAt(10) },
      { date: "2026-07-14", memberId: "m-nakajo", valueItemId: themeAt(11) },
      { date: "2026-07-15", memberId: "m-susuga", valueItemId: themeAt(12) },
      { date: "2026-07-16", memberId: "m-furutaka", valueItemId: themeAt(13) },
      { date: "2026-07-17", memberId: "m-takeya", valueItemId: themeAt(14) },
      { date: "2026-07-21", memberId: "m-tamada", valueItemId: themeAt(15) },
      { date: "2026-07-22", memberId: "m-tateishi", valueItemId: themeAt(16) },
      { date: "2026-07-23", memberId: "m-matsumoto", valueItemId: themeAt(17) },
      { date: "2026-07-24", memberId: "m-kobayashi-taku", valueItemId: themeAt(18) },
      { date: "2026-07-27", memberId: "m-tagawa", valueItemId: themeAt(0) },
      { date: "2026-07-28", memberId: "m-tsunezuka", valueItemId: themeAt(18) },
    ],
  },
  {
    id: "cycle-shin-2026-07-29",
    label: "新ローテーション",
    days: shinCycleDays(),
  },
  {
    id: "cycle-shin-2026-08-28",
    label: "新ローテーション（2026-08-28〜）",
    days: nextCycleDays(),
  },
];

/**
 * Historical sample only (新ローテーション実表の開始付近).
 * PoC の生成起点には使わない — `defaultCycleStartYmd()` を使う.
 */
export const POC_SAMPLE_CYCLE_START = "2026-07-29";
/** @deprecated Use defaultCycleStartYmd() — kept as alias for sample docs */
export const POC_CYCLE_START = POC_SAMPLE_CYCLE_START;
/**
 * Theme slots default = active members (no sit-outs).
 * Themes still walk the catalog and wrap if slots > catalog size.
 */
export const POC_BUSINESS_DAY_COUNT = POC_MEMBERS.filter((m) => m.active).length;
export const POC_COOLDOWN_BUSINESS_DAYS = 7;
/** Soft max gap between a person's assignments (0 = no upper soft limit). */
export const POC_MAX_GAP_BUSINESS_DAYS = 21;

/** Minimum rule: cycle ends with 常塚（新ローテ）＝ツネヅカ（トシオ）. */
export const POC_LAST_ASSIGNEE_MEMBER_ID = "m-tsunezuka";

/** Empty = auto (next after previous cycle last theme). Manual override uses a valueItem id. */
export const POC_THEME_START_VALUE_ITEM_ID = "";

/**
 * Verbatim minimum rule (toschio-provided).
 */
export const ROTATION_MINIMUM_RULE =
  "このローテ表は、土日祝日を除く事、最後はツネヅカ（＝トシオ）で終わる事が最低限のルールです。";
