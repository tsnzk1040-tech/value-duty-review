import type { Member, RotationCycle, ValueItem } from "@/lib/rotation/types";

export const SETTINGS_STORAGE_KEY = "vdr.settings.v1";
export const AUTH_SESSION_KEY = "vdr.auth.session.v1";
/** Bump when default masters change so old localStorage is refreshed. */
export const SETTINGS_VERSION = 15 as const;

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
  /**
   * Platform authenticator credential id (base64url).
   * Empty = パスキー未登録。パスワードと併用可。
   */
  webauthnCredentialId?: string;
};

export type RotationSettings = {
  /**
   * Cycle start date. Empty = auto (later of 今日のつぎ営業日 and 前回最終のつぎ営業日).
   * Set YYYY-MM-DD only when different from auto.
   */
  cycleStart: string;
  /**
   * Derived theme slots (= active members). Kept in sync; not user-edited.
   */
  businessDayCount: number;
  /** Soft spacing: avoid same person too soon after prior turn */
  cooldownBusinessDays: number;
  /**
   * Soft max gap (business days) since prior assignment — avoid leaving someone too long.
   * 0 = no upper soft limit.
   */
  maxGapBusinessDays: number;
  /**
   * Prefer / require avoiding the same Value band (1〜6) as that person's previous turn.
   * Default true: hard filter when anyone eligible has a different band.
   */
  avoidSameValueBand: boolean;
  /**
   * Minimum rule: cycle must end with this member (ツネヅカ＝トシオ / 常塚（新ローテ）).
   * Empty string = no forced closer.
   */
  lastAssigneeMemberId: string;
  /**
   * First theme of the cycle. Empty = auto (next after previous cycle's last theme).
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
