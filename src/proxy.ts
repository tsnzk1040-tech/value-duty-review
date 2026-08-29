import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * share_target の POST を /share-target で受け、Route Handler へ渡す。
 * アクションを /api にすると WebAPK の外で開き、WowTalk 本文が欄に届かない。
 */
export function proxy(request: NextRequest) {
  if (
    request.method === "POST" &&
    request.nextUrl.pathname === "/share-target"
  ) {
    return NextResponse.rewrite(new URL("/api/share-target", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/share-target"],
};
