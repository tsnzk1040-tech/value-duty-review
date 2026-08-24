import { POC_VALUE_HEADINGS } from "@/lib/rotation/seed";
import { themeCodeFromLabel } from "@/lib/rotation/format-notebook";
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

/** valueItem id（v4-3）→ 行動指針コード（4-③）。 */
export function themeCodeFromValueItemId(themeId: string): string {
  const m = themeId.trim().match(/^v(\d+)-(\d+)$/i);
  if (!m) return "";
  const circled = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"] as const;
  const n = Number(m[2]);
  if (n < 1 || n > 10) return "";
  return `${Number(m[1])}-${circled[n]}`;
}

export function themeCodeForSelection(themeId: string, themeLabel: string): string {
  return themeCodeFromValueItemId(themeId) || themeCodeFromLabel(themeLabel);
}

/** themeId と themeLabel のコードが食い違う */
export function themeIdLabelMismatch(themeId: string, themeLabel: string): boolean {
  const fromId = themeCodeFromValueItemId(themeId);
  const fromLabel = themeCodeFromLabel(themeLabel);
  if (!fromId || !fromLabel) return false;
  return fromId !== fromLabel;
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
  return "想いを共有頂きました！";
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
