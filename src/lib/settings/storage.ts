import { mergeCanonicalHistory } from "@/lib/rotation/previous-cycle";
import { createDefaultSettings } from "./defaults";
import { withSyncedThemeSlots } from "./sync-theme-slots";
import type { AppSettings } from "./types";
import { SETTINGS_STORAGE_KEY, SETTINGS_VERSION } from "./types";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Merge canonical actuals onto stored history. Never drop older extras on version bump. */
export function hydrateSettings(
  parsed: Partial<AppSettings> & { version?: number },
): AppSettings {
  const defaults = createDefaultSettings();
  const parsedRotation = parsed.rotation ?? {};
  const keptHistory = mergeCanonicalHistory(
    Array.isArray(parsedRotation.historyCycles)
      ? parsedRotation.historyCycles
      : [],
    defaults.rotation.historyCycles,
  );
  return withSyncedThemeSlots({
    ...defaults,
    ...parsed,
    version: SETTINGS_VERSION,
    creed: {
      ...defaults.creed,
      ...(parsed.creed ?? {}),
    },
    calendar: {
      ...defaults.calendar,
      ...(parsed.calendar ?? {}),
    },
    rotation: {
      ...defaults.rotation,
      ...parsedRotation,
      historyCycles: keptHistory,
    },
    auth: {
      ...defaults.auth,
      ...(parsed.auth ?? {}),
    },
  });
}

export function loadSettings(): AppSettings {
  if (!isBrowser()) return createDefaultSettings();
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return createDefaultSettings();
    const parsed = JSON.parse(raw) as Partial<AppSettings> & { version?: number };
    if (!parsed || typeof parsed !== "object") return createDefaultSettings();
    const hydrated = hydrateSettings(parsed);
    const storedCycles = Array.isArray(parsed.rotation?.historyCycles)
      ? parsed.rotation.historyCycles.length
      : 0;
    const migrated =
      parsed.version !== SETTINGS_VERSION ||
      storedCycles !== hydrated.rotation.historyCycles.length;
    if (migrated) saveSettings(hydrated);
    return hydrated;
  } catch {
    return createDefaultSettings();
  }
}

export function saveSettings(settings: AppSettings): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(withSyncedThemeSlots(settings)),
  );
}

export function exportSettingsJson(settings: AppSettings): string {
  // Never encourage committing secrets; export is for local backup only.
  return `${JSON.stringify(withSyncedThemeSlots(settings), null, 2)}\n`;
}

export function parseSettingsJson(text: string): AppSettings {
  const parsed = JSON.parse(text) as AppSettings;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("JSONの形が不正です");
  }
  return hydrateSettings(parsed);
}
