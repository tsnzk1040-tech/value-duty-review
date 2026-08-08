import {
  callGeminiGenerate,
  callGeminiRaw,
} from "@/lib/review/providers/gemini";
import type { GenerateProviderId } from "@/lib/review/providers/summary";

export type ResearchBriefInput = {
  keywords: string;
  researchFocus: string;
  themeLabel: string;
  sourcePost: string;
  summary: string;
  selectedLinks: { title: string; url: string }[];
};

export type ResearchBriefResult = {
  researchBrief: string;
  provider: GenerateProviderId;
  model?: string;
};

export function generateResearchBriefStub(
  input: ResearchBriefInput,
): ResearchBriefResult {
  const lines = input.selectedLinks.map(
    (l, i) =>
      `【${i + 1} ${l.title}】\n- （スタブ）URLを開き、フォーカス「${input.researchFocus.trim() || "要点"}」に関連する点をメモしてください\n- ${l.url}`,
  );
  const hint = input.researchFocus.trim()
    ? `フォーカスへのヒント: 「${input.researchFocus.trim()}」を所感の一文の芯にする。`
    : "フォーカスへのヒント: 採択リンクから明日試せる一手を一文で拾う。";
  return {
    researchBrief: [...lines, "", hint].join("\n"),
    provider: "stub",
  };
}

export async function generateResearchBriefGemini(
  input: ResearchBriefInput,
): Promise<ResearchBriefResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  const linkBlock = input.selectedLinks
    .map((l, i) => `${i + 1}. ${l.title}\n   ${l.url}`)
    .join("\n");

  const prompt = [
    "あなたは職場の理念浸透レビュー用に、採択した参考リンクの要点メモを書く助手です。",
    "所感の最終脚色の下地になる。長文禁止。コピペ全文禁止。",
    "",
    "【出力形式（厳守）】",
    "各採択リンクについて:",
    "【N タイトル】",
    "- 要点（2〜4行。フォーカス指示に寄せる）",
    "最後に1行:",
    "フォーカスへのヒント: …",
    "",
    "URLは本文に書かない（タイトルで識別）。「ですね」禁止。",
    "",
    `検索キーワード: ${input.keywords.trim() || "なし"}`,
    `所感向けフォーカス指示（ハーネス）: ${input.researchFocus.trim()}`,
    `テーマ: ${input.themeLabel}`,
    "要約（接続用）:",
    input.summary.trim().slice(0, 400) || "（なし）",
    "投稿抜粋:",
    input.sourcePost.trim().slice(0, 400) || "（なし）",
    "採択リンク:",
    linkBlock,
  ].join("\n");

  let text = "";
  try {
    const result = await callGeminiGenerate(prompt, model, apiKey, {
      temperature: 0.4,
      tools: [{ google_search: {} }, { url_context: {} }],
    });
    text = result.text;
  } catch {
    text = await callGeminiRaw(prompt, model, apiKey, 0.4);
  }

  if (!text || text.length < 40) {
    throw new Error("Gemini research brief too short");
  }

  return { researchBrief: text.trim(), provider: "gemini", model };
}
