/** Google 検索 AI モードを開く URL（公式 API ではない。実運用⑤に寄せる導線）。 */
export function googleAiModeSearchUrl(query: string): string {
  const q = query.trim();
  const params = new URLSearchParams({
    q,
    udm: "50",
    hl: "ja",
    gl: "jp",
  });
  return `https://www.google.com/search?${params.toString()}`;
}
