/** 投稿から要約用の短文を拾う（スタブ退避用。本線は Gemini）。 */
export function extractSummaryPoints(sourcePost: string, max = 3): string[] {
  const raw = sourcePost.replace(/\r\n/g, "\n").trim();
  if (!raw) return [];

  const chunks = raw
    .split(/\n+|。|！|？/)
    .map((s) => s.replace(/^[\s・\-–—*]+/, "").trim())
    .filter((s) => s.length >= 8)
    .filter(
      (s) =>
        !/^(本日の|今日の|テーマは|行動指針|ありがとうございます|詳細|既読|Next:|次回|担当は|よろしく|Value\s*\d)/i.test(
          s,
        ),
    );

  const unique: string[] = [];
  for (const c of chunks) {
    const clipped = c.length > 72 ? `${c.slice(0, 72)}…` : c;
    if (unique.some((u) => u === clipped)) continue;
    unique.push(clipped);
    if (unique.length >= max) break;
  }
  return unique;
}
