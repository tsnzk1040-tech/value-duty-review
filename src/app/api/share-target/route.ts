import { NextResponse } from "next/server";

import { SHARE_INCOMING_KEY } from "@/lib/review/share-target";

export const dynamic = "force-dynamic";

function field(form: FormData, ...keys: string[]): string {
  for (const key of keys) {
    const value = form.get(key);
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function escapeForInlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * PWA share_target の POST 受け口。
 * GET の ?url= に Google の長い検索 URL を載せると、Android が
 * リンク共有として WowTalk 等へ渡すことがある。本体はフォームに置く。
 */
export async function POST(request: Request) {
  let title = "";
  let text = "";
  let url = "";
  try {
    const form = await request.formData();
    title = field(form, "title", "stitle");
    text = field(form, "text", "stext");
    url = field(form, "url", "slink");
  } catch {
    // 空のまま受けて share-target へ
  }

  const payload = { title, text, url };
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>共有を受け取り中</title>
</head>
<body>
  <p>共有を受け取ってる…</p>
  <script>
    try {
      localStorage.setItem(${JSON.stringify(SHARE_INCOMING_KEY)}, ${escapeForInlineJson(payload)});
    } catch (e) {}
    location.replace("/share-target");
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
