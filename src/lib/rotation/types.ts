/** Rotation POC domain types (abstract names only — no real people). */

export type MemberId = string;
export type ValueItemId = string;

export type Member = {
  id: MemberId;
  displayName: string;
  active: boolean;
  /**
   * Newcomers are placed at the end of their first cycle (before the final closer).
   * Cleared automatically after that cycle is copied to the notebook (no manual toggle).
   */
  newcomer?: boolean;
};
export type ValueItem = {
  id: ValueItemId;
  label: string;
};

/** One day in a cycle: business date × assignee × theme */
export type RotationDay = {
  date: string; // YYYY-MM-DD
  memberId: MemberId;
  valueItemId: ValueItemId;
  /** その人の前回当番日からの営業日数（履歴があるとき。生成結果の表示用） */
  gapFromPreviousBusinessDays?: number;
};

export type RotationCycle = {
  id: string;
  label: string;
  days: RotationDay[];
};

export type FairAssignInput = {
  members: Member[];
  valueItems: ValueItem[];
  /** Up to ~2 prior cycles of history (oldest → newest) */
  historyCycles: RotationCycle[];
  /** First business day of the new cycle */
  cycleStart: string; // YYYY-MM-DD
  businessDayCount: number;
  /** ~7 business days cooldown after an assignment */
  cooldownBusinessDays: number;
  /**
   * Soft max gap since prior assignment (0 = off). Prefer not leaving someone too long.
   */
  maxGapBusinessDays: number;
  /**
   * Avoid same Value band (1〜6) as that person's previous assignment.
   * Default true = hard filter when a different-band candidate exists.
   */
  avoidSameValueBand: boolean;
  /**
   * Minimum rule: last business day must be this member
   * (ツネヅカ＝トシオ / 常塚（新ローテ）). Empty = no lock.
   */
  lastAssigneeMemberId?: MemberId;
  /**
   * First theme of the cycle. Subsequent days follow catalog order (wrap around).
   * Empty / `__auto__` → next after previous cycle's last theme (hands-free).
   */
  themeStartValueItemId?: ValueItemId;
  /** Random seed for tie-breaking / reshuffle */
  seed: number;
};

export type FairAssignResult = {
  days: RotationDay[];
  warnings: string[];
  /** Resolved theme start used for this generation */
  themeStart?: {
    valueItemId: ValueItemId;
    source: "auto" | "manual" | "fallback";
    previousValueItemId?: ValueItemId;
  };
};
