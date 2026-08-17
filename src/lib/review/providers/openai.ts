/** OpenAI Chat Completions（要約・要点・所感。所感は要約で選んだモデルを踏襲） */

function formatOpenAiHttpError(status: number, errText: string): string {
  if (status === 429 && /quota|billing/i.test(errText)) {
    return "OpenAIの利用枠（課金）が足りない。platform.openai.com の Billing でクレジットを入れてから再試行";
  }
  if (status === 401) {
    return "OpenAI APIキーが無効。Vercel の OPENAI_API_KEY を確認";
  }
  return `OpenAI HTTP ${status}: ${errText.slice(0, 200)}`;
}

export async function callOpenAiRaw(
  prompt: string,
  model: string,
  apiKey: string,
  temperature = 0.45,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(formatOpenAiHttpError(res.status, errText));
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("OpenAI returned empty text");
  return text;
}

export function openAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function openAiApiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}
