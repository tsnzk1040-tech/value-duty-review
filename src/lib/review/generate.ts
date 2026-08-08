import { formatThanks } from "@/lib/review/thanks";
import type { SummaryGenerateInput } from "@/lib/review/prompts";
import {
  generateSummaryGemini,
  generateSummaryStub,
  type GenerateProviderId,
  type SummaryGenerateResult,
} from "@/lib/review/providers/summary";

export type { GenerateProviderId, SummaryGenerateResult, SummaryGenerateInput };

export type ReviewDraftGenerateRequest = {
  kind: "summary";
  sourcePost: string;
  themeLabel: string;
  lens?: string;
  presenterName: string;
};

export type ReviewDraftGenerateResponse = {
  opener: string;
  summary: string;
  provider: GenerateProviderId;
  model?: string;
  /** stub に落ちた理由（キー無し・API失敗など） */
  fallbackReason?: string;
};

function resolveProviderPreference(): "auto" | "gemini" | "stub" {
  const raw = process.env.REVIEW_GENERATE_PROVIDER?.trim().toLowerCase();
  if (raw === "gemini" || raw === "stub" || raw === "auto") return raw;
  return "auto";
}

/**
 * 要約生成の入口。
 * auto: GEMINI_API_KEY があれば Gemini、無ければ stub。失敗時も stub へ退避。
 */
export async function generateReviewSummaryDraft(
  input: ReviewDraftGenerateRequest,
): Promise<ReviewDraftGenerateResponse> {
  const opener = formatThanks(input.presenterName);
  const summaryInput: SummaryGenerateInput = {
    sourcePost: input.sourcePost,
    themeLabel: input.themeLabel,
    lens: input.lens ?? "",
  };

  const pref = resolveProviderPreference();
  const hasKey = Boolean(process.env.GEMINI_API_KEY?.trim());

  if (pref === "stub" || (pref === "auto" && !hasKey)) {
    const stub = generateSummaryStub(summaryInput);
    return {
      opener,
      summary: stub.summary,
      provider: "stub",
      fallbackReason:
        pref === "stub"
          ? "REVIEW_GENERATE_PROVIDER=stub"
          : "GEMINI_API_KEY unset",
    };
  }

  try {
    const result = await generateSummaryGemini(summaryInput);
    return {
      opener,
      summary: result.summary,
      provider: result.provider,
      model: result.model,
    };
  } catch (err) {
    const stub = generateSummaryStub(summaryInput);
    const message = err instanceof Error ? err.message : String(err);
    return {
      opener,
      summary: stub.summary,
      provider: "stub",
      fallbackReason: message,
    };
  }
}
