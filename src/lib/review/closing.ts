/** Closing call-outs for the review post (block 5). */

/** Fallback only — prefer content-aware Gemini suggestions. */
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
    "読んだ人が『ちょっとやってみようかな』『そういう考え方もあるんだ』『なるほど、わかりました』と感じる一文にする。",
    "心に働きかける。説教・号令・空のスローガンにしない。",
    "",
    "【必須】",
    "- 所感本文の具体（キーワード・実践・引きつけ）に対応した締めだけ出す。汎用の『みんなで頑張りましょう』単体は不合格。",
    "- ちょうど3案。1行に1案。番号や箇条書き記号は付けない。",
    "- 各案は1文（長くても2文まで・目安40〜90字）。",
    "- です・ます調。『ですね』『ますね』禁止。",
    "- お礼・Value帯名の長々した再掲・行動指針全文・次回担当・URL・メタ発言は書かない。",
    "- 所感のコピペや要約の繰り返しにしない。所感の先に『視点のひと押し』を置く。",
    "",
    "【良い方向の例（中身は今日の所感に合わせて変える）】",
    "- 聞き方を先に決めるだけで、迷いが一段小さくなる。明日の一件で試してみよう。",
    "- 『できない』の手前に分解の一手がある、と思えたら今日は十分だ。また共有しよう。",
    "",
    "【悪い例】",
    "- 皆さんと一緒にやっていきましょう。",
    "- 理念浸透を進めていきましょう。",
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
  out = out.replace(/ですね[。．]?/g, "。");
  out = out.replace(/ますね[。．]?/g, "ます。");
  out = out.replace(/[。．]{2,}/g, "。");
  if (out && !/[。．!?！？]$/u.test(out)) out = `${out}。`;
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
    const bare = line.replace(/[。．]$/u, "");
    const re = new RegExp(`\\n*${escapeRegExp(bare)}[。．]?\\s*$`, "u");
    out = out.replace(re, "").trim();
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
