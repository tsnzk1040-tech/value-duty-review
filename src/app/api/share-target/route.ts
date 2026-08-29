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

function shareTargetPath(incoming: ShareIncoming): string {
  const query = new URLSearchParams();
  if (incoming.title.trim()) query.set("title", incoming.title);
  if (incoming.text.trim()) query.set("text", incoming.text);
  if (incoming.url.trim()) query.set("url", incoming.url);
  const encoded = query.toString();
  return encoded ? `/share-target?${encoded}` : "/share-target";
}

function receiveHtml(incoming: ShareIncoming): NextResponse {
  const classified = classifyShare(incoming);
  const pending = hasShareIncoming(incoming)
    ? buildPendingShare(classified.suggested, incoming, classified)
    : null;
  const nextPath = shareTargetPath(incoming);
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

function toShareTarget(request: Request, incoming: ShareIncoming): NextResponse {
  const path = shareTargetPath(incoming);
  if (path.length > 1800) return receiveHtml(incoming);
  return NextResponse.redirect(new URL(path, request.url), 303);
}

/** 古い POST マニフェスト用。本体は GET /share-target。 */
export async function POST(request: Request) {
  let incoming: ShareIncoming = { title: "", text: "", url: "" };
  try {
    incoming = await incomingFromFormData(await request.formData());
  } catch {
    // 空のまま share-target へ
  }
  return toShareTarget(request, incoming);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return toShareTarget(request, incomingFromSearchParams(searchParams));
}
