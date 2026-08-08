import type { Member, RotationCycle, ValueItem } from "@/lib/rotation/types";

export const SETTINGS_STORAGE_KEY = "vdr.settings.v1";
export const AUTH_SESSION_KEY = "vdr.auth.session.v1";
export const SETTINGS_VERSION = 1 as const;

export type CalendarRules = {
  /** Skip Sat/Sun (default true) */
  skipWeekends: boolean;
  /** Extra non-working days YYYY-MM-DD */
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
  businessDayCount: number;
  cooldownBusinessDays: number;
  /** Prior cycles used by fair assign (optional; may be empty) */
  historyCycles: RotationCycle[];
};

export type AppSettings = {
  version: typeof SETTINGS_VERSION;
  members: Member[];
  valueItems: ValueItem[];
  calendar: CalendarRules;
  rotation: RotationSettings;
  auth: AuthSettings;
  /** Optional short note — do NOT put full corporate creed text in git */
  notes?: string;
};
