import { POC_VALUE_HEADINGS } from "@/lib/rotation/seed";
import { valueGroupFromLabel } from "@/lib/rotation/value-group";

const CIRCLED_ORDINAL: Record<string, number> = {
  "①": 1,
  "②": 2,
  "③": 3,
  "④": 4,
  "⑤": 5,
  "⑥": 6,
  "⑦": 7,
  "⑧": 8,
  "⑨": 9,
  "⑩": 10,
};

export function valueHeadingForLabel(themeLabel: string): string {
  const g = valueGroupFromLabel(themeLabel);
  if (g != null && g >= 1 && g <= POC_VALUE_HEADINGS.length) {
    return POC_VALUE_HEADINGS[g - 1]!;
  }
  return "Value　（帯を確認）";
}

export function themeOrdinal(themeLabel: string): number | null {
  const m = themeLabel.trim().match(/^\d+\s*[-－]\s*([①-⑩])/);
  if (!m) return null;
  return CIRCLED_ORDINAL[m[1]!] ?? null;
}

/**
 * 要約の定型先頭。
 * このあとに書くのは投稿の要点だけ。行動指針ラベル／全文は書かない。
 */
export function summaryPrefix(themeLabel: string): string {
  const heading = valueHeadingForLabel(themeLabel);
  const ordinal = themeOrdinal(themeLabel);
  const ordinalJa = ordinal != null ? `${ordinal}番目` : "当該";
  return `${heading}   の${ordinalJa}の行動指針について、`;
}

export function summarySuffix(): string {
  return "想いを共有頂きました。";
}

/** テーマラベル本文を要約から落とす（定型で特定済みのため）。 */
export function stripThemeLabelFromText(text: string, themeLabel: string): string {
  let out = text;
  const full = themeLabel.trim();
  if (full) out = out.split(full).join("");
  const withoutCode = full.replace(/^\d+\s*[-－]\s*[①-⑩]\s*/, "").trim();
  if (withoutCode.length >= 6) out = out.split(withoutCode).join("");
  return out.replace(/\s{2,}/g, " ").trim();
}
