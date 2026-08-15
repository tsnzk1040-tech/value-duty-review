import {
  assembleClosingCandidates,
  buildClosingInstructions,
  pickClosingVariation,
  type ClosingGenerateInput,
} from "@/lib/review/closing";
import { callGeminiRaw } from "@/lib/review/providers/gemini";
import type { GenerateProviderId } from "@/lib/review/providers/summary";

export type ClosingGenerateResult = {
  closing: string;
  candidates: string[];
  provider: GenerateProviderId;
  model?: string;
};

export function generateClosingStub(
  input: ClosingGenerateInput,
): ClosingGenerateResult {
  const focusBit =
    input.leaderNote
      .split(/[。．\n]/u)
      .map((s) => s.trim())
      .find((s) => s.length >= 8 && s.length <= 40) ?? "";
  const candidates = [
    focusBit
      ? `${focusBit}——その感覚を、明日の一件だけ持ち越してみよう！`
      : "考え方の引き出しが一つ増えた。小さくていいから、現場で触ってみよう！",
    "『できない』の手前に一手ある、と思えたら今日は十分だ。また共有しよう！",
    pickClosingVariation(input.exclude),
  ].filter((c, i, arr) => arr.indexOf(c) === i);
  return {
    closing: candidates[0]!,
    candidates,
    provider: "stub",
  };
}

export async function generateClosingGemini(
  input: ClosingGenerateInput,
): Promise<ClosingGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  const first = await callGeminiRaw(
    buildClosingInstructions(input),
    model,
    apiKey,
    0.7,
  );
  let candidates = assembleClosingCandidates(first, input.exclude);
  if (candidates.length < 2) {
    const retry = await callGeminiRaw(
      [
        buildClosingInstructions(input),
        "",
        "【再出力】汎用スローガンは不可。所感の具体に対応した締めを3行、番号なしで。",
      ].join("\n"),
      model,
      apiKey,
      0.75,
    );
    candidates = assembleClosingCandidates(retry, input.exclude);
  }

  return {
    closing: candidates[0]!,
    candidates,
    provider: "gemini",
    model,
  };
}
