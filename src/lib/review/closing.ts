import { buildHumanVoiceBlock } from "@/lib/review/human-voice";

/** Closing call-outs for the review post (block 5). */

/** Fallback only — prefer content-aware Gemini suggestions. */
export const CLOSING_VARIATIONS = [
  "今日の場面を、自分の担当の仕事に置き換えて考えてみてください。",
  "迷ったときに何を選ぶか、今日の話を一つの手がかりにしてもらえればと思います！",
  "忙しい日ほど、今日のような一手が相手の判断を支えているのだと思います。",
  "同じ場面に出会ったとき、自分ならどう動くかを一度考えてみてください。",
  "答えはすぐに出なくても、今日の問いを持ったまま仕事に向き合ってみてください！",
  "次に同じ迷いが来たとき、今日の話を思い出してもらえればと思います！",
  "一つの返答や確認の積み重ねが、周りの仕事を支えているのだと思います。",
  "自分の担当の中で、今日の話が当てはまる場面を一つ探してみてください！",
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
    "",
    "【締めの重み（浮つかせない）】",
    "- 軽い励ましで閉じない: 十分です／それだけで前進／うれしいです／助かります／頭の片隅に／気軽に／ちょっとだけ。",
    "- 今日の投稿者の具体（した行為・向き合った相手・迷った点）か、今日の行動指針の意味に一度触れてから閉じる。",
    "- 仕事の現実に足をつける。忙しい日・判断に迷う場面でどうか、の目線を入れてよい。",
    "- 3案はそれぞれ違う向きから書く。",
    "  1. 投稿者がしたことの意味を、行動指針に近い日常の言葉で返す",
    "  2. 実務で難しくなる場面を認めたうえで、考える余白を残す",
    "  3. 読んでいるメンバー一人ひとりへ、静かな問いを一つ置く（答えを求めない）",
    "",
    "- ちょうど3案。1行に1案。番号や箇条書き記号は付けない。",
    "- 各案は1文（長くても2文まで・目安40〜90字）。",
    "- 各案の文末は「！」か「。」。内容に合うほうを選ぶ。背中を押す・前向きに送り出す文は「！」。行為の意味を受け止める文、難しさを認める文、静かな問いは「。」。3案とも同じ記号にそろえなくてよい。",
    "- です・ます調。共感の『ですね』『ますね』は可。訓話フレーズ（理念浸透・体現など）は使わない。",
    "- お礼・Value帯名の長々した再掲・行動指針全文・次回担当・URL・メタ発言は書かない。",
    "",
    buildHumanVoiceBlock("closing"),
    "",
    "【良い方向の例（中身は今日の所感に合わせて変える。言い回しは写さない）】",
    "- 期限どおりに返すことは、相手の予定を守ることでもあるのだと感じました。",
    "- 忙しい日ほど返答は後回しになりがちですが、その一通が相手の判断を支えています！",
    "- 今日の場面なら誰の時間を先に守れたか、一度思い返してみてください。",
    "",
    "【悪い例】",
    "- 気づきを持ち帰れたら、それだけで前進だと思います！（軽い励まし）",
    "- 頭の片隅に置いておいてもらえれば！（軽い・中身がない）",
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
  // 締めの共感「ですね／ますね」は残す。文末は「！」も「。」も許す
  out = out.replace(/[。．]{2,}/g, "。");
  out = out.replace(/[!！]{2,}/gu, "！");
  out = out.replace(/．$/u, "。");
  if (out && !/[。!?！？]$/u.test(out)) out = `${out}。`;
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
