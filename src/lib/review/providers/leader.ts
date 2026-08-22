import { extractSummaryPoints } from "@/lib/review/draft-extract";
import {
  applySameThemeFixedSentence,
  extractQuoteFromSameThemeStem,
  replaceQuoteInSameThemeStem,
  type SameThemeEndingMode,
} from "@/lib/review/history";
import {
  assembleLeaderNote,
  buildLeaderInstructions,
  leaderRetrySuffix,
  type LeaderGenerateInput,
} from "@/lib/review/prompts";
import { callGeminiRaw } from "@/lib/review/providers/gemini";
import { resolveSameThemeQuoteClosed } from "@/lib/review/providers/same-theme-quote";
import type { GenerateProviderId } from "@/lib/review/providers/summary";

export type LeaderGenerateResult = {
  leaderNote: string;
  provider: GenerateProviderId;
  model?: string;
  /** 同テーマ前回を本文に入れたか */
  sameThemeApplied?: boolean;
  /** 候補はあったがサーバが意図的に外した／入れられなかった理由 */
  sameThemeSkipReason?: string;
};

export function generateLeaderStub(
  input: LeaderGenerateInput,
): LeaderGenerateResult {
  const points = extractSummaryPoints(input.sourcePost, 2);
  const hook =
    input.researchFocus.trim() ||
    input.keywords.trim() ||
    (points[0] ? points[0].slice(0, 40) : "");
  const linkHint =
    input.selectedLinkTitles[0] != null
      ? `「${input.selectedLinkTitles[0]}」も参考にしつつ、`
      : "";
  const briefHint = input.researchBrief.trim()
    ? "検索して調べた結果を踏まえ、"
    : "";

  const body = [
    hook
      ? `「${hook}」に触れた実践、共有ありがとうございます。現場でも使えそうでいいですね。`
      : "今日の振り返り、共有ありがとうございます。具体があってわかりやすいですね。",
    briefHint || linkHint
      ? `${briefHint}${linkHint}同じ詰まりを減らすなら、朝の依頼の時点で『誰に聞くか』を先に決める、をチームの型にしてみたらどうでしょう。`
      : "同じ詰まりを減らすなら、先に『誰に聞くか』を決める、をチームの型にしてみたらどうでしょう。",
  ].join("");

  // stub は接続判定できないので紹介末尾に寄せる
  const leaderNote = applySameThemeFixedSentence(
    body,
    input.sameThemeFixedSentence ?? "",
    { mode: "intro" },
  );
  const applied = Boolean(
    input.sameThemeFixedSentence?.trim() && /同テーマ前回の/.test(leaderNote),
  );

  return {
    leaderNote,
    provider: "stub",
    sameThemeApplied: applied,
    sameThemeSkipReason:
      input.sameThemeFixedSentence?.trim() && !applied
        ? "同テーマ前回の差し込みに失敗した"
        : undefined,
  };
}

async function prepareSameThemeFixedStem(
  fixedStem: string,
  opts: {
    material?: string;
    themeLabel: string;
    todaySummary?: string;
    todaySourcePost?: string;
    todayLeaderDraft?: string;
    apiKey: string;
    model: string;
  },
): Promise<{ stem: string; mode: SameThemeEndingMode } | null> {
  const stemIn = fixedStem.trim();
  if (!stemIn) return null;
  const rawQuote =
    extractQuoteFromSameThemeStem(stemIn) ||
    opts.material?.replace(/[「」『』]/g, "").trim() ||
    "";
  if (!rawQuote && !(opts.material ?? "").trim()) return null;

  const resolved = await resolveSameThemeQuoteClosed({
    seedQuote: rawQuote,
    material: opts.material,
    themeLabel: opts.themeLabel,
    todaySummary: opts.todaySummary,
    todaySourcePost: opts.todaySourcePost,
    todayLeaderDraft: opts.todayLeaderDraft,
    apiKey: opts.apiKey,
    model: opts.model,
  });
  if (!resolved?.quote) return null;
  const stem = replaceQuoteInSameThemeStem(stemIn, resolved.quote);
  if (!stem) return null;
  return { stem, mode: resolved.mode };
}

export async function generateLeaderGemini(
  input: LeaderGenerateInput,
): Promise<LeaderGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const fixedIn = input.sameThemeFixedSentence?.trim() ?? "";
  const material = input.sameThemeQuoteMaterial?.trim() ?? "";
  const hasSameThemeInput = Boolean(fixedIn);

  const first = await callGeminiRaw(
    buildLeaderInstructions(input, "close"),
    model,
    apiKey,
    0.55,
  );
  let assembled = assembleLeaderNote(first);
  if (!assembled) {
    const retryPrompt = [
      buildLeaderInstructions(input, "close"),
      "",
      leaderRetrySuffix(hasSameThemeInput),
    ].join("\n");
    const second = await callGeminiRaw(retryPrompt, model, apiKey, 0.55);
    assembled = assembleLeaderNote(second);
  }
  if (!assembled) {
    throw new Error("Gemini leader note too weak after retry");
  }

  // 所感下書きは接続の参考のみ（引用本文の材料にはしない）。要約あいだから bridge→intro
  let fixed = "";
  let mode: SameThemeEndingMode = "bridge";
  if (fixedIn) {
    const prepared = await prepareSameThemeFixedStem(fixedIn, {
      material,
      themeLabel: input.themeLabel,
      todaySummary: input.summary,
      todaySourcePost: input.sourcePost,
      todayLeaderDraft: assembled,
      apiKey,
      model,
    });
    if (prepared) {
      fixed = prepared.stem;
      mode = prepared.mode;
    }
  }

  const withFixed = applySameThemeFixedSentence(assembled, fixed, { mode });
  // 入力はあるが bridge/intro とも無理なら差し込みなしでよい（無理な引用をしない）
  if (fixed && !/同テーマ前回の/.test(withFixed)) {
    throw new Error("same-theme fixed sentence missing after apply");
  }

  const applied = Boolean(fixed && /同テーマ前回の/.test(withFixed));
  return {
    leaderNote: withFixed,
    provider: "gemini",
    model,
    sameThemeApplied: applied,
    sameThemeSkipReason:
      hasSameThemeInput && !applied
        ? "前回要約から bridge／intro とも作れず、引用を外した"
        : undefined,
  };
}
