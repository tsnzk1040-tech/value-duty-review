import { extractSummaryPoints } from "@/lib/review/draft-extract";
import {
  assembleSummary,
  buildSummaryInstructions,
  buildSummaryReviseInstructions,
  extractSummaryBody,
  summaryFlavorLabel,
  summaryReviseLengthMode,
  type SummaryFlavor,
  type SummaryGenerateInput,
} from "@/lib/review/prompts";
import { callGeminiRaw } from "@/lib/review/providers/gemini";
import { summaryPrefix, summarySuffix } from "@/lib/review/theme-meta";

export type GenerateProviderId = "gemini" | "stub";
export type SummaryModelId = "gemini";
export type SummaryVariantId = SummaryFlavor;

export type SummaryGenerateResult = {
  summary: string;
  provider: GenerateProviderId;
  model?: string;
  variant?: SummaryVariantId;
};

const VARIANT_MIN_BODY: Record<SummaryVariantId, number> = {
  light: 50,
  rich: 90,
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

function retrySuffix(flavor: SummaryFlavor): string {
  const label = summaryFlavorLabel(flavor);
  const range = flavor === "light" ? "70〜110字" : "140〜200字";
  return [
    "【再出力指示】",
    `直前の出力は不合格（Value名の繰り返し／短すぎ／定型の混入／お礼混入／薄すぎ／調べた事実の欠落）。`,
    `リーダー理解として、浸透リレー実践の事実（調べた／試した）を${label}版（${range}）で言い換え本文のみ再出力せよ。`,
    "「ありがとう」「今日の振り返り」「管理本部として〜」「ですね」「一歩前進」は書かない。",
    "調べた／試した事実があれば必ず含める。投稿に無いことは足さない。",
  ].join("\n");
}

export async function generateSummaryGemini(
  input: SummaryGenerateInput,
  flavor: SummaryFlavor = "rich",
): Promise<SummaryGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const minBody = VARIANT_MIN_BODY[flavor];
  const temperature = flavor === "light" ? 0.35 : 0.5;

  const first = await callGeminiRaw(
    buildSummaryInstructions(input, flavor),
    model,
    apiKey,
    temperature,
  );
  let assembled = assembleSummary(
    first,
    input.themeLabel,
    input.sourcePost,
    minBody,
  );
  if (!assembled) {
    const retryPrompt = [
      buildSummaryInstructions(input, flavor),
      "",
      retrySuffix(flavor),
    ].join("\n");
    const second = await callGeminiRaw(retryPrompt, model, apiKey, temperature);
    assembled = assembleSummary(
      second,
      input.themeLabel,
      input.sourcePost,
      minBody,
    );
  }
  if (!assembled) {
    throw new Error(
      `Gemini summary (${summaryFlavorLabel(flavor)}) body too weak after retry`,
    );
  }

  return {
    summary: assembled,
    provider: "gemini",
    model,
    variant: flavor,
  };
}

export async function reviseSummaryWithProvider(
  input: SummaryGenerateInput,
  currentSummary: string,
  instruction: string,
): Promise<SummaryGenerateResult> {
  const prompt = buildSummaryReviseInstructions(
    input,
    currentSummary,
    instruction,
  );
  const currentMidLen = extractSummaryBody(
    currentSummary,
    input.themeLabel,
  ).length;
  const minBodyChars =
    summaryReviseLengthMode(instruction) === "shorten"
      ? Math.max(40, Math.round(currentMidLen * 0.65))
      : 70;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const raw = await callGeminiRaw(prompt, model, apiKey);
  const assembled = assembleSummary(
    raw,
    input.themeLabel,
    input.sourcePost,
    minBodyChars,
  );
  if (!assembled) throw new Error("Gemini summary revise too weak");
  return { summary: assembled, provider: "gemini", model };
}
