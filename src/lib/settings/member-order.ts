import type { Member } from "@/lib/rotation/types";

/** Swap adjacent items. Out-of-range is a no-op. */
export function moveMemberAt(
  members: Member[],
  index: number,
  delta: -1 | 1,
): Member[] {
  const next = [...members];
  const j = index + delta;
  if (index < 0 || index >= next.length || j < 0 || j >= next.length) {
    return members;
  }
  const current = next[index]!;
  next[index] = next[j]!;
  next[j] = current;
  return next;
}
