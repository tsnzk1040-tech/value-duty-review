import { NextResponse } from "next/server";

import {
  generateReviewSummaryDraft,
  type ReviewDraftGenerateRequest,
} from "@/lib/review/generate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Partial<ReviewDraftGenerateRequest>;
  try {
    body = (await req.json()) as Partial<ReviewDraftGenerateRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.kind !== "summary") {
    return NextResponse.json(
      { error: "kind must be summary (leader generation comes later)" },
      { status: 400 },
    );
  }
  if (!body.sourcePost?.trim() || !body.themeLabel?.trim()) {
    return NextResponse.json(
      { error: "sourcePost and themeLabel are required" },
      { status: 400 },
    );
  }
  if (!body.presenterName?.trim()) {
    return NextResponse.json(
      { error: "presenterName is required" },
      { status: 400 },
    );
  }

  const result = await generateReviewSummaryDraft({
    kind: "summary",
    sourcePost: body.sourcePost,
    themeLabel: body.themeLabel,
    lens: body.lens,
    presenterName: body.presenterName,
  });

  return NextResponse.json(result);
}
