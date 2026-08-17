import { NextResponse } from "next/server";

import {
  generateReviewClosingDraft,
  generateReviewKeywordSuggestions,
  generateReviewLeaderDraft,
  generateReviewResearchBrief,
  generateReviewSearchDraft,
  generateReviewSummaryDraft,
  generateReviewSummaryRevise,
  generateReviewLlmFinalCheck,
  type ReviewDraftGenerateRequest,
} from "@/lib/review/generate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: Partial<ReviewDraftGenerateRequest> & {
    kind?: string;
    currentSummary?: string;
    instruction?: string;
    preferredProvider?: string;
    pagePaste?: string;
    text?: string;
  };
  try {
    body = (await req.json()) as Partial<ReviewDraftGenerateRequest> & {
      kind?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.kind === "summary") {
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
      themeId: body.themeId,
      lens: body.lens,
      presenterName: body.presenterName,
      historyNotes: body.historyNotes,
    });
    return NextResponse.json(result);
  }

  if (body.kind === "summary-revise") {
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
    if (!body.currentSummary?.trim() || !body.instruction?.trim()) {
      return NextResponse.json(
        { error: "currentSummary and instruction are required" },
        { status: 400 },
      );
    }
    const preferred =
      body.preferredProvider === "chatgpt" ? "chatgpt" : "gemini";
    const result = await generateReviewSummaryRevise({
      kind: "summary-revise",
      sourcePost: body.sourcePost,
      themeLabel: body.themeLabel,
      themeId: body.themeId,
      lens: body.lens,
      presenterName: body.presenterName,
      currentSummary: body.currentSummary,
      instruction: body.instruction,
      preferredProvider: preferred,
      historyNotes: body.historyNotes,
    });
    return NextResponse.json(result);
  }

  if (body.kind === "keyword-suggestions") {
    if (!body.themeLabel?.trim() || !body.sourcePost?.trim()) {
      return NextResponse.json(
        { error: "themeLabel and sourcePost are required" },
        { status: 400 },
      );
    }
    const result = await generateReviewKeywordSuggestions({
      kind: "keyword-suggestions",
      themeLabel: body.themeLabel,
      sourcePost: body.sourcePost,
      summary: body.summary ?? "",
      lens: body.lens,
    });
    return NextResponse.json(result);
  }

  if (body.kind === "search") {
    if (!body.keywords?.trim()) {
      return NextResponse.json(
        { error: "keywords are required" },
        { status: 400 },
      );
    }
    if (!body.themeLabel?.trim() || !body.sourcePost?.trim()) {
      return NextResponse.json(
        { error: "themeLabel and sourcePost are required" },
        { status: 400 },
      );
    }
    const result = await generateReviewSearchDraft({
      kind: "search",
      keywords: body.keywords,
      themeLabel: body.themeLabel,
      sourcePost: body.sourcePost,
    });
    return NextResponse.json(result);
  }

  if (body.kind === "research-brief") {
    if (!body.selectedLinks?.length) {
      return NextResponse.json(
        { error: "selectedLinks are required" },
        { status: 400 },
      );
    }
    if (!body.themeLabel?.trim() || !body.sourcePost?.trim()) {
      return NextResponse.json(
        { error: "themeLabel and sourcePost are required" },
        { status: 400 },
      );
    }
    const result = await generateReviewResearchBrief({
      kind: "research-brief",
      keywords: body.keywords ?? "",
      researchFocus: body.researchFocus ?? "",
      themeLabel: body.themeLabel,
      sourcePost: body.sourcePost,
      summary: body.summary ?? "",
      selectedLinks: body.selectedLinks,
      pagePaste:
        typeof body.pagePaste === "string" ? body.pagePaste : undefined,
      preferredProvider:
        body.preferredProvider === "chatgpt" ||
        body.preferredProvider === "gemini" ||
        body.preferredProvider === "stub"
          ? body.preferredProvider
          : "",
    });
    return NextResponse.json(result);
  }

  if (body.kind === "leader") {
    if (!body.sourcePost?.trim() || !body.themeLabel?.trim()) {
      return NextResponse.json(
        { error: "sourcePost and themeLabel are required" },
        { status: 400 },
      );
    }
    if (!body.summary?.trim()) {
      return NextResponse.json(
        { error: "summary is required for leader draft" },
        { status: 400 },
      );
    }
    if (!body.selectedLinkTitles?.length) {
      return NextResponse.json(
        { error: "採択リンクが必要です。調べるに戻って選んでください" },
        { status: 400 },
      );
    }
    if (!body.researchFocus?.trim() || !body.researchBrief?.trim()) {
      return NextResponse.json(
        {
          error:
            "フォーカス指示と要点メモが必要です。調べるで要点を作ってください",
        },
        { status: 400 },
      );
    }
    const result = await generateReviewLeaderDraft({
      kind: "leader",
      sourcePost: body.sourcePost,
      themeLabel: body.themeLabel,
      themeId: body.themeId,
      keywords: body.keywords,
      summary: body.summary,
      selectedLinkTitles: body.selectedLinkTitles,
      researchFocus: body.researchFocus,
      researchBrief: body.researchBrief,
      presenterName: body.presenterName,
      historyNotes: body.historyNotes,
      preferredProvider:
        body.preferredProvider === "chatgpt" ||
        body.preferredProvider === "gemini" ||
        body.preferredProvider === "stub"
          ? body.preferredProvider
          : "",
    });
    return NextResponse.json(result);
  }

  if (body.kind === "closing") {
    if (!body.leaderNote?.trim()) {
      return NextResponse.json(
        { error: "leaderNote is required for closing draft" },
        { status: 400 },
      );
    }
    if (!body.themeLabel?.trim() || !body.sourcePost?.trim()) {
      return NextResponse.json(
        { error: "themeLabel and sourcePost are required" },
        { status: 400 },
      );
    }
    const result = await generateReviewClosingDraft({
      kind: "closing",
      leaderNote: body.leaderNote,
      summary: body.summary ?? "",
      sourcePost: body.sourcePost,
      themeLabel: body.themeLabel,
      exclude: body.exclude,
    });
    return NextResponse.json(result);
  }

  if (body.kind === "final-check") {
    const text = typeof body.text === "string" ? body.text : "";
    if (!text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const result = await generateReviewLlmFinalCheck({
      kind: "final-check",
      text,
    });
    return NextResponse.json(result);
  }

  return NextResponse.json(
    {
      error:
        "kind must be summary, summary-revise, keyword-suggestions, search, research-brief, leader, closing, or final-check",
    },
    { status: 400 },
  );
}
