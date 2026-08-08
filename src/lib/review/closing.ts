/** Closing call-outs for the review post (block 5). Editable in UI. */

export const CLOSING_VARIATIONS = [
  "皆さんと一緒にやっていきましょう。",
  "明日も、できることから一緒に積み重ねていきましょう。",
  "一人ひとりの一歩が、チームの力になります。今日もありがとうございました。",
  "気づきを現場に持ち帰って、また共有し合っていきましょう。",
  "リレーのように、次の人へつなぎながら進めていきましょう。",
  "小さな実践を、みんなで続けていきましょう。",
  "今日の学びを、明日の行動に変えていきましょう。",
  "同じ方向を見ながら、一歩ずつ進んでいきましょう。",
  "困ったときは声をかけ合いながら、やっていきましょう。",
  "理念を意識した一日を、また明日も一緒に。",
] as const;

export type ClosingVariation = (typeof CLOSING_VARIATIONS)[number];

export const DEFAULT_CLOSING: ClosingVariation = CLOSING_VARIATIONS[0];

/** Pick a closing; prefers a different line when `exclude` is set. */
export function pickClosingVariation(exclude?: string): string {
  const pool =
    exclude && CLOSING_VARIATIONS.length > 1
      ? CLOSING_VARIATIONS.filter((c) => c !== exclude)
      : [...CLOSING_VARIATIONS];
  const i = Math.floor(Math.random() * pool.length);
  return pool[i] ?? DEFAULT_CLOSING;
}

/** Drop a known closing sentence if the model appended one to 所感. */
export function stripTrailingClosingVariation(text: string): string {
  let out = text.trim();
  for (const line of CLOSING_VARIATIONS) {
    const bare = line.replace(/[。．]$/u, "");
    const re = new RegExp(
      `\\n*${escapeRegExp(bare)}[。．]?\\s*$`,
      "u",
    );
    out = out.replace(re, "").trim();
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
