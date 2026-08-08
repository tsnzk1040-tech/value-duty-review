import { formatThanks } from "@/lib/review/thanks";
import type {
  LeaderGenerateInput,
  SummaryGenerateInput,
} from "@/lib/review/prompts";
import { loadHistoryNotesForDraft } from "@/lib/review/history";
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
  type GenerateProviderId,
  type SummaryGenerateResult,
} from "@/lib/review/providers/summary";
import type { LinkCandidate } from "@/lib/review/draft";

export type {
  GenerateProviderId,
  SummaryGenerateResult,
  SummaryGenerateInput,
  LeaderGenerateInput,
};

export type ReviewSummaryGenerateRequest = {
  kind: "summary";
  sourcePost: string;
  themeLabel: string;
  themeId?: string;
  lens?: string;
  presenterName: string;
};

export type ReviewLeaderGenerateRequest = {
  kind: "leader";
  sourcePost: string;
  themeLabel: string;
  themeId?: string;
  lens?: string;
  keywords?: string;
  summary: string;
  selectedLinkTitles: string[];
  researchFocus: string;
  researchBrief: string;
  presenterName?: string;
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
};

export type ReviewDraftGenerateRequest =
  | ReviewSummaryGenerateRequest
  | ReviewLeaderGenerateRequest
  | ReviewSearchGenerateRequest
  | ReviewKeywordSuggestRequest
  | ReviewResearchBriefRequest;

export type ReviewSummaryGenerateResponse = {
  kind: "summary";
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
};

export type ReviewDraftGenerateResponse =
  | ReviewSummaryGenerateResponse
  | ReviewLeaderGenerateResponse
  | ReviewSearchGenerateResponse
  | ReviewKeywordSuggestResponse
  | ReviewResearchBriefResponse;

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
  const historyNotes = await loadHistoryNotesForDraft({
    themeId: input.themeId,
    presenterName: input.presenterName,
  });
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
    };
  }

  try {
    const result = await generateSummaryGemini(summaryInput);
    return {
      kind: "summary",
      opener,
      summary: result.summary,
      provider: result.provider,
      model: result.model,
    };
  } catch (err) {
    const stub = generateSummaryStub(summaryInput);
    const message = err instanceof Error ? err.message : String(err);
    return {
      kind: "summary",
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
  };

  const gate = shouldUseStub();
  if (gate.stub) {
    const stub = generateResearchBriefStub(briefInput);
    return {
      kind: "research-brief",
      researchBrief: stub.researchBrief,
      provider: "stub",
      fallbackReason: gate.reason,
    };
  }

  try {
    const result = await generateResearchBriefGemini(briefInput);
    return {
      kind: "research-brief",
      researchBrief: result.researchBrief,
      provider: result.provider,
      model: result.model,
    };
  } catch (err) {
    const stub = generateResearchBriefStub(briefInput);
    const message = err instanceof Error ? err.message : String(err);
    return {
      kind: "research-brief",
      researchBrief: stub.researchBrief,
      provider: "stub",
      fallbackReason: message,
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

  const historyNotes = await loadHistoryNotesForDraft({
    themeId: input.themeId,
    presenterName: input.presenterName,
  });

  const leaderInput: LeaderGenerateInput = {
    sourcePost: input.sourcePost,
    themeLabel: input.themeLabel,
    lens: input.lens ?? "",
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
