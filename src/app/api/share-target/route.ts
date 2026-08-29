import { NextResponse } from "next/server";

import {
  SHARE_INCOMING_KEY,
  SHARE_PENDING_KEY,
  buildPendingShare,
  classifyShare,
  hasShareIncoming,
  incomingFromFormData,
  incomingFromSearchParams,
  type ShareIncoming,
} from "@/lib/review/share-target";

export const dynamic = "force-dynamic";

function escapeForInlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function receiveHtml(incoming: ShareIncoming): NextResponse {
  const classified = classifyShare(incoming);
  const pending = hasShareIncoming(incoming)
    ? buildPendingShare(classified.suggested, incoming, classified)
    : null;
  const nextPath = pending ? "/review" : "/share-target";
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
          : `localStorage.setItem(${JSON.stringify(SHARE_INCOMING_KEY)}, ${escapeForInlineJson(incoming)});`
      }
    } catch (e) {}
    location.replace(${JSON.stringify(nextPath)});
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

/**
 * PWA share_target の受け口。
 * Google URL を GET クエリに載せない（リンク共有として WowTalk へ飛ぶのを避ける）。
 * WowTalk は text が File だったり permalink URL 付きだったりするので、本文を投稿欄へ送る。
 */
export async function POST(request: Request) {
  let incoming: ShareIncoming = { title: "", text: "", url: "" };
  try {
    incoming = await incomingFromFormData(await request.formData());
  } catch {
    // 空のまま受けて review / share-target へ
  }
  return receiveHtml(incoming);
}

/** 古い GET マニフェストや、POST が GET に落ちたときの保険 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return receiveHtml(incomingFromSearchParams(searchParams));
}
