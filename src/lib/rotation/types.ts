/** Rotation POC domain types (abstract names only — no real people). */

export type MemberId = string;
export type ValueItemId = string;

export type Member = {
  id: MemberId;
  displayName: string;
  active: boolean;
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
  /** Random seed for tie-breaking / reshuffle */
  seed: number;
};

export type FairAssignResult = {
  days: RotationDay[];
  warnings: string[];
};
