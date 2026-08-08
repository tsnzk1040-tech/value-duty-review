import {
  POC_BUSINESS_DAY_COUNT,
  POC_COOLDOWN_BUSINESS_DAYS,
  POC_CYCLE_START,
  POC_HISTORY_CYCLES,
  POC_MEMBERS,
  POC_VALUE_ITEMS,
} from "@/lib/rotation/seed";

import type { AppSettings } from "./types";
import { SETTINGS_VERSION } from "./types";

export function createDefaultSettings(): AppSettings {
  return {
    version: SETTINGS_VERSION,
    members: structuredClone(POC_MEMBERS),
    valueItems: structuredClone(POC_VALUE_ITEMS),
    calendar: {
      skipWeekends: true,
      holidays: [],
    },
    rotation: {
      cycleStart: POC_CYCLE_START,
      businessDayCount: POC_BUSINESS_DAY_COUNT,
      cooldownBusinessDays: POC_COOLDOWN_BUSINESS_DAYS,
      historyCycles: structuredClone(POC_HISTORY_CYCLES),
    },
    auth: {
      enabled: false,
      salt: "",
      passwordHash: "",
    },
    notes: "",
  };
}
