"use client";

import ChatInput from "@/components/ChatInput";
import { TodoCard } from "@/components/TodoCard";
import { HabitCard } from "@/components/HabitCard";
import { AppointmentCard } from "@/components/AppointmentCard";
import { GroceryList } from "@/components/GroceryList";
import { useLife } from "@/state/LifeStore";
import { useState } from "react";

const priorityOrder = { high: 0, medium: 1, low: 2 };
type PriorityFilter = "all" | "high" | "medium" | "low";

const PRIORITY_TABS = [
  { key: "high" as const, label: "High", color: "bg-red-500", activeText: "text-white", inactiveText: "text-red-600", inactiveBg: "bg-red-50" },
  { key: "medium" as const, label: "Med", color: "bg-amber-500", activeText: "text-white", inactiveText: "text-amber-600", inactiveBg: "bg-amber-50" },
  { key: "low" as const, label: "Low", color: "bg-green-500", activeText: "text-white", inactiveText: "text-green-600", inactiveBg: "bg-green-50" },
];

export default function AppPage() {
  const { todos, habits, appointments } = useLife();
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Expand/collapse states for each module
  const [expandedModules, setExpandedModules] = useState({
    today: true,
    todos: true,
    routines: true,
    groceries: true,
  });

  const toggleModule = (module: keyof typeof expandedModules) => {
    setExpandedModules(prev => ({ ...prev, [module]: !prev[module] }));
  };

  const toggleAllModules = () => {
    const allExpanded = Object.values(expandedModules).every(v => v);
    const newState = !allExpanded;
    setExpandedModules({
      today: newState,
      todos: newState,
      routines: newState,
      groceries: newState,
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const viewDate = new Date(selectedDate);
  viewDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(viewDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const isViewingToday = viewDate.getTime() === today.getTime();

  const viewDateAppointments = appointments
    .filter((apt) => {
      const aptDate = new Date(apt.datetime);
      return aptDate >= viewDate && aptDate < nextDay;
    })
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  const activeTodos = todos.filter((todo) => !todo.completedAt).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const filteredTodos = priorityFilter === "all" ? activeTodos : activeTodos.filter((t) => t.priority === priorityFilter);
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

  const formattedViewDate = viewDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const allExpanded = Object.values(expandedModules).every(v => v);

  return (
    <div className="space-y-4 md:space-y-8">
      <div className="bg-gradient-to-r from-brandBlue to-brandGreen rounded-xl md:rounded-2xl p-4 md:p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:3xl font-bold">{greeting()}</h1>
            <p className="text-white/80 mt-1 text-sm md:text-base">{formattedDate}</p>
          </div>
          <button
            onClick={toggleAllModules}
            className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            title={allExpanded ? "Collapse all" : "Expand all"}
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="order-1">
          <ChatInput onNavigateCalendar={setSelectedDate} />
        </div>

        <div className="space-y-4 md:space-y-6 order-2">
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <button
                onClick={() => toggleModule('today')}
                className="font-semibold flex items-center gap-2 text-brandText text-sm md:text-base hover:opacity-70 transition-opacity"
              >
                <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 text-xs md:text-sm">◷</span>
                {isViewingToday ? "Today" : formattedViewDate}
                <svg className={`w-4 h-4 transition-transform ${expandedModules.today ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-brandTextLight bg-gray-100 px-2 py-1 rounded-full">{viewDateAppointments.length} appts</span>
                {!isViewingToday && (
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="text-xs text-brandBlue hover:text-brandBlue/80 font-medium underline"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
            {expandedModules.today && (
              <div className="space-y-2 max-h-[150px] md:max-h-[200px] overflow-y-auto">
                {viewDateAppointments.length > 0 ? (
                  viewDateAppointments.map((apt) => <AppointmentCard key={apt.id} appointment={apt} />)
                ) : (
                  <p className="text-sm text-brandTextLight text-center py-3 md:py-4">No appointments {isViewingToday ? "today" : "on this day"}</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <button
                onClick={() => toggleModule('todos')}
                className="font-semibold flex items-center gap-2 text-brandText text-sm md:text-base hover:opacity-70 transition-opacity"
              >
                <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-brandBlueLight flex items-center justify-center text-brandBlue text-xs md:text-sm">✓</span>
                Todos
                <svg className={`w-4 h-4 transition-transform ${expandedModules.todos ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-1">
                {PRIORITY_TABS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPriorityFilter(priorityFilter === p.key ? "all" : p.key)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-all
                      ${priorityFilter === p.key ? `${p.color} ${p.activeText}` : `${p.inactiveBg} ${p.inactiveText} hover:opacity-80`}`}
                  >
                    {p.label}
                  </button>
                ))}
                {priorityFilter !== "all" && (
                  <button
                    onClick={() => setPriorityFilter("all")}
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

            {expandedModules.todos && (
              <div className={`space-y-2 ${priorityFilter === "all" ? "" : "max-h-[150px] md:max-h-[200px]"} overflow-y-auto`}>
                {filteredTodos.length > 0 ? (
                  (priorityFilter === "all" ? filteredTodos : filteredTodos.slice(0, 5)).map((todo) => <TodoCard key={todo.id} todo={todo} />)
                ) : (
                  <p className="text-sm text-brandTextLight text-center py-3 md:py-4">
                    {priorityFilter === "all" ? "All caught up!" : `No ${priorityFilter} priority todos`}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <button
                onClick={() => toggleModule('routines')}
                className="font-semibold flex items-center gap-2 text-brandText text-sm md:text-base hover:opacity-70 transition-opacity"
              >
                <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-brandGreenLight flex items-center justify-center text-brandGreen text-xs md:text-sm">↻</span>
                Routines
                <svg className={`w-4 h-4 transition-transform ${expandedModules.routines ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {expandedModules.routines && (
              <div className="space-y-2 max-h-[150px] md:max-h-[200px] overflow-y-auto">
                {habits.length > 0 ? habits.slice(0, 4).map((habit) => <HabitCard key={habit.id} habit={habit} />) : <p className="text-sm text-brandTextLight text-center py-3 md:py-4">No routines yet</p>}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 md:p-5">
              <button
                onClick={() => toggleModule('groceries')}
                className="font-semibold flex items-center gap-2 text-brandText text-sm md:text-base hover:opacity-70 transition-opacity w-full"
              >
                <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 text-xs md:text-sm">🛒</span>
                Groceries
                <svg className={`w-4 h-4 transition-transform ${expandedModules.groceries ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {expandedModules.groceries && (
              <div className="px-4 md:px-5 pb-4 md:pb-5">
                <GroceryList />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
