import { createDefaultSettings } from "./defaults";
import { withSyncedThemeSlots } from "./sync-theme-slots";
import type { AppSettings } from "./types";
import { SETTINGS_STORAGE_KEY, SETTINGS_VERSION } from "./types";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadSettings(): AppSettings {
  if (!isBrowser()) return createDefaultSettings();
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return createDefaultSettings();
    const parsed = JSON.parse(raw) as AppSettings;
    if (parsed?.version !== SETTINGS_VERSION) return createDefaultSettings();
    return withSyncedThemeSlots({
      ...createDefaultSettings(),
      ...parsed,
      creed: {
        ...createDefaultSettings().creed,
        ...(parsed.creed ?? {}),
      },
      calendar: {
        ...createDefaultSettings().calendar,
        ...parsed.calendar,
      },
      rotation: {
        ...createDefaultSettings().rotation,
        ...parsed.rotation,
      },
      auth: {
        ...createDefaultSettings().auth,
        ...parsed.auth,
      },
    });
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
  return withSyncedThemeSlots({
    ...createDefaultSettings(),
    ...parsed,
    version: SETTINGS_VERSION,
    creed: {
      ...createDefaultSettings().creed,
      ...(parsed.creed ?? {}),
    },
    calendar: {
      ...createDefaultSettings().calendar,
      ...(parsed.calendar ?? {}),
    },
    rotation: {
      ...createDefaultSettings().rotation,
      ...(parsed.rotation ?? {}),
    },
    auth: {
      ...createDefaultSettings().auth,
      ...(parsed.auth ?? {}),
    },
  });
}
