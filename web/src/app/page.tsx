"use client";

import { useState } from "react";
import ChatInput from "@/components/ChatInput";
import { TodoCard } from "@/components/TodoCard";
import { HabitCard } from "@/components/HabitCard";
import { AppointmentCard } from "@/components/AppointmentCard";
import { useLife } from "@/state/LifeStore";

const priorityOrder = { high: 0, medium: 1, low: 2 };

type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

const PRIORITY_TABS = [
  { key: 'high' as const, label: 'High', color: 'bg-red-500', activeText: 'text-white', inactiveText: 'text-red-600', inactiveBg: 'bg-red-50' },
  { key: 'medium' as const, label: 'Med', color: 'bg-amber-500', activeText: 'text-white', inactiveText: 'text-amber-600', inactiveBg: 'bg-amber-50' },
  { key: 'low' as const, label: 'Low', color: 'bg-green-500', activeText: 'text-white', inactiveText: 'text-green-600', inactiveBg: 'bg-green-50' },
];

export default function TodayPage() {
  const { todos, habits, appointments } = useLife();
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Filter today's appointments
  const todayAppointments = appointments
    .filter((apt) => {
      const aptDate = new Date(apt.datetime);
      return aptDate >= today && aptDate < tomorrow;
    })
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  // Active todos sorted by priority
  const activeTodos = todos
    .filter((todo) => !todo.completedAt)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Filtered todos based on priority filter
  const filteredTodos = priorityFilter === 'all' 
    ? activeTodos 
    : activeTodos.filter(t => t.priority === priorityFilter);

  // Count high priority
  const highPriorityCount = activeTodos.filter(t => t.priority === 'high').length;

  // Format greeting
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4 md:space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-brandBlue to-brandGreen rounded-xl md:rounded-2xl p-4 md:p-6 text-white">
        <h1 className="text-2xl md:text-3xl font-bold">{greeting()}</h1>
        <p className="text-white/80 mt-1 text-sm md:text-base">{formattedDate}</p>
      </div>

      {/* Main Grid - Chat + Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Chat Interface */}
        <div className="order-1">
          <ChatInput />
        </div>

        {/* Today Overview */}
        <div className="space-y-4 md:space-y-6 order-2">
          {/* Appointments */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="font-semibold flex items-center gap-2 text-brandText text-sm md:text-base">
                <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 text-xs md:text-sm">◷</span>
                Today
              </h2>
              <span className="text-xs text-brandTextLight bg-gray-100 px-2 py-1 rounded-full">
                {todayAppointments.length} appts
              </span>
            </div>
            <div className="space-y-2 max-h-[150px] md:max-h-[200px] overflow-y-auto">
              {todayAppointments.length > 0 ? (
                todayAppointments.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))
              ) : (
                <p className="text-sm text-brandTextLight text-center py-3 md:py-4">No appointments today</p>
              )}
            </div>
          </div>

          {/* Todos */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="font-semibold flex items-center gap-2 text-brandText text-sm md:text-base">
                <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-brandBlueLight flex items-center justify-center text-brandBlue text-xs md:text-sm">✓</span>
                Todos
              </h2>
              {/* Priority Filter Tabs */}
              <div className="flex items-center gap-1">
                {PRIORITY_TABS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPriorityFilter(priorityFilter === p.key ? 'all' : p.key)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-all
                      ${priorityFilter === p.key
                        ? `${p.color} ${p.activeText}`
                        : `${p.inactiveBg} ${p.inactiveText} hover:opacity-80`
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
                {priorityFilter !== 'all' && (
                  <button
                    onClick={() => setPriorityFilter('all')}
                    className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                    title="Clear filter"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-[150px] md:max-h-[200px] overflow-y-auto">
              {filteredTodos.length > 0 ? (
                filteredTodos.slice(0, 5).map((todo) => (
                  <TodoCard key={todo.id} todo={todo} />
                ))
              ) : (
                <p className="text-sm text-brandTextLight text-center py-3 md:py-4">
                  {priorityFilter === 'all' ? 'All caught up!' : `No ${priorityFilter} priority todos`}
                </p>
              )}
            </div>
          </div>

          {/* Routines */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="font-semibold flex items-center gap-2 text-brandText text-sm md:text-base">
                <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-brandGreenLight flex items-center justify-center text-brandGreen text-xs md:text-sm">↻</span>
                Routines
              </h2>
            </div>
            <div className="space-y-2 max-h-[150px] md:max-h-[200px] overflow-y-auto">
              {habits.length > 0 ? (
                habits.slice(0, 4).map((habit) => (
                  <HabitCard key={habit.id} habit={habit} />
                ))
              ) : (
                <p className="text-sm text-brandTextLight text-center py-3 md:py-4">No routines yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
