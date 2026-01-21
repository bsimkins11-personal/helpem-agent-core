import { useEffect, useMemo, useRef } from "react";
import { useLife } from "@/state/LifeStore";
import { sendNotification, requestNotificationPermission } from "@/lib/notifications";
import { NotificationSettings } from "@/lib/notificationSettings";

const CHECK_INTERVAL_MS = 60000;
const LAST_SENT_KEY = "helpem:analytics-notifications";

const calmKeywords = ["rest", "calm", "meditation", "break", "walk", "sleep"];

type LastSentMap = Record<string, string>;

const loadLastSent = (): LastSentMap => {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(LAST_SENT_KEY);
    return stored ? (JSON.parse(stored) as LastSentMap) : {};
  } catch {
    return {};
  }
};

const saveLastSent = (map: LastSentMap) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_SENT_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
};

const normalizeTime = (date: Date, time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  const next = new Date(date);
  next.setHours(Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0, 0, 0);
  return next;
};

const getDayKey = (date: Date) => date.toISOString().slice(0, 10);

const getMonthKey = (date: Date) => date.toISOString().slice(0, 7);

const getWeekKey = (date: Date) => {
  const tmp = new Date(date);
  tmp.setHours(0, 0, 0, 0);
  const day = (tmp.getDay() + 6) % 7;
  tmp.setDate(tmp.getDate() - day + 3);
  const firstThursday = new Date(tmp.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((tmp.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
  return `${tmp.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
};

const isHabitScheduledOnDate = (habit: { frequency: string; daysOfWeek?: string[] }, date: Date) => {
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekly" && habit.daysOfWeek?.length) {
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    return habit.daysOfWeek.map((d) => d.toLowerCase()).includes(dayName);
  }
  return false;
};

const isCalmRoutine = (title: string) => {
  const normalized = title.toLowerCase();
  return calmKeywords.some((keyword) => normalized.includes(keyword));
};

const getLastDayOfMonth = (date: Date) => {
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  nextMonth.setHours(0, 0, 0, 0);
  return nextMonth;
};

export function usePersonalAnalyticsNotifications(settings: NotificationSettings) {
  const { todos, habits } = useLife();
  const lastSentRef = useRef<LastSentMap>({});

  const isNativeApp = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean((window as any).webkit?.messageHandlers?.native);
  }, []);

  useEffect(() => {
    lastSentRef.current = loadLastSent();
  }, []);

  useEffect(() => {
    const anyEnabled =
      settings.morningEncouragementEnabled ||
      settings.highPriorityEnabled ||
      settings.weeklySummaryEnabled ||
      settings.monthlySummaryEnabled;
    if (anyEnabled) {
      requestNotificationPermission();
    }
  }, [settings]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sendNative = (
      id: string,
      title: string,
      body: string,
      date: Date,
      silent = false,
      badge?: number
    ) => {
      if (!isNativeApp) return;
      (window as any).webkit?.messageHandlers?.native?.postMessage({
        action: "scheduleNotification",
        id,
        title,
        body,
        date: date.toISOString(),
        silent,
        badge,
      });
    };

    const cancelNative = (id: string) => {
      if (!isNativeApp) return;
      (window as any).webkit?.messageHandlers?.native?.postMessage({
        action: "cancelNotification",
        id,
      });
    };

    const hasRoutinesForDate = (date: Date) =>
      habits.some((habit) => isHabitScheduledOnDate(habit, date));

    const hasCalmRoutineToday = habits.some(
      (habit) => isHabitScheduledOnDate(habit, new Date()) && isCalmRoutine(habit.title)
    );

    const getMorningDate = (now: Date) => {
      const todayTime = normalizeTime(now, settings.morningStartTime);
      if (now <= todayTime) {
        return hasRoutinesForDate(now) ? todayTime : null;
      }
      const nextDay = new Date(now);
      nextDay.setDate(nextDay.getDate() + 1);
      return hasRoutinesForDate(nextDay) ? normalizeTime(nextDay, settings.morningStartTime) : null;
    };

    const getHighPriorityDate = (now: Date) => {
      if (hasCalmRoutineToday) return null;
      const highPriorityTask = todos.find((t) => t.priority === "high" && !t.completedAt);
      if (!highPriorityTask) return null;

      const endWindowToday = normalizeTime(now, settings.highPriorityEndTime);
      const baseDate = now <= endWindowToday ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const dayKey = getDayKey(baseDate);
      const timeKey = `high_priority_time:${dayKey}`;
      const stored = lastSentRef.current[timeKey];
      if (stored) {
        const storedDate = new Date(stored);
        if (!Number.isNaN(storedDate.getTime())) {
          return storedDate;
        }
      }

      const startWindow = normalizeTime(baseDate, settings.highPriorityStartTime);
      const endWindow = normalizeTime(baseDate, settings.highPriorityEndTime);
      const rangeMs = Math.max(0, endWindow.getTime() - startWindow.getTime());
      const offset = rangeMs > 0 ? Math.floor(Math.random() * rangeMs) : 0;
      const randomTime = new Date(startWindow.getTime() + offset);
      lastSentRef.current[timeKey] = randomTime.toISOString();
      return randomTime;
    };

    const getWeeklyDate = (now: Date) => {
      const targetDay = settings.weeklySummaryDay === "sunday" ? 0 : 1;
      const candidate = normalizeTime(now, settings.weeklySummaryTime);
      const currentDay = now.getDay();
      let delta = targetDay - currentDay;
      if (delta < 0 || (delta === 0 && candidate <= now)) {
        delta += 7;
      }
      const next = new Date(now);
      next.setDate(now.getDate() + delta);
      return normalizeTime(next, settings.weeklySummaryTime);
    };

    const getMonthlyDate = (now: Date) => {
      const lastDay = getLastDayOfMonth(now);
      const candidateTime = normalizeTime(lastDay, settings.monthlySummaryTime);
      const earliest = normalizeTime(lastDay, "18:00");
      const candidate = candidateTime < earliest ? earliest : candidateTime;
      if (candidate <= now) {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextLast = getLastDayOfMonth(nextMonth);
        const nextCandidateTime = normalizeTime(nextLast, settings.monthlySummaryTime);
        const nextEarliest = normalizeTime(nextLast, "18:00");
        return nextCandidateTime < nextEarliest ? nextEarliest : nextCandidateTime;
      }
      return candidate;
    };

    const checkAndSendWeb = () => {
      if (isNativeApp) return;
      const now = new Date();

      if (settings.morningEncouragementEnabled) {
        const key = `daily_routine_prime:${getDayKey(now)}`;
        if (!lastSentRef.current[key] && hasRoutinesForDate(now)) {
          const target = normalizeTime(now, settings.morningStartTime);
          if (now >= target) {
            sendNotification("Good morning", { body: "You have routines today.", silent: true });
            lastSentRef.current[key] = new Date().toISOString();
          }
        }
      }

      if (settings.highPriorityEnabled && !hasCalmRoutineToday) {
        const key = `high_priority_nudge:${getDayKey(now)}`;
        const highPriorityTask = todos.find((t) => t.priority === "high" && !t.completedAt);
        if (highPriorityTask && !lastSentRef.current[key]) {
          const scheduled = getHighPriorityDate(now);
          if (scheduled && now >= scheduled) {
            sendNotification("One important task remains", { body: highPriorityTask.title, silent: true });
            lastSentRef.current[key] = new Date().toISOString();
          }
        }
      }

      if (settings.weeklySummaryEnabled) {
        const key = `weekly_summary:${getWeekKey(now)}`;
        const scheduled = getWeeklyDate(now);
        if (!lastSentRef.current[key] && now >= scheduled) {
          sendNotification(
            "Weekly summary",
            { body: "Here’s a look at how your week went.", silent: true },
            "/analytics"
          );
          lastSentRef.current[key] = new Date().toISOString();
        }
      }

      if (settings.monthlySummaryEnabled) {
        const key = `monthly_summary:${getMonthKey(now)}`;
        const scheduled = getMonthlyDate(now);
        if (!lastSentRef.current[key] && now >= scheduled) {
          sendNotification("Monthly summary", { body: "A look back at this month.", silent: true }, "/analytics");
          lastSentRef.current[key] = new Date().toISOString();
        }
      }

      saveLastSent(lastSentRef.current);
    };

    const scheduleNativeNotifications = () => {
      const now = new Date();

      if (settings.morningEncouragementEnabled) {
        const target = getMorningDate(now);
        if (target) {
          sendNative("daily-routine-prime", "Good morning", "You have routines today.", target, true, 0);
        } else {
          cancelNative("daily-routine-prime");
        }
      } else {
        cancelNative("daily-routine-prime");
      }

      if (settings.highPriorityEnabled) {
        const target = getHighPriorityDate(now);
        const highPriorityTask = todos.find((t) => t.priority === "high" && !t.completedAt);
        if (target && highPriorityTask) {
          sendNative("high-priority-nudge", "One important task remains", highPriorityTask.title, target);
        } else {
          cancelNative("high-priority-nudge");
        }
      } else {
        cancelNative("high-priority-nudge");
      }

      if (settings.weeklySummaryEnabled) {
        const target = getWeeklyDate(now);
        sendNative("weekly-summary", "Weekly summary", "Here’s a look at how your week went.", target);
      } else {
        cancelNative("weekly-summary");
      }

      if (settings.monthlySummaryEnabled) {
        const target = getMonthlyDate(now);
        sendNative("monthly-summary", "Monthly summary", "A look back at this month.", target);
      } else {
        cancelNative("monthly-summary");
      }
    };

    checkAndSendWeb();
    scheduleNativeNotifications();

    const interval = setInterval(checkAndSendWeb, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [settings, todos, habits, isNativeApp]);
}
