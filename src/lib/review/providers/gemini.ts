/** Shared Gemini generateContent call for review providers. */

export type GeminiGenerateOptions = {
  temperature?: number;
  /** e.g. [{ google_search: {} }] */
  tools?: Record<string, unknown>[];
};

export type GeminiGenerateResult = {
  text: string;
  raw: unknown;
};

export async function callGeminiGenerate(
  prompt: string,
  model: string,
  apiKey: string,
  options: GeminiGenerateOptions = {},
): Promise<GeminiGenerateResult> {
  const temperature = options.temperature ?? 0.45;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (options.tools?.length) {
    body.tools = options.tools;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string; thought?: boolean }[] };
      finishReason?: string;
      groundingMetadata?: unknown;
    }[];
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  return { text, raw: data };
}

/** Text-only helper used by summary/leader. */
export async function callGeminiRaw(
  prompt: string,
  model: string,
  apiKey: string,
  temperature = 0.45,
): Promise<string> {
  const { text } = await callGeminiGenerate(prompt, model, apiKey, {
    temperature,
  });
  if (!text) {
    throw new Error("Gemini returned empty text");
  }
  return text;
}
