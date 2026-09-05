import type { LinkCandidate } from "@/lib/review/draft";
import { callGeminiGenerate } from "@/lib/review/providers/gemini";
import type { GenerateProviderId } from "@/lib/review/providers/summary";
import { stubSearchLinks } from "@/lib/review/search-stub";

export type SearchGenerateInput = {
  keywords: string;
  themeLabel: string;
  sourcePost: string;
};

export type SearchGenerateResult = {
  links: LinkCandidate[];
  provider: GenerateProviderId;
  model?: string;
  fallbackReason?: string;
};

type GroundingChunk = {
  web?: { uri?: string; title?: string };
};

type GroundingMetadata = {
  groundingChunks?: GroundingChunk[];
  webSearchQueries?: string[];
};

function extractLinksFromGrounding(raw: unknown, keywords: string): LinkCandidate[] {
  const data = raw as {
    candidates?: { groundingMetadata?: GroundingMetadata }[];
  };
  const meta = data.candidates?.[0]?.groundingMetadata;
  const chunks = meta?.groundingChunks ?? [];
  const seen = new Set<string>();
  const links: LinkCandidate[] = [];

  for (const chunk of chunks) {
    const url = chunk.web?.uri?.trim();
    const title = chunk.web?.title?.trim();
    if (!url || !title) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    links.push({
      id: `g-${links.length + 1}`,
      title,
      url,
      selected: false,
      snippet: "",
    });
    if (links.length >= 6) break;
  }

  if (links.length === 0) {
    return stubSearchLinks(keywords).map((l) => ({ ...l, snippet: "" }));
  }
  return links;
}

export async function generateSearchGemini(
  input: SearchGenerateInput,
): Promise<SearchGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";

  const prompt = [
    "職場の理念浸透レビュー用に、参考リンク候補を集める助手です。",
    "Google検索ツールを使い、次のキーワード・文脈に合う信頼できそうなページを探してください。",
    "最終テキストは短くてよい（候補は grounding の引用から取る）。",
    "",
    `キーワード: ${input.keywords.trim()}`,
    `今日のテーマ: ${input.themeLabel}`,
    "投稿抜粋:",
    input.sourcePost.trim().slice(0, 400) || "（なし）",
  ].join("\n");

  const { text, raw } = await callGeminiGenerate(prompt, model, apiKey, {
    temperature: 0.2,
    tools: [{ google_search: {} }],
  });

  const links = extractLinksFromGrounding(raw, input.keywords);
  if (links.length === 0 || links.every((l) => l.id.startsWith("stub"))) {
    // grounding が空でも text がある場合はスタブ扱い
    if (links[0]?.id.startsWith("stub")) {
      return {
        links,
        provider: "stub",
        model,
        fallbackReason: text
          ? "grounding chunks empty; stub links"
          : "empty grounding",
      };
    }
  }

  return { links, provider: "gemini", model };
}
