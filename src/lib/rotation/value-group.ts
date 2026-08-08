import type { ValueItem, ValueItemId } from "./types";

/** Value group number from label (`1-①…` → 1). */
export function valueGroupFromLabel(label: string): number | null {
  const m = label.match(/^(\d+)\s*[-－]/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function valueGroupForItem(
  valueItemId: ValueItemId,
  valueItems: ValueItem[],
): number | null {
  const item = valueItems.find((v) => v.id === valueItemId);
  return item ? valueGroupFromLabel(item.label) : null;
}
