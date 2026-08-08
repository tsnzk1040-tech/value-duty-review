import type { Member, RotationCycle, RotationDay, ValueItem } from "./types";
import { themeCodeFromLabel } from "./format-notebook";

/** At least one prior cycle with days — required before generating. */
export function hasPreviousRotation(historyCycles: RotationCycle[]): boolean {
  return historyCycles.some((c) => c.days.length > 0);
}

export function latestPreviousCycle(
  historyCycles: RotationCycle[],
): RotationCycle | undefined {
  const withDays = historyCycles.filter((c) => c.days.length > 0);
  if (withDays.length === 0) return undefined;
  return withDays[withDays.length - 1];
}

/** Keep newest cycles only (fair-assign uses ~2). */
export function appendHistoryCycle(
  historyCycles: RotationCycle[],
  cycle: RotationCycle,
  keep = 2,
): RotationCycle[] {
  return [...historyCycles, cycle].slice(-keep);
}

export function cycleFromDays(
  days: RotationDay[],
  labelPrefix = "確定サイクル",
): RotationCycle {
  const first = days[0]?.date ?? "unknown";
  const last = days[days.length - 1]?.date ?? first;
  return {
    id: `cycle-${first}-${last}-${Date.now().toString(36)}`,
    label: `${labelPrefix} ${first}〜${last}`,
    days: structuredClone(days),
  };
}

function resolveThemeId(
  themeCell: string,
  valueItems: ValueItem[],
): string | undefined {
  const cell = themeCell.trim();
  const byId = valueItems.find((v) => v.id === cell);
  if (byId) return byId.id;
  const byExact = valueItems.find((v) => v.label === cell);
  if (byExact) return byExact.id;
  const code = themeCodeFromLabel(cell);
  const byCode = valueItems.find(
    (v) => themeCodeFromLabel(v.label) === code || v.label.startsWith(cell),
  );
  return byCode?.id;
}

function resolveMemberId(
  nameCell: string,
  members: Member[],
): string | undefined {
  const name = nameCell.trim();
  return members.find((m) => m.displayName === name)?.id;
}

export type ParseRotationResult = {
  days: RotationDay[];
  errors: string[];
};

const GAP_CELL_RE = /^(前回から)?\d+営業日$/;

/**
 * Parse notebook-like lines: `YYYY-MM-DD  当番名  テーマ`（Tab も可。任意で前回間隔）。
 */
export function parseRotationPaste(
  text: string,
  members: Member[],
  valueItems: ValueItem[],
): ParseRotationResult {
  const days: RotationDay[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]!.trim();
    if (!raw) continue;
    if (raw.startsWith("日付") || raw.includes("ローテ（")) continue;
    if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) continue;

    const parts = raw.includes("\t")
      ? raw.split("\t").map((s) => s.trim())
      : raw.split(/\s{2,}/).map((s) => s.trim());

    let date = "";
    let who = "";
    let theme = "";
    if (parts.length >= 3) {
      date = parts[0]!;
      who = parts[1]!;
      const rest = parts.slice(2).filter(Boolean);
      if (rest.length >= 2 && GAP_CELL_RE.test(rest[rest.length - 1]!)) {
        theme = rest.slice(0, -1).join(" ");
      } else {
        theme = rest.join(" ");
      }
    } else {
      const m = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\S+)\s+(.+)$/);
      if (!m) {
        errors.push(`${i + 1}行目を読めなかった: ${raw}`);
        continue;
      }
      date = m[1]!;
      who = m[2]!;
      theme = m[3]!.replace(/\s+(前回から)?\d+営業日$/, "").trim();
    }

    const memberId = resolveMemberId(who, members);
    if (!memberId) {
      errors.push(`${date}: メンバー「${who}」がマスタにない`);
      continue;
    }
    const valueItemId = resolveThemeId(theme, valueItems);
    if (!valueItemId) {
      errors.push(`${date}: テーマ「${theme}」がマスタにない`);
      continue;
    }
    days.push({ date, memberId, valueItemId });
  }

  if (days.length === 0 && errors.length === 0) {
    errors.push(
      "日別行が見つからない。形式は「YYYY-MM-DD  当番  テーマ」（任意で前回間隔）",
    );
  }

  return { days, errors };
}
