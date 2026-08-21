import { extractSummaryPoints } from "@/lib/review/draft-extract";
import { applySameThemeFixedSentence } from "@/lib/review/history";
import {
  assembleLeaderNote,
  buildLeaderInstructions,
  leaderRetrySuffix,
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
    input.keywords.trim() ||
    (points[0] ? points[0].slice(0, 40) : "");
  const linkHint =
    input.selectedLinkTitles[0] != null
      ? `「${input.selectedLinkTitles[0]}」も参考にしつつ、`
      : "";
  const briefHint = input.researchBrief.trim()
    ? "検索して調べた結果を踏まえ、"
    : "";

  const body = [
    hook
      ? `「${hook}」に触れた実践、共有ありがとうございます。現場でも使えそうでいいですね。`
      : "今日の振り返り、共有ありがとうございます。具体があってわかりやすいですね。",
    briefHint || linkHint
      ? `${briefHint}${linkHint}同じ詰まりを減らすなら、朝の依頼の時点で『誰に聞くか』を先に決める、をチームの型にしてみたらどうでしょう。`
      : "同じ詰まりを減らすなら、先に『誰に聞くか』を決める、をチームの型にしてみたらどうでしょう。",
  ].join("");

  const leaderNote = applySameThemeFixedSentence(
    body,
    input.sameThemeFixedSentence ?? "",
  );

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
  const fixed = input.sameThemeFixedSentence?.trim() ?? "";
  const hasFixed = Boolean(fixed);

  const first = await callGeminiRaw(
    buildLeaderInstructions(input, "close"),
    model,
    apiKey,
    0.55,
  );
  let assembled = assembleLeaderNote(first);
  if (!assembled) {
    const retryPrompt = [
      buildLeaderInstructions(input, "close"),
      "",
      leaderRetrySuffix(hasFixed),
    ].join("\n");
    const second = await callGeminiRaw(retryPrompt, model, apiKey, 0.55);
    assembled = assembleLeaderNote(second);
  }
  if (!assembled) {
    throw new Error("Gemini leader note too weak after retry");
  }

  const withFixed = applySameThemeFixedSentence(assembled, fixed);
  if (hasFixed && !/同テーマ前回の/.test(withFixed)) {
    throw new Error("same-theme fixed sentence missing after apply");
  }

  return { leaderNote: withFixed, provider: "gemini", model };
}
