import { NextResponse } from "next/server";

import { isDatabaseConfigured } from "@/lib/db/neon";
import {
  listRecentReviews,
  listRelatedReviews,
  saveReviewHistory,
  type ReviewHistoryLink,
} from "@/lib/review/history";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      configured: false,
      items: [] as unknown[],
      message: "DATABASE_URL 未設定。履歴はまだ Neon に繋がっていない",
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const themeId = searchParams.get("themeId") ?? undefined;
    const presenterName = searchParams.get("presenterName") ?? undefined;
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;

    const items =
      themeId || presenterName
        ? await listRelatedReviews({ themeId, presenterName, limit })
        : await listRecentReviews(limit);

    return NextResponse.json({ configured: true, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "history list failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: "DATABASE_URL is not set",
        configured: false,
      },
      { status: 503 },
    );
  }

  let body: {
    presenterName?: string;
    themeId?: string;
    themeLabel?: string;
    sourcePost?: string;
    opener?: string;
    summary?: string;
    leaderNote?: string;
    closing?: string;
    links?: ReviewHistoryLink[];
    fullText?: string;
    keywords?: string;
    researchBrief?: string;
    reviewDate?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.presenterName?.trim() || !body.fullText?.trim()) {
    return NextResponse.json(
      { error: "presenterName and fullText are required" },
      { status: 400 },
    );
  }
  if (!body.summary?.trim() || !body.leaderNote?.trim()) {
    return NextResponse.json(
      { error: "summary and leaderNote are required" },
      { status: 400 },
    );
  }

  try {
    const item = await saveReviewHistory({
      presenterName: body.presenterName,
      themeId: body.themeId ?? "",
      themeLabel: body.themeLabel ?? "",
      sourcePost: body.sourcePost ?? "",
      opener: body.opener ?? "",
      summary: body.summary,
      leaderNote: body.leaderNote,
      closing: body.closing ?? "",
      links: Array.isArray(body.links) ? body.links : [],
      fullText: body.fullText,
      keywords: body.keywords,
      researchBrief: body.researchBrief,
      reviewDate: body.reviewDate,
    });
    return NextResponse.json({ configured: true, item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "history save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
