import { themeCodeFromLabel } from "@/lib/rotation/format-notebook";
import type { ValueItem } from "@/lib/rotation/types";

const ARABIC_TO_CIRCLED: Record<string, string> = {
  "1": "①",
  "2": "②",
  "3": "③",
  "4": "④",
  "5": "⑤",
  "6": "⑥",
  "7": "⑦",
  "8": "⑧",
  "9": "⑨",
  "10": "⑩",
  "１": "①",
  "２": "②",
  "３": "③",
  "４": "④",
  "５": "⑤",
  "６": "⑥",
  "７": "⑦",
  "８": "⑧",
  "９": "⑨",
  "１０": "⑩",
};

/** `4-3` / `4-③` / `４－③` → `4-③` */
export function normalizeThemeCode(valueGroup: string, ordinalRaw: string): string {
  const g = valueGroup.replace(/[０-９]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0xff10 + 0x30),
  );
  const circled =
    ARABIC_TO_CIRCLED[ordinalRaw] ??
    (/^[①-⑩]$/.test(ordinalRaw) ? ordinalRaw : null);
  if (!circled) return `${g}-${ordinalRaw}`;
  return `${g}-${circled}`;
}

const CODE_IN_POST_RE =
  /(\d+|[０-９]+)\s*[-－﹣]\s*([①②③④⑤⑥⑦⑧⑨⑩]|[0-9０-９]{1,2})/g;

function labelBody(label: string): string {
  return label
    .replace(/^\d+\s*[-－]\s*[①-⑩]\s*/, "")
    .replace(/[「」『』]/g, "")
    .trim();
}

/**
 * 投稿本文から今日の行動指針（valueItems）を推定する。
 * コード（4-③ / 4-3）優先、次に指針本文の最長一致。
 */
export function matchValueItemFromSourcePost(
  sourcePost: string,
  valueItems: ValueItem[],
): ValueItem | null {
  const text = sourcePost.trim();
  if (!text || valueItems.length === 0) return null;

  for (const m of text.matchAll(CODE_IN_POST_RE)) {
    const code = normalizeThemeCode(m[1]!, m[2]!);
    const hit = valueItems.find((v) => themeCodeFromLabel(v.label) === code);
    if (hit) return hit;
  }

  let best: ValueItem | null = null;
  let bestLen = 0;
  for (const v of valueItems) {
    const body = labelBody(v.label);
    if (body.length < 8) continue;
    if (text.includes(body) && body.length > bestLen) {
      best = v;
      bestLen = body.length;
    }
  }
  return best;
}
