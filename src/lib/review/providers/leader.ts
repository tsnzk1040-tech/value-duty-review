import { extractSummaryPoints } from "@/lib/review/draft-extract";
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

  const historyBlock = input.historyNotes?.trim() ?? "";
  const nameMatch = historyBlock.match(/呼び名（このまま使う）:\s*([^\n]+)/);
  const quoteMatch = historyBlock.match(
    /引用核（[^）]*）:\s*([^\n]+)/,
  );
  const callName = nameMatch?.[1]?.trim() || "同僚さん";
  const quote =
    quoteMatch?.[1]?.trim() ||
    (points[0] ? points[0].slice(0, 40) : "具体を先に置く");
  const sameTheme = historyBlock
    ? `同テーマ前回の${callName}は、『${quote}』といっていて、今日の共有にも通じますね。`
    : "";

  const leaderNote = [
    hook
      ? `「${hook}」に触れた実践、共有ありがとうございます。現場でも使えそうでいいですね。`
      : "今日の振り返り、共有ありがとうございます。具体があってわかりやすいですね。",
    sameTheme,
    briefHint || linkHint
      ? `${briefHint}${linkHint}同じ詰まりを減らすなら、朝の依頼の時点で『誰に聞くか』を先に決める、をチームの型にしてみたらどうでしょう。`
      : "同じ詰まりを減らすなら、先に『誰に聞くか』を決める、をチームの型にしてみたらどうでしょう。",
  ]
    .filter(Boolean)
    .join("");

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
  const requireSameThemeQuote = Boolean(input.historyNotes?.trim());
  const assembleOpts = { requireSameThemeQuote };

  const first = await callGeminiRaw(
    buildLeaderInstructions(input, "close"),
    model,
    apiKey,
    0.55,
  );
  let assembled = assembleLeaderNote(first, assembleOpts);
  if (!assembled) {
    const retryPrompt = [
      buildLeaderInstructions(input, "close"),
      "",
      leaderRetrySuffix(requireSameThemeQuote),
    ].join("\n");
    const second = await callGeminiRaw(retryPrompt, model, apiKey, 0.55);
    assembled = assembleLeaderNote(second, assembleOpts);
  }
  if (!assembled) {
    throw new Error("Gemini leader note too weak after retry");
  }

  return { leaderNote: assembled, provider: "gemini", model };
}
