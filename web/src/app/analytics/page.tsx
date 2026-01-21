"use client";

import { useMemo } from "react";
import { useLife } from "@/state/LifeStore";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { usePersonalAnalyticsNotifications } from "@/hooks/usePersonalAnalyticsNotifications";

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function AnalyticsPage() {
  const { todos, habits, appointments } = useLife();
  const { settings, updateSettings } = useNotificationSettings();

  usePersonalAnalyticsNotifications(settings);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const summaries = useMemo(() => {
    const withinRange = (date: Date, start: Date) => date >= start && date <= now;

    const completedTodosWeek = todos.filter(
      (t) => t.completedAt && withinRange(new Date(t.completedAt), weekStart)
    ).length;
    const completedTodosMonth = todos.filter(
      (t) => t.completedAt && withinRange(new Date(t.completedAt), monthStart)
    ).length;

    const routineCompletionsWeek = habits.reduce((acc, habit) => {
      const count = habit.completions.filter((c) => withinRange(new Date(c.date), weekStart)).length;
      return acc + count;
    }, 0);
    const routineCompletionsMonth = habits.reduce((acc, habit) => {
      const count = habit.completions.filter((c) => withinRange(new Date(c.date), monthStart)).length;
      return acc + count;
    }, 0);

    const appointmentsWeek = appointments.filter((a) =>
      withinRange(new Date(a.datetime), weekStart)
    ).length;
    const appointmentsMonth = appointments.filter((a) =>
      withinRange(new Date(a.datetime), monthStart)
    ).length;

    const routinesToday = habits.filter((habit) => {
      if (habit.frequency === "daily") return true;
      if (habit.frequency === "weekly" && habit.daysOfWeek?.length) {
        const dayName = todayStart.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
        return habit.daysOfWeek.map((d) => d.toLowerCase()).includes(dayName);
      }
      return false;
    }).length;

    const appointmentsToday = appointments.filter((a) => {
      const date = new Date(a.datetime);
      return date >= todayStart && date < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    }).length;

    const activeTodos = todos.filter((t) => !t.completedAt).length;

    return {
      routinesToday,
      appointmentsToday,
      activeTodos,
      completedTodosWeek,
      completedTodosMonth,
      routineCompletionsWeek,
      routineCompletionsMonth,
      appointmentsWeek,
      appointmentsMonth,
    };
  }, [todos, habits, appointments, todayStart, weekStart, monthStart, now]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-brandText">Personal Analytics</h1>
          <p className="text-sm text-brandTextLight mt-1">
            An overview of your appointments, todos, and routines.
          </p>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-brandText mb-3">Daily overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-brandTextLight">Routines today</p>
                <p className="text-lg font-semibold text-brandText">{summaries.routinesToday}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-brandTextLight">Appointments today</p>
                <p className="text-lg font-semibold text-brandText">{summaries.appointmentsToday}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-brandTextLight">Open tasks</p>
                <p className="text-lg font-semibold text-brandText">{summaries.activeTodos}</p>
              </div>
            </div>
            <p className="text-xs text-brandTextLight mt-3">
              This view is a snapshot, not a score.
            </p>
          </section>

          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-brandText mb-3">
              Weekly summary ({formatDate(weekStart)} – {formatDate(todayStart)})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-brandTextLight">Routine check-ins</p>
                <p className="text-lg font-semibold text-brandText">{summaries.routineCompletionsWeek}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-brandTextLight">Tasks completed</p>
                <p className="text-lg font-semibold text-brandText">{summaries.completedTodosWeek}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-brandTextLight">Appointments</p>
                <p className="text-lg font-semibold text-brandText">{summaries.appointmentsWeek}</p>
              </div>
            </div>
            {(summaries.routineCompletionsWeek + summaries.completedTodosWeek + summaries.appointmentsWeek === 0) && (
              <p className="text-xs text-brandTextLight mt-3">
                Nothing recorded yet this week. This space will fill in as you go.
              </p>
            )}
          </section>

          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-brandText mb-3">
              Monthly summary ({todayStart.toLocaleDateString("en-US", { month: "long" })})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-brandTextLight">Routine check-ins</p>
                <p className="text-lg font-semibold text-brandText">{summaries.routineCompletionsMonth}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-brandTextLight">Tasks completed</p>
                <p className="text-lg font-semibold text-brandText">{summaries.completedTodosMonth}</p>
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-brandTextLight">Appointments</p>
                <p className="text-lg font-semibold text-brandText">{summaries.appointmentsMonth}</p>
              </div>
            </div>
            {(summaries.routineCompletionsMonth + summaries.completedTodosMonth + summaries.appointmentsMonth === 0) && (
              <p className="text-xs text-brandTextLight mt-3">
                This month is still open. When you add items, you’ll see them here.
              </p>
            )}
          </section>

          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-brandText mb-4">Notification settings</h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-brandText">Morning encouragement</p>
                  <p className="text-brandTextLight">A gentle reminder when routines are scheduled.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.morningEncouragementEnabled}
                  onChange={(e) => updateSettings({ morningEncouragementEnabled: e.target.checked })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-brandTextLight">
                  Window start
                  <input
                    type="time"
                    className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1 text-sm"
                    value={settings.morningStartTime}
                    onChange={(e) => updateSettings({ morningStartTime: e.target.value })}
                  />
                </label>
                <label className="text-xs text-brandTextLight">
                  Window end
                  <input
                    type="time"
                    className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1 text-sm"
                    value={settings.morningEndTime}
                    onChange={(e) => updateSettings({ morningEndTime: e.target.value })}
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-brandText">High-priority reminders</p>
                  <p className="text-brandTextLight">A calm nudge when an important task is open.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.highPriorityEnabled}
                  onChange={(e) => updateSettings({ highPriorityEnabled: e.target.checked })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-brandTextLight">
                  Reminder window start
                  <input
                    type="time"
                    className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1 text-sm"
                    value={settings.highPriorityStartTime}
                    onChange={(e) => updateSettings({ highPriorityStartTime: e.target.value })}
                  />
                </label>
                <label className="text-xs text-brandTextLight">
                  Reminder window end
                  <input
                    type="time"
                    className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1 text-sm"
                    value={settings.highPriorityEndTime}
                    onChange={(e) => updateSettings({ highPriorityEndTime: e.target.value })}
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-brandText">Weekly summary</p>
                  <p className="text-brandTextLight">A short reflection on your week.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.weeklySummaryEnabled}
                  onChange={(e) => updateSettings({ weeklySummaryEnabled: e.target.checked })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-brandTextLight">
                  Weekly day
                  <select
                    className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1 text-sm"
                    value={settings.weeklySummaryDay}
                    onChange={(e) =>
                      updateSettings({ weeklySummaryDay: e.target.value as "sunday" | "monday" })
                    }
                  >
                    <option value="sunday">Sunday evening</option>
                    <option value="monday">Monday morning</option>
                  </select>
                </label>
                <label className="text-xs text-brandTextLight">
                  Weekly time
                  <input
                    type="time"
                    className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1 text-sm"
                    value={settings.weeklySummaryTime}
                    onChange={(e) => updateSettings({ weeklySummaryTime: e.target.value })}
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-brandText">Monthly summary</p>
                  <p className="text-brandTextLight">A gentle look back at the month.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.monthlySummaryEnabled}
                  onChange={(e) => updateSettings({ monthlySummaryEnabled: e.target.checked })}
                />
              </div>

              <label className="text-xs text-brandTextLight">
                Monthly time
                <input
                  type="time"
                  className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1 text-sm"
                  value={settings.monthlySummaryTime}
                  onChange={(e) => updateSettings({ monthlySummaryTime: e.target.value })}
                />
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
