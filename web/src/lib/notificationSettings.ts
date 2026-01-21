export type NotificationSettings = {
  morningEncouragementEnabled: boolean;
  morningStartTime: string; // "08:00"
  morningEndTime: string; // "10:00"
  highPriorityEnabled: boolean;
  highPriorityStartTime: string; // "12:00"
  highPriorityEndTime: string; // "13:00"
  weeklySummaryEnabled: boolean;
  weeklySummaryDay: "sunday" | "monday";
  weeklySummaryTime: string; // "18:00"
  monthlySummaryEnabled: boolean;
  monthlySummaryTime: string; // "18:00"
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  morningEncouragementEnabled: false,
  morningStartTime: "08:30",
  morningEndTime: "08:30",
  highPriorityEnabled: false,
  highPriorityStartTime: "12:00",
  highPriorityEndTime: "13:00",
  weeklySummaryEnabled: false,
  weeklySummaryDay: "sunday",
  weeklySummaryTime: "18:30",
  monthlySummaryEnabled: false,
  monthlySummaryTime: "18:30",
};

const STORAGE_KEY = "helpem:notification-settings";

export function loadNotificationSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_NOTIFICATION_SETTINGS;
    const parsed = JSON.parse(stored) as Partial<NotificationSettings>;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveNotificationSettings(settings: NotificationSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage failures
  }
}
