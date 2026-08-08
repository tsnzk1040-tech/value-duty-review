import { callGeminiRaw } from "@/lib/review/providers/gemini";
import type { GenerateProviderId } from "@/lib/review/providers/summary";

export type KeywordSuggestInput = {
  themeLabel: string;
  sourcePost: string;
  summary: string;
  lens: string;
};

export type KeywordSuggestResult = {
  suggestions: string[];
  provider: GenerateProviderId;
  model?: string;
};

function stubSuggestions(input: KeywordSuggestInput): string[] {
  const blob = `${input.summary}\n${input.sourcePost}\n${input.lens}`;
  const parts = blob
    .replace(/[「」『』"""']/g, " ")
    .split(/[\s、。．，,・\n／/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 16)
    .filter((s) => !/^(Value|の|を|に|は|が|と|で|た|です|ます)$/.test(s));
  const uniq: string[] = [];
  for (const p of parts) {
    if (!uniq.includes(p)) uniq.push(p);
    if (uniq.length >= 3) break;
  }
  while (uniq.length < 3) {
    uniq.push(["行動指針 実践", "職場 信頼", "明日の一手"][uniq.length]!);
  }
  return uniq.slice(0, 3);
}

function parseSuggestions(raw: string): string[] {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/^[\d\-・*]+[\.\)]?\s*/, "").trim())
    .filter(Boolean)
    .map((l) => l.replace(/^["「]|["」]$/g, "").trim())
    .filter((l) => l.length >= 2 && l.length <= 40);
  const uniq: string[] = [];
  for (const l of lines) {
    if (!uniq.includes(l)) uniq.push(l);
    if (uniq.length >= 3) break;
  }
  return uniq;
}

export function generateKeywordSuggestionsStub(
  input: KeywordSuggestInput,
): KeywordSuggestResult {
  return { suggestions: stubSuggestions(input), provider: "stub" };
}

export async function generateKeywordSuggestionsGemini(
  input: KeywordSuggestInput,
): Promise<KeywordSuggestResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  const prompt = [
    "職場の理念浸透レビューで、参考リンク検索に使うキーワード候補を出してください。",
    "ちょうど3つ。各行に1フレーズだけ（2〜12語相当の短い検索語）。",
    "番号・説明・引用符・前置きは不要。",
    "投稿の実践・学びに寄せ、抽象的な社名だけの語は避ける。",
    "",
    `テーマ: ${input.themeLabel}`,
    input.lens.trim() ? `要約前観点: ${input.lens.trim()}` : "",
    "要約:",
    input.summary.trim().slice(0, 300) || "（なし）",
    "投稿抜粋:",
    input.sourcePost.trim().slice(0, 300) || "（なし）",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await callGeminiRaw(prompt, model, apiKey, 0.4);
  let suggestions = parseSuggestions(raw);
  if (suggestions.length < 3) {
    const stub = stubSuggestions(input);
    suggestions = [...suggestions, ...stub].filter(
      (v, i, a) => a.indexOf(v) === i,
    );
  }
  return {
    suggestions: suggestions.slice(0, 3),
    provider: "gemini",
    model,
  };
}
