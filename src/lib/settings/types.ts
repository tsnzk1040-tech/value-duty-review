import type { Member, RotationCycle, ValueItem } from "@/lib/rotation/types";

export const SETTINGS_STORAGE_KEY = "vdr.settings.v1";
export const AUTH_SESSION_KEY = "vdr.auth.session.v1";
/** Bump when default masters change so old localStorage is refreshed. */
export const SETTINGS_VERSION = 12 as const;

export type CalendarRules = {
  /** Skip Sat/Sun (default true) */
  skipWeekends: boolean;
  /**
   * Auto-skip Japanese public holidays for years touched at generation time.
   * Default true — no manual holiday list required for 祝日.
   */
  skipJapaneseHolidays: boolean;
  /** Extra non-working days YYYY-MM-DD (company closed days, etc.) */
  holidays: string[];
};

export type AuthSettings = {
  /** When true, unlock required before using the app */
  enabled: boolean;
  salt: string;
  passwordHash: string;
};

export type RotationSettings = {
  cycleStart: string;
   /**
   * Theme slots in this cycle (dates on non-weekend/holiday days).
   * Default = active member count (no sit-outs). Themes wrap the catalog.
   */
  businessDayCount: number;
  /** Soft spacing: avoid same person too soon after prior turn */
  cooldownBusinessDays: number;
  /**
   * Minimum rule: cycle must end with this member (ツネヅカ＝トシオ / 常塚（新ローテ）).
   * Empty string = no forced closer. Enables designing the next cycle after close.
   */
  lastAssigneeMemberId: string;
  /**
   * First theme of the cycle. Empty = auto (next after previous cycle's last theme).
   * Set a valueItem id only when different from auto.
   */
  themeStartValueItemId: string;
  /** Prior cycles — required before generating the next rotation */
  historyCycles: RotationCycle[];
};

/** Verbatim Vision / Value headings (not daily theme rows). */
export type CreedMeta = {
  vision: string;
  valueHeadings: string[];
};

export type AppSettings = {
  version: typeof SETTINGS_VERSION;
  members: Member[];
  /** Daily themes = ×-① guidelines (verbatim labels) */
  valueItems: ValueItem[];
  creed: CreedMeta;
  calendar: CalendarRules;
  rotation: RotationSettings;
  auth: AuthSettings;
  /** Optional short note — do NOT put full corporate creed text in git */
  notes?: string;
};
