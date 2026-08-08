import { extractSummaryPoints } from "@/lib/review/draft-extract";
import {
  assembleSummary,
  buildSummaryInstructions,
  type SummaryGenerateInput,
} from "@/lib/review/prompts";
import { summaryPrefix, summarySuffix } from "@/lib/review/theme-meta";

export type GenerateProviderId = "gemini" | "stub";

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

async function callGeminiRaw(
  prompt: string,
  model: string,
  apiKey: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.45,
        maxOutputTokens: 2048,
        // 2.5 Flash: thinking が出力枠を食い尽くさないようオフ
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string; thought?: boolean }[] };
      finishReason?: string;
    }[];
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const raw = parts
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!raw) {
    const finish = data.candidates?.[0]?.finishReason ?? "unknown";
    throw new Error(`Gemini returned empty text (finish=${finish})`);
  }
  return raw;
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
