import { POC_VISION, POC_VALUE_HEADINGS } from "@/lib/rotation/seed";
import { valueGroupFromLabel } from "@/lib/rotation/value-group";

/** チャート画像は public に置かない（社外NG）。端末の IndexedDB へ取り込む。 */

export type CreedMission = {
  title: string;
  /** Value group numbers 1–6 */
  valueGroups: number[];
};

export type CreedValueBand = {
  group: number;
  heading: string;
  mission: string;
  description: string;
};

export const CORPORATE_CREED_MISSIONS: CreedMission[] = [
  { title: "体験価値", valueGroups: [1, 2] },
  { title: "社会的価値", valueGroups: [3] },
  { title: "人材価値", valueGroups: [4, 5, 6] },
];

export const CORPORATE_CREED_VALUE_BANDS: CreedValueBand[] = [
  {
    group: 1,
    heading: POC_VALUE_HEADINGS[0]!,
    mission: "体験価値",
    description:
      "新たな発見や驚きが、人生を豊かにしてくれる。私たちはお客様の「最高」を追求し続け、期待を超えるサービスを提供し続ける。",
  },
  {
    group: 2,
    heading: POC_VALUE_HEADINGS[1]!,
    mission: "体験価値",
    description:
      "「お客様の笑顔が私たちの原動力」。お客様の声に真摯に向き合い、感動を分かち合うことが私たちの使命であり喜びである。",
  },
  {
    group: 3,
    heading: POC_VALUE_HEADINGS[2]!,
    mission: "社会的価値",
    description:
      "時代の流れに対応する柔軟性と、新たなニーズを捉える先見性を発揮することで、「変わらない」ことを「変わり続ける」愛される地域社会の一員となる。",
  },
  {
    group: 4,
    heading: POC_VALUE_HEADINGS[3]!,
    mission: "人材価値",
    description:
      "大切にしたいのは、失敗を恐れず挑戦し続ける姿勢。成功の喜びも苦い経験も、成長の糧とする過程を楽しんでいく。",
  },
  {
    group: 5,
    heading: POC_VALUE_HEADINGS[4]!,
    mission: "人材価値",
    description:
      "私たちはONE TEAM。互いに支え合い、共に乗り越え、共に達成する。",
  },
  {
    group: 6,
    heading: POC_VALUE_HEADINGS[5]!,
    mission: "人材価値",
    description:
      "私たちの信念は、常に誠実であること。遠回りしても、自分たちが正しいと信じる道を真っ直ぐに進み、誇れることを貫く。",
  },
];

export const CORPORATE_CREED_VISION = POC_VISION;

export function creedValueBandForTheme(themeLabel: string): CreedValueBand | null {
  const group = valueGroupFromLabel(themeLabel);
  if (group == null) return null;
  return CORPORATE_CREED_VALUE_BANDS.find((b) => b.group === group) ?? null;
}

/** AI プロンプト用：今日のテーマが属する理念の方向性（出力には書かせない）。 */
export function buildCreedAlignmentBlock(themeLabel: string): string {
  const band = creedValueBandForTheme(themeLabel);
  const guideline = themeLabel.trim();
  if (!band) {
    return [
      "【企業理念の方向性（正本・出力に書かない）】",
      `Vision: ${CORPORATE_CREED_VISION}`,
      guideline ? `今日の行動指針: ${guideline}` : "",
      "- 要約・所感は、この理念の方向性から外れないこと。別 Value の話題にすり替えない。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "【企業理念の方向性（正本・出力に書かない）】",
    `Vision: ${CORPORATE_CREED_VISION}`,
    `Mission: ${band.mission}`,
    `Value: ${band.heading}`,
    `Value の説明: ${band.description}`,
    `今日の行動指針: ${guideline}`,
    "- 要約・所感は、上記 Value と今日の行動指針の文脈から外れないこと。",
    "- 別の Value や Mission の話題にすり替えない。理念からそれた解釈は不合格。",
  ].join("\n");
}
