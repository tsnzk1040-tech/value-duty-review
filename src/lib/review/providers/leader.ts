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
      ? `${briefHint}${linkHint}「${hook}」を自分の仕事に引きつけて実践した点が、チームの今日の一歩につながると感じます。`
      : `${briefHint}${linkHint}今日の振り返り実践が、チームの理念浸透の一歩になっていると感じます。`,
    "明日も一言だけ決めて動けると、リレーが続きそうです。",
  ].join("\n");

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
      "直前の出力は不合格（短すぎ／お礼や要約定型の混入／ですね／薄すぎ）。",
      "所感本文のみを150〜280字で再出力せよ。具体→引きつけ→次の一手。",
      "お礼・Value要約・締め定型・ですねは書かない。",
    ].join("\n");
    const second = await callGeminiRaw(retryPrompt, model, apiKey, 0.55);
    assembled = assembleLeaderNote(second);
  }
  if (!assembled) {
    throw new Error("Gemini leader note too weak after retry");
  }

  return { leaderNote: assembled, provider: "gemini", model };
}
