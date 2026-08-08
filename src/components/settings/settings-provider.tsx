"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createDefaultSettings } from "@/lib/settings/defaults";
import {
  exportSettingsJson,
  loadSettings,
  parseSettingsJson,
  saveSettings,
} from "@/lib/settings/storage";
import { withSyncedThemeSlots } from "@/lib/settings/sync-theme-slots";
import type { AppSettings } from "@/lib/settings/types";

type SettingsContextValue = {
  settings: AppSettings;
  ready: boolean;
  updateSettings: (next: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
  resetToDefaults: () => void;
  exportJson: () => string;
  importJson: (text: string) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(createDefaultSettings);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setReady(true);
  }, []);

  const updateSettings = useCallback(
    (next: AppSettings | ((prev: AppSettings) => AppSettings)) => {
      setSettings((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        const synced = withSyncedThemeSlots(resolved);
        saveSettings(synced);
        return synced;
      });
    },
    [],
  );

  const resetToDefaults = useCallback(() => {
    const defaults = createDefaultSettings();
    saveSettings(defaults);
    setSettings(defaults);
  }, []);

  const exportJson = useCallback(() => exportSettingsJson(settings), [settings]);

  const importJson = useCallback((text: string) => {
    const parsed = parseSettingsJson(text);
    saveSettings(parsed);
    setSettings(parsed);
  }, []);

  const value = useMemo(
    () => ({
      settings,
      ready,
      updateSettings,
      resetToDefaults,
      exportJson,
      importJson,
    }),
    [settings, ready, updateSettings, resetToDefaults, exportJson, importJson],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
