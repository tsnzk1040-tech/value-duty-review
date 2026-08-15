import { extractSummaryPoints } from "@/lib/review/draft-extract";
import {
  assembleLeaderNote,
  buildLeaderInstructions,
  type LeaderGenerateInput,
} from "@/lib/review/prompts";
import { callGeminiRaw } from "@/lib/review/providers/gemini";
import type { GenerateProviderId } from "@/lib/review/providers/summary";

export type LeaderGenerateResult = {
  leaderNote: string;
  provider: GenerateProviderId;
  model?: string;
};

export function generateLeaderStub(
  input: LeaderGenerateInput,
): LeaderGenerateResult {
  const points = extractSummaryPoints(input.sourcePost, 2);
  const hook =
    input.researchFocus.trim() ||
    input.lens.trim() ||
    input.keywords.trim() ||
    (points[0] ? points[0].slice(0, 40) : "");
  const linkHint =
    input.selectedLinkTitles[0] != null
      ? `「${input.selectedLinkTitles[0]}」も参考にしつつ、`
      : "";
  const briefHint = input.researchBrief.trim()
    ? "調べた要点を踏まえ、"
    : "";

  const leaderNote = [
    hook
      ? `「${hook}」に触れた実践、共有ありがとうございます。現場でも使えそうでいいですね。`
      : "今日の振り返り、共有ありがとうございます。具体があってわかりやすいですね。",
    briefHint || linkHint
      ? `${briefHint}${linkHint}明日は小さな一手だけ決めて動いてみると楽そうです。どこから試しそうですか。`
      : "明日は小さな一手だけ決めて動いてみると楽そうです。どこから試しそうですか。",
  ].join("");

  return { leaderNote, provider: "stub" };
}

export async function generateLeaderGemini(
  input: LeaderGenerateInput,
): Promise<LeaderGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  const first = await callGeminiRaw(
    buildLeaderInstructions(input),
    model,
    apiKey,
    0.55,
  );
  let assembled = assembleLeaderNote(first);
  if (!assembled) {
    const retryPrompt = [
      buildLeaderInstructions(input),
      "",
      "【再出力指示】",
      "直前の出力は不合格（短すぎ／お礼や要約定型の混入／リンク解説が主役／締めの強い誘い／布教・標語調／薄すぎ）。",
      "所感の型で再出力せよ: ①共感・感謝 ②テーマに会話っぽく一言 ③具体1つ ④やわらかい薄い問い。",
      "宣教師口調禁止。上司として寄り添うカジュアルなです・ます。『理念浸透』『指針の実践』連発は不可。",
      "参照は材料まで。『皆さんでやってみませんか』は書かない。共感の「ですね」は可。",
    ].join("\n");
    const second = await callGeminiRaw(retryPrompt, model, apiKey, 0.55);
    assembled = assembleLeaderNote(second);
  }
  if (!assembled) {
    throw new Error("Gemini leader note too weak after retry");
  }

  return { leaderNote: assembled, provider: "gemini", model };
}
