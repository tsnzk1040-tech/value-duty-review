import type { RotationCycle, ValueItem, ValueItemId } from "./types";

/** Empty string in settings = auto from previous cycle. */
export const THEME_START_AUTO = "";

export type ThemeStartResolution = {
  valueItemId: ValueItemId;
  index: number;
  source: "auto" | "manual" | "fallback";
  /** Last theme of prior history (when source is auto) */
  previousValueItemId?: ValueItemId;
  previousDate?: string;
};

function catalogIndex(valueItems: ValueItem[], id: string): number {
  return valueItems.findIndex((v) => v.id === id);
}

/** Next theme in catalog order (wraps to first). */
export function nextThemeId(
  valueItems: ValueItem[],
  currentId: ValueItemId,
): ValueItemId | undefined {
  if (valueItems.length === 0) return undefined;
  const idx = catalogIndex(valueItems, currentId);
  if (idx < 0) return valueItems[0]?.id;
  return valueItems[(idx + 1) % valueItems.length]?.id;
}

/**
 * Chronologically last day across history cycles (by date).
 * Cycles are expected oldest → newest, but we still sort by day.date.
 */
export function lastHistoryThemeDay(
  historyCycles: RotationCycle[],
): { date: string; valueItemId: ValueItemId } | undefined {
  const days = historyCycles.flatMap((c) => c.days);
  if (days.length === 0) return undefined;
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  return { date: last.date, valueItemId: last.valueItemId };
}

/**
 * Suggest start theme for a new cycle = next after previous cycle's last theme.
 * No history → first catalog theme.
 */
export function suggestThemeStartFromHistory(
  historyCycles: RotationCycle[],
  valueItems: ValueItem[],
): ThemeStartResolution {
  if (valueItems.length === 0) {
    return { valueItemId: "", index: 0, source: "fallback" };
  }
  const last = lastHistoryThemeDay(historyCycles);
  if (!last) {
    return {
      valueItemId: valueItems[0]!.id,
      index: 0,
      source: "fallback",
    };
  }
  const nextId = nextThemeId(valueItems, last.valueItemId) ?? valueItems[0]!.id;
  const index = catalogIndex(valueItems, nextId);
  return {
    valueItemId: nextId,
    index: index < 0 ? 0 : index,
    source: "auto",
    previousValueItemId: last.valueItemId,
    previousDate: last.date,
  };
}

/**
 * Resolve theme start: empty / auto → from history; otherwise manual id.
 */
export function resolveThemeStart(
  themeStartValueItemId: string | undefined,
  historyCycles: RotationCycle[],
  valueItems: ValueItem[],
): ThemeStartResolution {
  const raw = themeStartValueItemId?.trim() ?? "";
  const wantsAuto = raw === "" || raw === "__auto__";

  if (wantsAuto) {
    return suggestThemeStartFromHistory(historyCycles, valueItems);
  }

  const index = catalogIndex(valueItems, raw);
  if (index < 0) {
    const fallback = suggestThemeStartFromHistory(historyCycles, valueItems);
    return {
      ...fallback,
      source: "fallback",
    };
  }
  return { valueItemId: raw, index, source: "manual" };
}
