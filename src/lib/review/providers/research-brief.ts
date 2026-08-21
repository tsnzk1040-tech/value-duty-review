import {
  callGeminiGenerate,
  callGeminiRaw,
} from "@/lib/review/providers/gemini";
import type { GenerateProviderId } from "@/lib/review/providers/summary";

export const PAGE_PASTE_MIN_CHARS = 80;

export type ResearchBriefInput = {
  keywords: string;
  researchFocus: string;
  themeLabel: string;
  sourcePost: string;
  summary: string;
  selectedLinks: { title: string; url: string }[];
  /** 開いたページから貼った本文（あるときは要点の正本材料） */
  pagePaste?: string;
};

export type ResearchBriefResult = {
  researchBrief: string;
  provider: GenerateProviderId;
  model?: string;
  /** UI: 本文貼付を促す */
  needsPagePaste?: boolean;
};

const INACCESSIBLE_RE =
  /URL is not accessible|cannot provide a summary|not accessible|Unable to access|アクセスでき(ない|ません)|取得でき(ない|ません)/i;

export function looksLikeUrlInaccessible(text: string): boolean {
  return INACCESSIBLE_RE.test(text);
}

function pagePasteInstruction(): string {
  return [
    "【参照の本文をまだ取得できていません】",
    "1. 上のURLを別タブで開いて内容を確認する",
    "2. 使える段落を「開いたページの本文」欄に貼る",
    "3. 貼ると要点メモが自動で出る（ボタンでも出し直せる）",
    "（要点のまとめはAIがやる。貼るだけでよい）",
  ].join("\n");
}

export function generateResearchBriefStub(
  input: ResearchBriefInput,
): ResearchBriefResult {
  const paste = input.pagePaste?.trim() ?? "";
  const focusNote = input.researchFocus.trim()
    ? `（フォーカス「${input.researchFocus.trim()}」に寄せた）`
    : "";
  if (paste.length >= PAGE_PASTE_MIN_CHARS) {
    const lines = input.selectedLinks.map((l, i) => {
      const excerpt = paste.slice(0, 280).replace(/\s+/g, " ");
      return `【${i + 1} ${l.title}】\n- ${focusNote}貼付本文より: ${excerpt}`;
    });
    return {
      researchBrief: lines.join("\n"),
      provider: "stub",
    };
  }
  const lines = input.selectedLinks.map(
    (l, i) =>
      `【${i + 1} ${l.title}】\n- URLを開き、所感に使える段落を本文欄へ貼ってから再生成してください\n- ${l.url}`,
  );
  return {
    researchBrief: [...lines, "", pagePasteInstruction()].join("\n"),
    provider: "stub",
    needsPagePaste: true,
  };
}

function buildPrompt(
  input: ResearchBriefInput,
  mode: "from-paste" | "with-url-tools",
): string {
  const linkBlock = input.selectedLinks
    .map((l, i) => `${i + 1}. ${l.title}\n   ${l.url}`)
    .join("\n");
  const paste = input.pagePaste?.trim() ?? "";

  const focusLine = input.researchFocus.trim()
    ? `所感向けフォーカス指示（任意）: ${input.researchFocus.trim()}（要点の選び方に反映）`
    : "所感向けフォーカス指示: （まだ無し。所感の『こうしたら？』に使える事実・手順・言い回しを要点に含める）";

  const common = [
    "あなたは職場の理念浸透レビュー用に、採択した参考リンクの要点メモを書く助手です。",
    "所感の最終脚色の下地になる。長文禁止。コピペ全文禁止。",
    "",
    "【出力形式（厳守）】",
    "各採択リンクについて:",
    "【N タイトル】",
    "- 要点（2〜4行）",
    "  ・事実・手順・言い回しなど、所感の提案に直結するものを優先",
    "  ・フォーカス指示があればそれに寄せる",
    "  ・末尾に『フォーカスへのヒント:』行は書かない（要点に織り込む）",
    "",
    "URLは本文に書かない（タイトルで識別）。「ですね」禁止。",
    "英語のエラーメッセージや「URL is not accessible」は絶対に書かない。",
    "",
    `検索キーワード: ${input.keywords.trim() || "なし"}`,
    focusLine,
    `テーマ: ${input.themeLabel}`,
    "要約（接続用）:",
    input.summary.trim().slice(0, 400) || "（なし）",
    "投稿抜粋:",
    input.sourcePost.trim().slice(0, 400) || "（なし）",
    "採択リンク:",
    linkBlock,
  ];

  if (mode === "from-paste") {
    return [
      ...common,
      "",
      "【最重要】トシオが別タブで開いて確認したうえで貼ったページ本文がある。",
      "要点はこの貼付本文だけを根拠にする（推測で埋めない）。",
      "貼付本文:",
      paste.slice(0, 12000),
    ].join("\n");
  }

  return [
    ...common,
    "",
    "可能ならURLの内容を踏まえる。読めない・取れない場合は推測で埋めず、",
    "「本文未取得」とだけ書き、英語の拒否文は出さない。",
  ].join("\n");
}

/** 旧形式の末尾ヒント行を落とす（要点へ吸収後の掃除）。 */
export function stripFocusHintLines(brief: string): string {
  return brief
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*フォーカスへのヒント\s*[:：]/u.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function generateResearchBriefGemini(
  input: ResearchBriefInput,
): Promise<ResearchBriefResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const paste = input.pagePaste?.trim() ?? "";
  const hasPaste = paste.length >= PAGE_PASTE_MIN_CHARS;

  if (hasPaste) {
    const prompt = buildPrompt(input, "from-paste");
    let text = "";
    try {
      const result = await callGeminiGenerate(prompt, model, apiKey, {
        temperature: 0.4,
      });
      text = result.text;
    } catch {
      text = await callGeminiRaw(prompt, model, apiKey, 0.4);
    }
    if (!text || text.length < 40 || looksLikeUrlInaccessible(text)) {
      throw new Error("Gemini research brief from paste failed");
    }
    return {
      researchBrief: stripFocusHintLines(text),
      provider: "gemini",
      model,
    };
  }

  const prompt = buildPrompt(input, "with-url-tools");
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

  if (looksLikeUrlInaccessible(text) || !text || text.length < 40) {
    return {
      researchBrief: pagePasteInstruction(),
      provider: "gemini",
      model,
      needsPagePaste: true,
    };
  }

  return {
    researchBrief: stripFocusHintLines(text),
    provider: "gemini",
    model,
  };
}
