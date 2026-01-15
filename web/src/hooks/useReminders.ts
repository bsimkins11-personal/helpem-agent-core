"use client";

import { useEffect, useRef, useCallback } from "react";
import { useLife } from "@/state/LifeStore";
import { sendNotification, requestNotificationPermission } from "@/lib/notifications";

const REMINDER_WINDOW_MINUTES = 15;
const CHECK_INTERVAL_MS = 60000; // 1 minute
const CLEANUP_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useReminders() {
  const { appointments } = useLife();
  const notifiedRef = useRef<Map<string, number>>(new Map()); // key -> timestamp

  // Request permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Cleanup old entries to prevent memory bloat
  const cleanupOldEntries = useCallback(() => {
    const now = Date.now();
    const toDelete: string[] = [];
    
    notifiedRef.current.forEach((timestamp, key) => {
      if (now - timestamp > CLEANUP_THRESHOLD_MS) {
        toDelete.push(key);
      }
    });
    
    toDelete.forEach(key => notifiedRef.current.delete(key));
  }, []);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

      appointments.forEach((apt) => {
        const aptTime = new Date(apt.datetime);
        const reminderKey = `${apt.id}-${aptTime.getTime()}`;

        // Skip if already notified
        if (notifiedRef.current.has(reminderKey)) return;

        // Check if appointment is within the reminder window
        if (aptTime > now && aptTime <= windowEnd) {
          const minutesUntil = Math.round((aptTime.getTime() - now.getTime()) / 60000);
          
          sendNotification(`📅 ${apt.title}`, {
            body: `Coming up in ${minutesUntil} minute${minutesUntil !== 1 ? "s" : ""}`,
            tag: reminderKey,
          });

          notifiedRef.current.set(reminderKey, Date.now());
        }
      });

      // Periodic cleanup
      cleanupOldEntries();
    };

    // Check immediately
    checkReminders();

    // Then check every minute
    const interval = setInterval(checkReminders, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [appointments, cleanupOldEntries]);
}
