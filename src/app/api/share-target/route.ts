import { NextResponse } from "next/server";

import {
  SHARE_PENDING_KEY,
  buildPendingShare,
  classifyShare,
  fillMissingShareUrl,
  hasShareIncoming,
  incomingFromRequest,
  incomingFromSearchParams,
  type ShareIncoming,
} from "@/lib/review/share-target";

export const dynamic = "force-dynamic";

function escapeForInlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * クエリに Google URL を載せない。Location も /review のみ。
 * GET の ?url= / 未エンコードの text=https://google.com/...?x&y が
 * WowTalk のリンク共有（サインイン）を開く。
 */
function receiveHtml(incoming: ShareIncoming): NextResponse {
  const filled = fillMissingShareUrl(incoming);
  const classified = classifyShare(filled);
  const pending = hasShareIncoming(filled)
    ? buildPendingShare(classified.suggested, filled, classified)
    : null;
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
      ${
        pending
          ? `localStorage.setItem(${JSON.stringify(SHARE_PENDING_KEY)}, ${escapeForInlineJson(pending)});`
          : ""
      }
    } catch (e) {}
    location.replace("/review");
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

export async function POST(request: Request) {
  const incoming = await incomingFromRequest(request);
  return receiveHtml(incoming);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return receiveHtml(incomingFromSearchParams(searchParams));
}
