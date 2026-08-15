import { extractSummaryPoints } from "@/lib/review/draft-extract";
import {
  assembleSummary,
  buildSummaryInstructions,
  type SummaryGenerateInput,
} from "@/lib/review/prompts";
import { callGeminiRaw } from "@/lib/review/providers/gemini";
import { callOpenAiRaw, openAiApiKey, openAiModel } from "@/lib/review/providers/openai";
import { summaryPrefix, summarySuffix } from "@/lib/review/theme-meta";

export type GenerateProviderId = "gemini" | "chatgpt" | "stub";
export type SummaryModelId = "gemini" | "chatgpt";

export type SummaryGenerateResult = {
  summary: string;
  provider: GenerateProviderId;
  model?: string;
};

/** キー無し・失敗時。定型は守るが言い換えは弱い（AI本線の退避）。 */
export function generateSummaryStub(
  input: SummaryGenerateInput,
): SummaryGenerateResult {
  const points = extractSummaryPoints(input.sourcePost, 3);
  const gist =
    points.filter(Boolean).join("、") ||
    "投稿の具体・場面を好意的に整理した内容";
  const assembled = assembleSummary(gist, input.themeLabel, input.sourcePost);
  if (!assembled) {
    return {
      summary: `${summaryPrefix(input.themeLabel)}投稿の要点を手で補ってください${summarySuffix()}`,
      provider: "stub",
    };
  }
  return { summary: assembled, provider: "stub" };
}

export async function generateSummaryGemini(
  input: SummaryGenerateInput,
): Promise<SummaryGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  const first = await callGeminiRaw(
    buildSummaryInstructions(input),
    model,
    apiKey,
  );
  let assembled = assembleSummary(first, input.themeLabel, input.sourcePost);
  if (!assembled) {
    const retryPrompt = [
      buildSummaryInstructions(input),
      "",
      "【再出力指示】",
      "直前の出力は不合格（Value名の繰り返し／短すぎ／定型の混入／お礼混入／薄すぎ／調べた事実の欠落）。",
      "リーダー理解として、浸透リレー実践の事実（調べた／試した）を120〜180字で言い換え本文のみ再出力せよ。",
      "「ありがとう」「今日の振り返り」「管理本部として〜」「ですね」「一歩前進」は書かない。",
      "調べた／試した事実があれば必ず含める。",
    ].join("\n");
    const second = await callGeminiRaw(retryPrompt, model, apiKey);
    assembled = assembleSummary(second, input.themeLabel, input.sourcePost);
  }
  if (!assembled) {
    throw new Error("Gemini summary body too weak after retry");
  }

  return { summary: assembled, provider: "gemini", model };
}

export async function generateSummaryChatgpt(
  input: SummaryGenerateInput,
): Promise<SummaryGenerateResult> {
  const apiKey = openAiApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const model = openAiModel();

  const first = await callOpenAiRaw(
    buildSummaryInstructions(input),
    model,
    apiKey,
  );
  let assembled = assembleSummary(first, input.themeLabel, input.sourcePost);
  if (!assembled) {
    const retryPrompt = [
      buildSummaryInstructions(input),
      "",
      "【再出力指示】",
      "直前の出力は不合格（Value名の繰り返し／短すぎ／定型の混入／お礼混入／薄すぎ／調べた事実の欠落）。",
      "リーダー理解として、浸透リレー実践の事実（調べた／試した）を120〜180字で言い換え本文のみ再出力せよ。",
      "「ありがとう」「今日の振り返り」「管理本部として〜」「ですね」「一歩前進」は書かない。",
      "調べた／試した事実があれば必ず含める。",
    ].join("\n");
    const second = await callOpenAiRaw(retryPrompt, model, apiKey);
    assembled = assembleSummary(second, input.themeLabel, input.sourcePost);
  }
  if (!assembled) {
    throw new Error("ChatGPT summary body too weak after retry");
  }

  return { summary: assembled, provider: "chatgpt", model };
}

export async function reviseSummaryWithProvider(
  input: SummaryGenerateInput,
  currentSummary: string,
  instruction: string,
  provider: SummaryModelId,
): Promise<SummaryGenerateResult> {
  const prompt = [
    buildSummaryInstructions(input),
    "",
    "【直し指示】",
    "いまの要約の定型枠（Value帯・何番目・想いを共有頂きました）は維持する。",
    "あいだの言い換え本文だけを、次の指示に従って直す。指示に無い要素は足さない。",
    `直し: ${instruction.trim()}`,
    "",
    "いまの要約全文:",
    currentSummary.trim(),
  ].join("\n");

  if (provider === "chatgpt") {
    const apiKey = openAiApiKey();
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    const model = openAiModel();
    const raw = await callOpenAiRaw(prompt, model, apiKey);
    const assembled = assembleSummary(raw, input.themeLabel, input.sourcePost);
    if (!assembled) throw new Error("ChatGPT summary revise too weak");
    return { summary: assembled, provider: "chatgpt", model };
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const raw = await callGeminiRaw(prompt, model, apiKey);
  const assembled = assembleSummary(raw, input.themeLabel, input.sourcePost);
  if (!assembled) throw new Error("Gemini summary revise too weak");
  return { summary: assembled, provider: "gemini", model };
}
