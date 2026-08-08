import {
  POC_BUSINESS_DAY_COUNT,
  POC_COOLDOWN_BUSINESS_DAYS,
  POC_HISTORY_CYCLES,
  POC_LAST_ASSIGNEE_MEMBER_ID,
  POC_MEMBERS,
  POC_THEME_START_VALUE_ITEM_ID,
  POC_VALUE_HEADINGS,
  POC_VALUE_ITEMS,
  POC_VISION,
} from "@/lib/rotation/seed";
import { defaultCycleStartYmd } from "@/lib/rotation/business-days";

import type { AppSettings } from "./types";
import { SETTINGS_VERSION } from "./types";

export function createDefaultSettings(): AppSettings {
  return {
    version: SETTINGS_VERSION,
    members: structuredClone(POC_MEMBERS),
    valueItems: structuredClone(POC_VALUE_ITEMS),
    creed: {
      vision: POC_VISION,
      valueHeadings: [...POC_VALUE_HEADINGS],
    },
    calendar: {
      skipWeekends: true,
      skipJapaneseHolidays: true,
      holidays: [],
    },
    rotation: {
      cycleStart: defaultCycleStartYmd(),
      businessDayCount: POC_BUSINESS_DAY_COUNT,
      cooldownBusinessDays: POC_COOLDOWN_BUSINESS_DAYS,
      lastAssigneeMemberId: POC_LAST_ASSIGNEE_MEMBER_ID,
      themeStartValueItemId: POC_THEME_START_VALUE_ITEM_ID,
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
