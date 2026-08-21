import { formatThanks } from "@/lib/review/thanks";
import type {
  LeaderGenerateInput,
  SummaryGenerateInput,
} from "@/lib/review/prompts";
import type { ClosingGenerateInput } from "@/lib/review/closing";
import { generateLlmFinalCheckIssues } from "@/lib/review/providers/llm-final-check";
import type { FinalCheckIssue } from "@/lib/review/final-check";
import {
  generateClosingGemini,
  generateClosingStub,
} from "@/lib/review/providers/closing";
import {
  generateKeywordSuggestionsGemini,
  generateKeywordSuggestionsStub,
  type KeywordSuggestInput,
} from "@/lib/review/providers/keyword-suggestions";
import {
  generateLeaderGemini,
  generateLeaderStub,
} from "@/lib/review/providers/leader";
import {
  generateResearchBriefGemini,
  generateResearchBriefStub,
  type ResearchBriefInput,
} from "@/lib/review/providers/research-brief";
import {
  generateSearchGemini,
  type SearchGenerateInput,
} from "@/lib/review/providers/search";
import { stubSearchLinks } from "@/lib/review/search-stub";
import {
  generateSummaryGemini,
  generateSummaryStub,
  reviseSummaryWithProvider,
  type GenerateProviderId,
  type SummaryGenerateResult,
  type SummaryModelId,
  type SummaryVariantId,
} from "@/lib/review/providers/summary";
import type { LinkCandidate } from "@/lib/review/draft";

export type {
  GenerateProviderId,
  SummaryGenerateResult,
  SummaryGenerateInput,
  LeaderGenerateInput,
  SummaryVariantId,
};

export type ReviewSummaryGenerateRequest = {
  kind: "summary";
  sourcePost: string;
  themeLabel: string;
  themeId?: string;
  lens?: string;
  presenterName: string;
  historyNotes?: string;
};

export type ReviewSummaryReviseRequest = {
  kind: "summary-revise";
  sourcePost: string;
  themeLabel: string;
  themeId?: string;
  lens?: string;
  presenterName: string;
  currentSummary: string;
  instruction: string;
  /** 互換用。常に Gemini */
  preferredProvider?: SummaryModelId;
  historyNotes?: string;
};

export type ReviewLeaderGenerateRequest = {
  kind: "leader";
  sourcePost: string;
  themeLabel: string;
  themeId?: string;
  keywords?: string;
  summary: string;
  selectedLinkTitles: string[];
  researchFocus: string;
  researchBrief: string;
  presenterName?: string;
  historyNotes?: string;
  /** 互換用。常に Gemini */
  preferredProvider?: SummaryModelId | "stub" | "";
};

export type ReviewSearchGenerateRequest = {
  kind: "search";
  keywords: string;
  themeLabel: string;
  sourcePost: string;
};

export type ReviewKeywordSuggestRequest = {
  kind: "keyword-suggestions";
  themeLabel: string;
  sourcePost: string;
  summary: string;
  lens?: string;
};

export type ReviewResearchBriefRequest = {
  kind: "research-brief";
  keywords: string;
  researchFocus: string;
  themeLabel: string;
  sourcePost: string;
  summary: string;
  selectedLinks: { title: string; url: string }[];
  /** 開いたページの本文貼付（あるときは要点の正本材料） */
  pagePaste?: string;
  /** 互換用。常に Gemini */
  preferredProvider?: SummaryModelId | "stub" | "";
};

export type ReviewClosingGenerateRequest = {
  kind: "closing";
  leaderNote: string;
  summary: string;
  sourcePost: string;
  themeLabel: string;
  exclude?: string;
};

export type ReviewFinalCheckRequest = {
  kind: "final-check";
  text: string;
};

export type ReviewDraftGenerateRequest =
  | ReviewSummaryGenerateRequest
  | ReviewSummaryReviseRequest
  | ReviewLeaderGenerateRequest
  | ReviewSearchGenerateRequest
  | ReviewKeywordSuggestRequest
  | ReviewResearchBriefRequest
  | ReviewClosingGenerateRequest
  | ReviewFinalCheckRequest;

export type ReviewSummaryCandidate = {
  provider: GenerateProviderId;
  summary: string;
  model?: string;
  variant?: SummaryVariantId;
  fallbackReason?: string;
};

export type ReviewSummaryGenerateResponse = {
  kind: "summary";
  opener: string;
  summary: string;
  provider: GenerateProviderId;
  model?: string;
  fallbackReason?: string;
  candidates: ReviewSummaryCandidate[];
  providerFailures?: { provider: GenerateProviderId; reason: string }[];
};

export type ReviewSummaryReviseResponse = {
  kind: "summary-revise";
  opener: string;
  summary: string;
  provider: GenerateProviderId;
  model?: string;
  fallbackReason?: string;
};

export type ReviewLeaderGenerateResponse = {
  kind: "leader";
  leaderNote: string;
  provider: GenerateProviderId;
  model?: string;
  fallbackReason?: string;
};

export type ReviewSearchGenerateResponse = {
  kind: "search";
  links: LinkCandidate[];
  provider: GenerateProviderId;
  model?: string;
  fallbackReason?: string;
};

export type ReviewKeywordSuggestResponse = {
  kind: "keyword-suggestions";
  suggestions: string[];
  provider: GenerateProviderId;
  model?: string;
  fallbackReason?: string;
};

export type ReviewResearchBriefResponse = {
  kind: "research-brief";
  researchBrief: string;
  provider: GenerateProviderId;
  model?: string;
  fallbackReason?: string;
  needsPagePaste?: boolean;
};

export type ReviewClosingGenerateResponse = {
  kind: "closing";
  closing: string;
  candidates: string[];
  provider: GenerateProviderId;
  model?: string;
  fallbackReason?: string;
};

export type ReviewFinalCheckResponse = {
  kind: "final-check";
  issues: FinalCheckIssue[];
  provider: GenerateProviderId;
  fallbackReason?: string;
};

export type ReviewDraftGenerateResponse =
  | ReviewSummaryGenerateResponse
  | ReviewSummaryReviseResponse
  | ReviewLeaderGenerateResponse
  | ReviewSearchGenerateResponse
  | ReviewKeywordSuggestResponse
  | ReviewResearchBriefResponse
  | ReviewClosingGenerateResponse
  | ReviewFinalCheckResponse;

function resolveProviderPreference(): "auto" | "gemini" | "stub" {
  const raw = process.env.REVIEW_GENERATE_PROVIDER?.trim().toLowerCase();
  if (raw === "gemini" || raw === "stub" || raw === "auto") return raw;
  return "auto";
}

function shouldUseStub(): { stub: boolean; reason?: string } {
  const pref = resolveProviderPreference();
  const hasKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  if (pref === "stub") {
    return { stub: true, reason: "REVIEW_GENERATE_PROVIDER=stub" };
  }
  if (pref === "auto" && !hasKey) {
    return { stub: true, reason: "GEMINI_API_KEY unset" };
  }
  return { stub: false };
}

export async function generateReviewSummaryDraft(
  input: ReviewSummaryGenerateRequest,
): Promise<ReviewSummaryGenerateResponse> {
  const opener = formatThanks(input.presenterName);
  const historyNotes = input.historyNotes?.trim() ?? "";
  const summaryInput: SummaryGenerateInput = {
    sourcePost: input.sourcePost,
    themeLabel: input.themeLabel,
    lens: input.lens ?? "",
    historyNotes,
  };

  const gate = shouldUseStub();
  if (gate.stub) {
    const stub = generateSummaryStub(summaryInput);
    return {
      kind: "summary",
      opener,
      summary: stub.summary,
      provider: "stub",
      fallbackReason: gate.reason,
      candidates: [
        {
          provider: "stub",
          summary: stub.summary,
          fallbackReason: gate.reason,
        },
      ],
    };
  }

  const jobs: {
    variant: SummaryVariantId;
    run: Promise<SummaryGenerateResult>;
  }[] = [
    { variant: "light", run: generateSummaryGemini(summaryInput, "light") },
    { variant: "rich", run: generateSummaryGemini(summaryInput, "rich") },
  ];

  const settled = await Promise.allSettled(jobs.map((j) => j.run));
  const candidates: ReviewSummaryCandidate[] = [];
  const providerFailures: { provider: GenerateProviderId; reason: string }[] =
    [];
  settled.forEach((item, i) => {
    const variant = jobs[i]!.variant;
    if (item.status === "fulfilled") {
      candidates.push({
        provider: item.value.provider,
        summary: item.value.summary,
        model: item.value.model,
        variant: item.value.variant ?? variant,
      });
      return;
    }
    const reason =
      item.reason instanceof Error ? item.reason.message : String(item.reason);
    console.error(`summary ${variant} failed:`, reason);
    providerFailures.push({ provider: "gemini", reason: `${variant}: ${reason}` });
  });
  if (candidates.length === 0) {
    const stub = generateSummaryStub(summaryInput);
    const reasons = providerFailures.map((f) => f.reason);
    return {
      kind: "summary",
      opener,
      summary: stub.summary,
      provider: "stub",
      fallbackReason: reasons.join(" / ") || "all variants failed",
      candidates: [{ provider: "stub", summary: stub.summary }],
      providerFailures,
    };
  }

  const picked = candidates[0]!;
  const autoSummary = candidates.length === 1 ? picked.summary : "";

  return {
    kind: "summary",
    opener,
    summary: autoSummary,
    provider: candidates.length === 1 ? picked.provider : "stub",
    model: candidates.length === 1 ? picked.model : undefined,
    candidates,
    providerFailures,
  };
}

export async function generateReviewSummaryRevise(
  input: ReviewSummaryReviseRequest,
): Promise<ReviewSummaryReviseResponse> {
  const opener = formatThanks(input.presenterName);
  const historyNotes = input.historyNotes?.trim() ?? "";
  const summaryInput: SummaryGenerateInput = {
    sourcePost: input.sourcePost,
    themeLabel: input.themeLabel,
    lens: input.lens ?? "",
    historyNotes,
  };

  const gate = shouldUseStub();
  if (gate.stub) {
    const stub = generateSummaryStub(summaryInput);
    return {
      kind: "summary-revise",
      opener,
      summary: stub.summary,
      provider: "stub",
      fallbackReason: gate.reason,
    };
  }

  try {
    const result = await reviseSummaryWithProvider(
      summaryInput,
      input.currentSummary,
      input.instruction,
    );
    return {
      kind: "summary-revise",
      opener,
      summary: result.summary,
      provider: result.provider,
      model: result.model,
    };
  } catch (err) {
    const stub = generateSummaryStub(summaryInput);
    const message = err instanceof Error ? err.message : String(err);
    return {
      kind: "summary-revise",
      opener,
      summary: stub.summary,
      provider: "stub",
      fallbackReason: message,
    };
  }
}

export async function generateReviewKeywordSuggestions(
  input: ReviewKeywordSuggestRequest,
): Promise<ReviewKeywordSuggestResponse> {
  const suggestInput: KeywordSuggestInput = {
    themeLabel: input.themeLabel,
    sourcePost: input.sourcePost,
    summary: input.summary,
    lens: input.lens ?? "",
  };

  const gate = shouldUseStub();
  if (gate.stub) {
    const stub = generateKeywordSuggestionsStub(suggestInput);
    return {
      kind: "keyword-suggestions",
      suggestions: stub.suggestions,
      provider: "stub",
      fallbackReason: gate.reason,
    };
  }

  try {
    const result = await generateKeywordSuggestionsGemini(suggestInput);
    return {
      kind: "keyword-suggestions",
      suggestions: result.suggestions,
      provider: result.provider,
      model: result.model,
    };
  } catch (err) {
    const stub = generateKeywordSuggestionsStub(suggestInput);
    const message = err instanceof Error ? err.message : String(err);
    return {
      kind: "keyword-suggestions",
      suggestions: stub.suggestions,
      provider: "stub",
      fallbackReason: message,
    };
  }
}

export async function generateReviewSearchDraft(
  input: ReviewSearchGenerateRequest,
): Promise<ReviewSearchGenerateResponse> {
  const searchInput: SearchGenerateInput = {
    keywords: input.keywords,
    themeLabel: input.themeLabel,
    sourcePost: input.sourcePost,
  };

  const gate = shouldUseStub();
  if (gate.stub) {
    return {
      kind: "search",
      links: stubSearchLinks(input.keywords),
      provider: "stub",
      fallbackReason: gate.reason,
    };
  }

  try {
    const result = await generateSearchGemini(searchInput);
    return {
      kind: "search",
      links: result.links,
      provider: result.provider,
      model: result.model,
      fallbackReason: result.fallbackReason,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      kind: "search",
      links: stubSearchLinks(input.keywords),
      provider: "stub",
      fallbackReason: message,
    };
  }
}

export async function generateReviewResearchBrief(
  input: ReviewResearchBriefRequest,
): Promise<ReviewResearchBriefResponse> {
  const briefInput: ResearchBriefInput = {
    keywords: input.keywords,
    researchFocus: input.researchFocus,
    themeLabel: input.themeLabel,
    sourcePost: input.sourcePost,
    summary: input.summary,
    selectedLinks: input.selectedLinks,
    pagePaste: input.pagePaste,
  };

  const gate = shouldUseStub();
  if (gate.stub) {
    const stub = generateResearchBriefStub(briefInput);
    return {
      kind: "research-brief",
      researchBrief: stub.researchBrief,
      provider: "stub",
      fallbackReason: gate.reason,
      needsPagePaste: stub.needsPagePaste,
    };
  }

  try {
    const result = await generateResearchBriefGemini(briefInput);
    return {
      kind: "research-brief",
      researchBrief: result.researchBrief,
      provider: result.provider,
      model: result.model,
      needsPagePaste: result.needsPagePaste,
    };
  } catch (err) {
    const stub = generateResearchBriefStub(briefInput);
    const message = err instanceof Error ? err.message : String(err);
    return {
      kind: "research-brief",
      researchBrief: stub.researchBrief,
      provider: "stub",
      fallbackReason: message,
      needsPagePaste: stub.needsPagePaste,
    };
  }
}

export async function generateReviewLeaderDraft(
  input: ReviewLeaderGenerateRequest,
): Promise<ReviewLeaderGenerateResponse> {
  if (input.selectedLinkTitles.length === 0) {
    return {
      kind: "leader",
      leaderNote: "",
      provider: "stub",
      fallbackReason: "selected links required",
    };
  }
  if (!input.researchBrief.trim() || !input.researchFocus.trim()) {
    return {
      kind: "leader",
      leaderNote: "",
      provider: "stub",
      fallbackReason: "research focus and brief required",
    };
  }

  const historyNotes = input.historyNotes?.trim() ?? "";

  const leaderInput: LeaderGenerateInput = {
    sourcePost: input.sourcePost,
    themeLabel: input.themeLabel,
    keywords: input.keywords ?? "",
    summary: input.summary,
    selectedLinkTitles: input.selectedLinkTitles,
    researchFocus: input.researchFocus,
    researchBrief: input.researchBrief,
    historyNotes,
  };

  const gate = shouldUseStub();
  if (gate.stub) {
    const stub = generateLeaderStub(leaderInput);
    return {
      kind: "leader",
      leaderNote: stub.leaderNote,
      provider: "stub",
      fallbackReason: gate.reason,
    };
  }

  try {
    const result = await generateLeaderGemini(leaderInput);
    return {
      kind: "leader",
      leaderNote: result.leaderNote,
      provider: result.provider,
      model: result.model,
    };
  } catch (err) {
    const stub = generateLeaderStub(leaderInput);
    const message = err instanceof Error ? err.message : String(err);
    return {
      kind: "leader",
      leaderNote: stub.leaderNote,
      provider: "stub",
      fallbackReason: message,
    };
  }
}

export async function generateReviewClosingDraft(
  input: ReviewClosingGenerateRequest,
): Promise<ReviewClosingGenerateResponse> {
  const closingInput: ClosingGenerateInput = {
    leaderNote: input.leaderNote,
    summary: input.summary,
    sourcePost: input.sourcePost,
    themeLabel: input.themeLabel,
    exclude: input.exclude,
  };

  const gate = shouldUseStub();
  if (gate.stub) {
    const stub = generateClosingStub(closingInput);
    return {
      kind: "closing",
      closing: stub.closing,
      candidates: stub.candidates,
      provider: "stub",
      fallbackReason: gate.reason,
    };
  }

  try {
    const result = await generateClosingGemini(closingInput);
    return {
      kind: "closing",
      closing: result.closing,
      candidates: result.candidates,
      provider: result.provider,
      model: result.model,
    };
  } catch (err) {
    const stub = generateClosingStub(closingInput);
    const message = err instanceof Error ? err.message : String(err);
    return {
      kind: "closing",
      closing: stub.closing,
      candidates: stub.candidates,
      provider: "stub",
      fallbackReason: message,
    };
  }
}

export async function generateReviewLlmFinalCheck(
  input: ReviewFinalCheckRequest,
): Promise<ReviewFinalCheckResponse> {
  const gate = shouldUseStub();
  if (gate.stub) {
    return {
      kind: "final-check",
      issues: [],
      provider: "stub",
      fallbackReason: gate.reason,
    };
  }
  try {
    const issues = await generateLlmFinalCheckIssues(input.text);
    return { kind: "final-check", issues, provider: "gemini" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      kind: "final-check",
      issues: [],
      provider: "stub",
      fallbackReason: message,
    };
  }
}
