import { buildCreedAlignmentBlock } from "@/lib/creed/corporate-creed";
import { looksLikeLeaderEmpathyQuote } from "@/lib/review/history";
import { callGeminiRaw } from "@/lib/review/providers/gemini";

export type SameThemeQuoteMode = "bridge" | "intro";

export type SameThemeQuoteResolveResult = {
  quote: string;
  mode: SameThemeQuoteMode;
};

function compact(text: string): string {
  return text.replace(/\s+/g, "").trim();
}

/** 引用が前回要約材料に根ざしているか（転用・捏造防止）。 */
export function quoteGroundedInSummaryMaterial(
  quote: string,
  material: string,
): boolean {
  const q = compact(quote);
  const m = compact(material);
  if (q.length < 8 || m.length < 8) return false;
  if (m.includes(q)) return true;
  const window = Math.min(12, Math.max(8, Math.floor(q.length / 3)));
  for (let i = 0; i <= q.length - window; i++) {
    if (m.includes(q.slice(i, i + window))) return true;
  }
  return false;
}

/** 今日の文（要約・投稿・所感）への丸コピー／高類似を弾く。 */
export function quoteOverlapsToday(
  quote: string,
  todayParts: string[],
): boolean {
  const q = compact(quote);
  if (q.length < 12) return false;
  for (const part of todayParts) {
    const t = compact(part);
    if (t.length < 12) continue;
    if (t.includes(q) || q.includes(t)) return true;
    const n = Math.min(24, q.length, t.length);
    if (n >= 16 && q.slice(0, n) === t.slice(0, n)) return true;
  }
  return false;
}

function cleanQuoteLine(text: string): string {
  let out = text
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/^```(?:\w+)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  out =
    out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)[0]
      ?.replace(/^[-*・\d.）)\s]+/, "")
      .replace(/^["「『]|["」』]$/g, "")
      .trim() ?? "";
  return out;
}

function parseResolvePayload(raw: string): SameThemeQuoteResolveResult | null {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text || text === '""' || text === "空" || /^なし|無し|empty$/i.test(text)) {
    return null;
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        mode?: string;
        quote?: string;
      };
      const quote = (parsed.quote ?? "").replace(/[「」『』]/g, "").trim();
      if (quote.length < 8 || quote.length > 140) return null;
      if (/出力は|途中切れ|引用本文|補助材料|mode|quote/.test(quote)) {
        return null;
      }
      const mode: SameThemeQuoteMode =
        parsed.mode === "intro" ? "intro" : "bridge";
      return { quote, mode };
    } catch {
      // fall through
    }
  }

  const line = cleanQuoteLine(text);
  if (line.length < 8 || line.length > 140) return null;
  if (/出力は|途中切れ|引用本文|補助材料/.test(line)) return null;
  const tagged = line.match(/^(bridge|intro)\s*[:：]\s*(.+)$/i);
  if (tagged) {
    const quote = tagged[2]!.replace(/[「」『』]/g, "").trim();
    if (quote.length < 8) return null;
    return {
      quote,
      mode: tagged[1]!.toLowerCase() === "intro" ? "intro" : "bridge",
    };
  }
  return { quote: line.replace(/[「」『』]/g, "").trim(), mode: "bridge" };
}

function acceptResolved(
  resolved: SameThemeQuoteResolveResult | null,
  material: string,
  todayParts: string[],
): SameThemeQuoteResolveResult | null {
  if (!resolved?.quote) return null;
  if (looksLikeLeaderEmpathyQuote(resolved.quote)) return null;
  if (quoteOverlapsToday(resolved.quote, todayParts)) return null;
  if (!quoteGroundedInSummaryMaterial(resolved.quote, material)) return null;
  return resolved;
}

/**
 * 同テーマ引用を選ぶ＋意味閉じ。
 * 候補箱は前回要約のあいだのみ。選び方は bridge → intro。
 */
export async function resolveSameThemeQuoteClosed(opts: {
  seedQuote: string;
  material?: string;
  themeLabel: string;
  todaySummary?: string;
  todaySourcePost?: string;
  /** 接続判定の参考のみ。引用本文の材料にしてはいけない */
  todayLeaderDraft?: string;
  apiKey?: string;
  model?: string;
}): Promise<SameThemeQuoteResolveResult | null> {
  const material = (opts.material ?? "").replace(/\s+/g, " ").trim();
  const seed = opts.seedQuote.replace(/[「」『』]/g, "").trim();
  if (material.length < 12) return null;

  const seedOk =
    seed.length >= 8 &&
    !looksLikeLeaderEmpathyQuote(seed) &&
    quoteGroundedInSummaryMaterial(seed, material)
      ? seed
      : "";

  const todayParts = [
    opts.todaySummary ?? "",
    opts.todaySourcePost ?? "",
    opts.todayLeaderDraft ?? "",
  ].filter((p) => p.trim().length > 0);

  const todayForBridge = [
    (opts.todaySummary ?? "").replace(/\s+/g, " ").trim().slice(0, 320),
    (opts.todaySourcePost ?? "").replace(/\s+/g, " ").trim().slice(0, 280),
  ]
    .filter(Boolean)
    .join("\n");

  const apiKey = opts.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    if (
      seedOk &&
      !quoteOverlapsToday(seedOk, todayParts) &&
      seedOk.length <= 120
    ) {
      return { quote: seedOk, mode: "intro" };
    }
    return null;
  }

  const model =
    opts.model?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-2.5-flash";

  const prompt = [
    "あなたは職場のレビュー文で使う『同テーマ前回の引用』を選ぶ助手です。",
    "候補は【前回要約のあいだ】だけ。そこから意味が閉じた実践事実の一言を1つ作れ。",
    "",
    "【優先順位】",
    "1. bridge … 今日の主線（今日の要約・投稿の実践）と自然につながる一言",
    "2. intro … 今日とは無理に繋げられないとき。指針・Valueの核に乗る一言を単なる紹介として出す",
    "bridge が正直に言えないなら intro。どちらも無理なら空。",
    "",
    "【厳守】",
    "- 出力は JSON のみ: {\"mode\":\"bridge\"|\"intro\",\"quote\":\"…\"}",
    "- quote は【前回要約のあいだ】にある内容だけの言い換え・短縮（鉤括弧・前置きなし）",
    "- 所感・共感・締めの文は使わない（分かります／いいですね／ありがとう 等）",
    "- 今日の要約・投稿・所感の文をコピーしない",
    "- 目安 28〜90字。長くても120字。途中切れ禁止",
    "- 入力にない事実を足さない",
    "- 無理なら {\"mode\":\"intro\",\"quote\":\"\"}",
    "",
    buildCreedAlignmentBlock(opts.themeLabel),
    "",
    "【今日の主線（接続判定用・引用に使わない）】",
    todayForBridge || "（まだ薄い）",
    "",
    "【前回要約のあいだ（唯一の引用元）】",
    material.slice(0, 420),
    "",
    "【シード（要約由来の候補。使ってよい）】",
    seedOk || "（なし）",
  ].join("\n");

  try {
    const text = await callGeminiRaw(prompt, model, apiKey, 0.2);
    const parsed = acceptResolved(parseResolvePayload(text), material, todayParts);
    if (parsed) return parsed;
  } catch {
    // fall through to seed
  }

  if (
    seedOk &&
    !quoteOverlapsToday(seedOk, todayParts) &&
    seedOk.length <= 120
  ) {
    return { quote: seedOk, mode: "intro" };
  }
  return null;
}
