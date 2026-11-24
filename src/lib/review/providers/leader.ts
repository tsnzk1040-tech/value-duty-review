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
  LEADER_FLAVORS,
  LEADER_SEARCH_LEAD,
  leaderRetrySuffix,
  type LeaderFlavor,
  type LeaderGenerateInput,
} from "@/lib/review/prompts";
import { callGeminiRaw } from "@/lib/review/providers/gemini";
import { resolveSameThemeQuoteClosed } from "@/lib/review/providers/same-theme-quote";
import type { GenerateProviderId } from "@/lib/review/providers/summary";

export type LeaderCandidateItem = {
  variant: LeaderFlavor;
  leaderNote: string;
  provider: GenerateProviderId;
  model?: string;
  fallbackReason?: string;
};

export type LeaderGenerateResult = {
  leaderNote: string;
  candidates: LeaderCandidateItem[];
  provider: GenerateProviderId;
  model?: string;
  /** 同テーマ前回を本文に入れたか */
  sameThemeApplied?: boolean;
  /** 候補はあったがサーバが意図的に外した／入れられなかった理由 */
  sameThemeSkipReason?: string;
};

function buildStubBodyForFlavor(
  input: LeaderGenerateInput,
  flavor: LeaderFlavor,
): string {
  const points = extractSummaryPoints(input.sourcePost, 2);
  const hook =
    input.researchFocus.trim() ||
    input.keywords.trim() ||
    (points[0] ? points[0].slice(0, 40) : "");
  const linkHint =
    input.selectedLinkTitles[0] != null
      ? `「${input.selectedLinkTitles[0]}」も参考にしつつ、`
      : "";
  const briefPoint = (input.researchBrief.trim().split(/[。\n]/)[0] ?? "")
    .trim()
    .slice(0, 60);

  if (flavor === "reframe") {
    const lead = hook
      ? `「${hook}」に触れた実践、迷いを長引かせない動きですね。`
      : "今日の振り返り、具体があって動きが見えやすいですね。";
    const cite = briefPoint
      ? `関連して調べてみると、「${briefPoint}」という考え方もありました。`
      : "";
    return [
      lead,
      cite,
      "確認仕事でも、やり方を足す前に『どこで立ち止まるか』の軸を持てると、同じ場面の見え方が変わりそうです。",
    ].join("");
  }

  if (flavor === "light") {
    const lead = hook
      ? `「${hook}」の工夫、忙しい中でも丁寧に向き合っていますね。`
      : "今日の振り返り、現場の工夫が見えて心強いですね。";
    const cite = briefPoint
      ? `調べてみたところ、「${briefPoint.slice(0, 32)}」とも。`
      : "";
    return [lead, cite, "その丁寧さ、周りにも効いていきそうですね。"].join("");
  }

  const briefHint = briefPoint
    ? `${LEADER_SEARCH_LEAD}「${briefPoint}」とありました。`
    : "";

  return [
    hook
      ? `「${hook}」に触れた実践、共有ありがとうございます。現場でも使えそうでいいですね。`
      : "今日の振り返り、共有ありがとうございます。具体があってわかりやすいですね。",
    briefHint,
    briefHint || linkHint
      ? `${briefHint ? "我々も、" : ""}${linkHint}朝の依頼の時点で『誰に聞くか』を先に決める、をチームの型にしてみたらどうでしょう。`
      : "同じ詰まりを減らすなら、先に『誰に聞くか』を決める、をチームの型にしてみたらどうでしょう。",
  ].join("");
}

export function generateLeaderStub(
  input: LeaderGenerateInput,
): LeaderGenerateResult {
  const fixedIn = input.sameThemeFixedSentence ?? "";
  const candidates: LeaderCandidateItem[] = LEADER_FLAVORS.map((variant) => {
    const rawBody = buildStubBodyForFlavor(input, variant);
    const leaderNote = applySameThemeFixedSentence(rawBody, fixedIn, {
      mode: "intro",
    });
    return {
      variant,
      leaderNote,
      provider: "stub",
    };
  });

  const primary = candidates[0]!.leaderNote;
  const applied = Boolean(fixedIn.trim() && /同テーマ前回の/.test(primary));

  return {
    leaderNote: primary,
    candidates,
    provider: "stub",
    sameThemeApplied: applied,
    sameThemeSkipReason:
      fixedIn.trim() && !applied
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

const FLAVOR_TEMP: Record<LeaderFlavor, number> = {
  standard: 0.55,
  reframe: 0.7,
  light: 0.65,
};

async function generateSingleLeaderVariant(
  input: LeaderGenerateInput,
  flavor: LeaderFlavor,
  opts: { apiKey: string; model: string; hasSameThemeInput: boolean },
): Promise<string> {
  const temp = FLAVOR_TEMP[flavor];
  const prompt = buildLeaderInstructions(input, flavor);
  const first = await callGeminiRaw(prompt, opts.model, opts.apiKey, temp);
  let assembled = assembleLeaderNote(first, { flavor });
  if (!assembled) {
    const retryPrompt = [
      prompt,
      "",
      leaderRetrySuffix(opts.hasSameThemeInput, flavor),
    ].join("\n");
    const second = await callGeminiRaw(
      retryPrompt,
      opts.model,
      opts.apiKey,
      temp,
    );
    assembled = assembleLeaderNote(second, { flavor });
  }
  if (!assembled) {
    throw new Error(`Gemini leader note (${flavor}) too weak after retry`);
  }
  return assembled;
}

export async function generateLeaderGemini(
  input: LeaderGenerateInput,
): Promise<LeaderGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  const fixedIn = input.sameThemeFixedSentence?.trim() ?? "";
  const material = input.sameThemeQuoteMaterial?.trim() ?? "";
  const hasSameThemeInput = Boolean(fixedIn);

  const settled = await Promise.allSettled(
    LEADER_FLAVORS.map((flavor) =>
      generateSingleLeaderVariant(input, flavor, {
        apiKey,
        model,
        hasSameThemeInput,
      }),
    ),
  );

  const rawCandidates: { variant: LeaderFlavor; note: string }[] = [];
  settled.forEach((res, idx) => {
    const variant = LEADER_FLAVORS[idx]!;
    if (res.status === "fulfilled") {
      rawCandidates.push({ variant, note: res.value });
    } else {
      const reason =
        res.reason instanceof Error ? res.reason.message : String(res.reason);
      console.error(`leader ${variant} failed:`, reason);
    }
  });

  if (rawCandidates.length === 0) {
    throw new Error("All Gemini leader note variants failed");
  }

  // 同テーマ前回は1回だけ整文して全候補へ共通適用（API節約・表現整合）
  const refDraft =
    rawCandidates.find((c) => c.variant === "standard")?.note ??
    rawCandidates[0]!.note;
  let fixed = "";
  let mode: SameThemeEndingMode = "bridge";
  if (fixedIn) {
    const prepared = await prepareSameThemeFixedStem(fixedIn, {
      material,
      themeLabel: input.themeLabel,
      todaySummary: input.summary,
      todaySourcePost: input.sourcePost,
      todayLeaderDraft: refDraft,
      apiKey,
      model,
    });
    if (prepared) {
      fixed = prepared.stem;
      mode = prepared.mode;
    }
  }

  const candidates: LeaderCandidateItem[] = rawCandidates.map((c) => {
    const withFixed = applySameThemeFixedSentence(c.note, fixed, { mode });
    return {
      variant: c.variant,
      leaderNote: withFixed,
      provider: "gemini",
      model,
    };
  });

  const primary =
    candidates.find((c) => c.variant === "standard")?.leaderNote ??
    candidates[0]!.leaderNote;

  if (fixed && !/同テーマ前回の/.test(primary)) {
    throw new Error("same-theme fixed sentence missing after apply");
  }

  const applied = Boolean(fixed && /同テーマ前回の/.test(primary));
  return {
    leaderNote: primary,
    candidates,
    provider: "gemini",
    model,
    sameThemeApplied: applied,
    sameThemeSkipReason:
      hasSameThemeInput && !applied
        ? "前回要約から bridge／intro とも作れず、引用を外した"
        : undefined,
  };
}
