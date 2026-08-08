import type { LinkCandidate } from "@/lib/review/draft";

/** POC stub search — Gemini grounding 失敗時の退避。 */
export function stubSearchLinks(keywords: string): LinkCandidate[] {
  const q = keywords.trim() || "行動指針";
  const enc = encodeURIComponent(q);
  return [
    {
      id: "stub-1",
      title: `${q}とは`,
      url: `https://www.google.com/search?q=${enc}`,
      selected: false,
      snippet: "",
    },
    {
      id: "stub-2",
      title: `${q} 事例`,
      url: `https://www.google.com/search?q=${enc}+事例`,
      selected: false,
      snippet: "",
    },
    {
      id: "stub-3",
      title: `${q} とは わかりやすく`,
      url: `https://www.google.com/search?q=${enc}+わかりやすく`,
      selected: false,
      snippet: "",
    },
  ];
}
