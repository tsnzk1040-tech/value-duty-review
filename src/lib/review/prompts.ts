import {
  stripThemeLabelFromText,
  summaryPrefix,
  summarySuffix,
} from "@/lib/review/theme-meta";

export type SummaryGenerateInput = {
  sourcePost: string;
  themeLabel: string;
  lens: string;
};

/** Gemini／スタブ共通の要約指示（構成ルールの実行用コピー）。 */
export function buildSummaryInstructions(input: SummaryGenerateInput): string {
  const prefix = summaryPrefix(input.themeLabel);
  const suffix = summarySuffix();
  const lens = input.lens.trim()
    ? `観点メモ（任意）: ${input.lens.trim()}`
    : "観点メモ: なし";

  return [
    "あなたは職場グループ向けの毎日レビュー補助です。",
    "メンバーの振り返り投稿を、共有用の要約文に整えてください。",
    "",
    "【出力形式（厳守）】",
    `1行（または短い1段落）で、必ず次の形にする:`,
    `${prefix}{投稿内容の言い換え}${suffix}`,
    "",
    "【必須ルール】",
    `- 「${prefix}」の定型のあとに、対象の行動指針ラベルや行動指針の文言そのものは書かない（Value帯と何番目で特定済み）。`,
    "- 書くのは投稿者が述べた具体・想いの好意的な言い換えだけ。",
    "- 投稿全文のコピペ禁止。次回テーマ／担当／定型挨拶は要約に入れない。",
    "- 攻め・皮肉にしない。少し褒めるトーン。",
    "- 実装・POC・AIなどのメタ発言は入れない。",
    "- 出力は完成文のみ。前置きや箇条書きの説明は不要。",
    "",
    "【入力】",
    `テーマ識別用（出力に指針本文を書かない）: ${input.themeLabel}`,
    lens,
    "投稿本文:",
    input.sourcePost.trim() || "（なし）",
  ].join("\n");
}

/** モデル出力を定型に寄せる（プレフィックス欠落・指針本文混入の補正）。 */
export function normalizeSummaryOutput(
  raw: string,
  themeLabel: string,
): string {
  let text = raw.replace(/\r\n/g, "\n").trim();
  text = text.replace(/^```[\s\S]*?\n/, "").replace(/\n```$/, "").trim();
  text = stripThemeLabelFromText(text, themeLabel);

  const prefix = summaryPrefix(themeLabel);
  const suffix = summarySuffix();

  if (!text.startsWith(prefix)) {
    // モデルが定型を省略したら付与
    text = text.replace(/^Value[０-９0-9].*?行動指針について、/, "");
    text = `${prefix}${text}`;
  }

  if (!text.endsWith(suffix) && !text.includes(suffix)) {
    text = text.replace(/。\s*$/, "") + suffix;
  }

  // 定型直後に指針コードが残っていたら落とす
  text = text.replace(
    new RegExp(
      `^(${escapeRegExp(prefix)})\\s*\\d+\\s*[-－]\\s*[①-⑩][^、]*、?`,
    ),
    "$1",
  );

  return text.replace(/\n{2,}/g, "\n").trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
