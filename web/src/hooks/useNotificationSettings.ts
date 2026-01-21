import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NotificationSettings,
  loadNotificationSettings,
  saveNotificationSettings,
} from "@/lib/notificationSettings";

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  useEffect(() => {
    setSettings(loadNotificationSettings());
  }, []);

  const updateSettings = useCallback(
    (updates: Partial<NotificationSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...updates };
        saveNotificationSettings(next);
        return next;
      });
    },
    []
  );

  return { settings, updateSettings };
}
