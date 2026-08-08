import {
  buildSummaryInstructions,
  normalizeSummaryOutput,
  type SummaryGenerateInput,
} from "@/lib/review/prompts";
import { extractSummaryPoints } from "@/lib/review/draft-extract";
import {
  stripThemeLabelFromText,
  summaryPrefix,
  summarySuffix,
} from "@/lib/review/theme-meta";

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
  const points = extractSummaryPoints(input.sourcePost, 2).map((p) =>
    stripThemeLabelFromText(p, input.themeLabel),
  );
  const gist =
    points.filter(Boolean).join("、") ||
    "投稿の具体を好意的に整理した内容";
  const lensBit = input.lens.trim()
    ? `観点にもつながる形で`
    : "";
  const body = lensBit ? `${gist}を、${lensBit}` : gist;
  const summary = normalizeSummaryOutput(
    `${summaryPrefix(input.themeLabel)}${body}${summarySuffix()}`,
    input.themeLabel,
  );
  return { summary, provider: "stub" };
}

export async function generateSummaryGemini(
  input: SummaryGenerateInput,
): Promise<SummaryGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const model =
    process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: buildSummaryInstructions(input) }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 512,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const raw =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() ?? "";
  if (!raw) {
    throw new Error("Gemini returned empty text");
  }

  return {
    summary: normalizeSummaryOutput(raw, input.themeLabel),
    provider: "gemini",
    model,
  };
}
