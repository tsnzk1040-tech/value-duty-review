import { callGeminiRaw } from "@/lib/review/providers/gemini";
import type { FinalCheckIssue } from "@/lib/review/final-check";

/** Gemini の追加照合。失敗・キー無しは空（決定論チェックが本線）。指摘は warn のみ。 */
export async function generateLlmFinalCheckIssues(
  post: string,
): Promise<FinalCheckIssue[]> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return [];
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
  const prompt = [
    "職場グループ向けレビュー投稿の追加チェック。JSONだけ返す。",
    '形式: {"issues":[{"message":"短い指摘"}]}',
    "issues が無ければ {\"issues\":[]}",
    "実装・スキル名・POC などのメタは指摘にも本文にも出さない。",
    "",
    "見る点:",
    "1. 「行動指針について」が2回以上",
    "2. 「想いを共有頂きました」の二重",
    "3. お礼・要約に「ですね／ますね」（所感・締めは可）",
    "4. 所感・締めで閉じ」だけあって開き「が無い",
    "5. お礼→Value要約→所感→任意♯→締め の順が崩れている",
    "6. 要約のあいだに Value帯名／指針全文の再掲",
    "7. 所感が個人の明日TODOだけで終わる、または記事要約が半分以上",
    "",
    "投稿:",
    post.trim().slice(0, 8000),
  ].join("\n");

  const raw = await callGeminiRaw(prompt, model, apiKey, 0.1);
  const jsonText = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  const parsed = JSON.parse(jsonText) as { issues?: { message?: string }[] };
  const messages = (parsed.issues ?? [])
    .map((i) => i.message?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 6);
  return messages.map((message, idx) => ({
    id: `llm-${idx + 1}`,
    severity: "warn" as const,
    message: `AI照合: ${message}`,
  }));
}
