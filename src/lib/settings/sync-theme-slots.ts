import type { AppSettings } from "./types";

/** Active member count — theme slots follow this (no sit-outs). */
export function activeMemberCount(settings: AppSettings): number {
  return settings.members.filter((m) => m.active).length;
}

/**
 * Keep rotation.businessDayCount (= theme slots) in sync with active members.
 * Call after any member add / remove / active toggle / import / load.
 */
export function withSyncedThemeSlots(settings: AppSettings): AppSettings {
  const slots = Math.max(1, activeMemberCount(settings));
  if (settings.rotation.businessDayCount === slots) return settings;
  return {
    ...settings,
    rotation: {
      ...settings.rotation,
      businessDayCount: slots,
    },
  };
}
