/** Closing call-outs for the review post (block 5). */

/** Fallback only — prefer content-aware Gemini suggestions. */
export const CLOSING_VARIATIONS = [
  "今日の場面、少し立ち止まって考えてみてもよさそうです！",
  "その視点、また気づいたときに共有してもらえると助かります！",
  "同じテーマの続きとして、考えが広がるとうれしいですね！",
  "無理に答えを出さず、一度思い浮かべてみるだけで十分です！",
  "チームでも使えそうか、頭の片隅に置いておいてもらえれば！",
  "小さな違和感に気づいたら、また聞かせてください！",
  "今日の話が、次の誰かの判断の材料になるとよいですね！",
  "正解を急がず、自分の現場に置き換えてみるので十分です！",
  "気づきを持ち帰れたら、それだけで前進だと思います！",
  "続きの感覚があれば、また共有してもらえるとありがたいです！",
] as const;

export type ClosingVariation = (typeof CLOSING_VARIATIONS)[number];

export const DEFAULT_CLOSING: ClosingVariation = CLOSING_VARIATIONS[0];

/** Pick a fallback closing; prefers a different line when `exclude` is set. */
export function pickClosingVariation(exclude?: string): string {
  const pool =
    exclude && CLOSING_VARIATIONS.length > 1
      ? CLOSING_VARIATIONS.filter((c) => c !== exclude)
      : [...CLOSING_VARIATIONS];
  const i = Math.floor(Math.random() * pool.length);
  return pool[i] ?? DEFAULT_CLOSING;
}

export type ClosingGenerateInput = {
  leaderNote: string;
  summary: string;
  sourcePost: string;
  themeLabel: string;
  /** Avoid repeating this exact line when regenerating */
  exclude?: string;
};

/**
 * Prompt: closings that work on the heart — insight + soft invitation,
 * tied to today's 所感 (not empty slogans).
 */
export function buildClosingInstructions(input: ClosingGenerateInput): string {
  const exclude = input.exclude?.trim()
    ? `直前の締め（言い回しを変える・同じ文は出さない）: ${input.exclude.trim()}`
    : "直前の締め: なし";

  return [
    "あなたは職場のグループチャット向けに、リーダー投稿の「締めの呼びかけ」を書く助手です。",
    "読んだ人が『そういう考え方もある』『少し考えてみよう』と感じる一文にする。",
    "布教・号令・空スローガンにしない。奨励しつつ、考える余白を残す。",
    "",
    "【必須】",
    "- 所感本文の具体に対応した締めだけ出す。汎用の『みんなで頑張りましょう』単体は不合格。",
    "- 所感にある『こうしたら？』の提案を言い換え・復唱しない。",
    "- 個人の明日TODO（『明日の一件で試してみませんか』）も書かない。",
    "- 締めは奨励・思考の余白（考えてみる／置き換えてみる／また気づいたら共有、程度）。",
    "- ちょうど3案。1行に1案。番号や箇条書き記号は付けない。",
    "- 各案は1文（長くても2文まで・目安40〜90字）。",
    "- 各案の文末は「！」（「。」で終わらない）。",
    "- です・ます調。共感の『ですね』『ますね』は可。訓話フレーズ（理念浸透・体現など）は使わない。",
    "- お礼・Value帯名の長々した再掲・行動指針全文・次回担当・URL・メタ発言は書かない。",
    "",
    "【良い方向の例（中身は今日の所感に合わせて変える）】",
    "- 『できない』の手前に分解がある、と思えたら十分ですね。また気づいたら聞かせてください！",
    "- 自分の現場に置き換えてみるだけで、今日の話は活きそうです！",
    "",
    "【悪い例】",
    "- 皆さんと一緒にやっていきましょう。",
    "- 明日の一件で試してみませんか。",
    "- 理念浸透を進めていきましょう。",
    "- 所感と同じ『朝会で誰に聞くかを決めましょう』の繰り返し。",
    "",
    exclude,
    `テーマ識別用（締めにコード全文を書かない）: ${input.themeLabel}`,
    "所感本文（対応の主材料）:",
    input.leaderNote.trim() || "（なし）",
    "要約（接続の補助）:",
    input.summary.trim() || "（なし）",
    "投稿本文（補助・長いときは要点だけ参照）:",
    input.sourcePost.trim().slice(0, 800) || "（なし）",
  ].join("\n");
}

export function polishClosingLine(raw: string): string {
  let out = raw.replace(/\r\n/g, "\n").trim();
  out = out.replace(/^```(?:\w+)?\n?/, "").replace(/\n?```$/, "").trim();
  out = out.replace(/^[-*・\d.）)\s]+/, "").trim();
  out = out.replace(/^["「]|["」]$/g, "").trim();
  // 締めの共感「ですね／ますね」は残す
  out = out.replace(/[。．]{2,}/g, "。");
  out = out.replace(/[。．]$/u, "！");
  if (out && !/[!?！？]$/u.test(out)) out = `${out}！`;
  return out.trim();
}

/** Parse model output into up to 3 closing candidates. */
export function parseClosingCandidates(raw: string, exclude?: string): string[] {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => polishClosingLine(l))
    .filter((l) => l.length >= 12 && l.length <= 120);

  const uniq: string[] = [];
  for (const line of lines) {
    if (exclude && line === exclude) continue;
    if (uniq.includes(line)) continue;
    // Reject empty slogans from the static fallback set when Gemini echoes them alone
    if (CLOSING_VARIATIONS.includes(line as ClosingVariation) && lines.length > 1) {
      continue;
    }
    uniq.push(line);
    if (uniq.length >= 3) break;
  }
  return uniq;
}

export function assembleClosingCandidates(
  raw: string,
  exclude?: string,
): string[] {
  const parsed = parseClosingCandidates(raw, exclude);
  if (parsed.length > 0) return parsed;
  return [pickClosingVariation(exclude)];
}

/** Drop a known closing sentence if the model appended one to 所感. */
export function stripTrailingClosingVariation(text: string): string {
  let out = text.trim();
  for (const line of CLOSING_VARIATIONS) {
    const bare = line.replace(/[。．！]$/u, "");
    const re = new RegExp(`\\n*${escapeRegExp(bare)}[。．！]?\\s*$`, "u");
    out = out.replace(re, "").trim();
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
