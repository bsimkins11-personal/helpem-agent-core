"use client";

import ChatInput from "@/components/ChatInput";
import { TodoCard } from "@/components/TodoCard";
import { HabitCard } from "@/components/HabitCard";
import { AppointmentCard } from "@/components/AppointmentCard";
import { GroceryList } from "@/components/GroceryList";
import { AlphaFeedbackBanner } from "@/components/AlphaFeedbackBanner";
import { UsageAlertBanner } from "@/components/UsageAlertBanner";
import { useLife } from "@/state/LifeStore";
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";

const priorityOrder = { high: 0, medium: 1, low: 2 };
type PriorityFilter = "all" | "high" | "medium" | "low";
type CalendarView = "day" | "week" | "month";

const PRIORITY_TABS = [
  { key: "all" as const, label: "All", color: "bg-brandBlue", activeText: "text-white", inactiveText: "text-brandBlue", inactiveBg: "bg-brandBlueLight" },
  { key: "high" as const, label: "High", color: "bg-red-500", activeText: "text-white", inactiveText: "text-red-600", inactiveBg: "bg-red-50" },
  { key: "medium" as const, label: "Med", color: "bg-amber-500", activeText: "text-white", inactiveText: "text-amber-600", inactiveBg: "bg-amber-50" },
  { key: "low" as const, label: "Low", color: "bg-green-500", activeText: "text-white", inactiveText: "text-green-600", inactiveBg: "bg-green-50" },
];
const STACK_GAP_PX = 0;

export default function AppPage() {
  const { todos, habits, appointments } = useLife();
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>("day");
  
  console.log('🟦 ========================================');
  console.log('🟦 AppPage: RENDERING');
  console.log('🟦 ========================================');
  console.log('📅 Total appointments in state:', appointments.length);
  console.log('📅 Appointments array:', appointments);
  appointments.forEach((apt, idx) => {
    console.log(`   [${idx}] "${apt.title}" at ${apt.datetime instanceof Date ? apt.datetime.toISOString() : apt.datetime}`);
  });
  console.log('📅 Selected date for filtering:', selectedDate.toISOString());
  console.log('📅 Calendar view:', calendarView);
  console.log('🟦 ========================================');
  
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

  // Get today at midnight in LOCAL timezone (not UTC)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // CRITICAL: Create viewDate in LOCAL timezone to avoid day shifts
  // Use year/month/date from selectedDate to avoid timezone conversion bugs
  const viewDate = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    0, 0, 0, 0
  );

  // Calculate date range based on view (work in local time to avoid timezone issues)
  const getDateRange = () => {
    const start = new Date(viewDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(viewDate);
    
    if (calendarView === "day") {
      // Set end to start of next day (exclusive comparison)
      end.setDate(end.getDate() + 1);
      end.setHours(0, 0, 0, 0);
    } else if (calendarView === "week") {
      // Start on Sunday of the week
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 7);
      end.setHours(0, 0, 0, 0);
    } else if (calendarView === "month") {
      start.setDate(1); // First day of month
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(1); // First day of next month
      end.setHours(0, 0, 0, 0);
    }
    
    return { start, end };
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  const isViewingToday = viewDate.getTime() === today.getTime();

  console.log('🔍 ========================================');
  console.log('🔍 DATE FILTERING');
  console.log('🔍 ========================================');
  console.log('📅 selectedDate (raw):', selectedDate);
  console.log('📅 selectedDate ISO:', selectedDate.toISOString());
  console.log('📅 selectedDate local:', selectedDate.toLocaleString());
  console.log('📅 viewDate ISO:', viewDate.toISOString());
  console.log('📅 viewDate local:', viewDate.toLocaleString());
  console.log('📅 Date range for filtering:');
  console.log('   Start:', rangeStart.toISOString());
  console.log('   End:', rangeEnd.toISOString());
  console.log('   View:', calendarView);
  console.log('   Is viewing today?', isViewingToday);

  const viewDateAppointments = appointments
    .filter((apt) => {
      const aptDate = new Date(apt.datetime);
      // Use < for end comparison since end is start of next day (exclusive)
      const inRange = aptDate >= rangeStart && aptDate < rangeEnd;
      
      console.log(`   Checking "${apt.title}":`, {
        datetime: aptDate.toISOString(),
        dateOnly: aptDate.toLocaleDateString(),
        inRange: inRange,
        reason: !inRange ? `${aptDate.toISOString()} is ${aptDate < rangeStart ? 'before' : 'after'} range` : 'IN RANGE ✅'
      });
      
      return inRange;
    })
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  
  console.log('🔍 Filtered appointments count:', viewDateAppointments.length);
  console.log('🔍 ========================================');

  // Navigation functions
  const navigatePrev = () => {
    const newDate = new Date(selectedDate);
    if (calendarView === "day") {
      newDate.setDate(newDate.getDate() - 1);
    } else if (calendarView === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else if (calendarView === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setSelectedDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(selectedDate);
    if (calendarView === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (calendarView === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else if (calendarView === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

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

  const formattedViewDate = () => {
    if (calendarView === "day") {
      return viewDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    } else if (calendarView === "week") {
      const weekEnd = new Date(rangeStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${rangeStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    } else {
      return viewDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
  };

  const allExpanded = Object.values(expandedModules).every(v => v);

  const chatRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isHoldingToTalkRef = useRef(false);
  const [inputMode, setInputMode] = useState<"type" | "talk">("type");
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(true);
  const [welcomeHeight, setWelcomeHeight] = useState(0);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const [isNativeApp, setIsNativeApp] = useState(false);

  useEffect(() => {
    const checkNative = () => {
      if (typeof window === "undefined") return;
      const native =
        navigator.userAgent.includes("helpem") ||
        (window as any).webkit?.messageHandlers?.native ||
        (window as any).__IS_HELPEM_APP__ ||
        (window as any).nativeBridge?.isNative;
      setIsNativeApp(Boolean(native));
    };
    checkNative();
    window.addEventListener("nativeBridgeInjected", checkNative);
    return () => {
      window.removeEventListener("nativeBridgeInjected", checkNative);
    };
  }, []);

  const headerOffsetPx = isNativeApp ? 0 : 60;
  const fixedStackRef = useRef<HTMLDivElement>(null);
  const [fixedStackHeight, setFixedStackHeight] = useState(0);
  const pendingHeightRef = useRef<number | null>(null);
  const fixedOffset = headerOffsetPx + fixedStackHeight;

  const measureFixedStackHeight = () => {
    if (!fixedStackRef.current) return;
    const newHeight = Math.ceil(fixedStackRef.current.getBoundingClientRect().height);
    
    // If user is holding talk button, defer the height update
    if (isHoldingToTalkRef.current) {
      pendingHeightRef.current = newHeight;
      return;
    }
    
    setFixedStackHeight(newHeight);
  };
  
  const applyPendingHeight = () => {
    if (pendingHeightRef.current !== null) {
      setFixedStackHeight(pendingHeightRef.current);
      pendingHeightRef.current = null;
    }
  };

  const measureTimersRef = useRef<number[]>([]);
  const scheduleMeasure = useCallback(() => {
    measureTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    measureTimersRef.current = [];
    const delays = [0, 100, 250, 500, 1000, 1500, 2000];
    delays.forEach((delay) => {
      const id = window.setTimeout(() => {
        measureFixedStackHeight();
      }, delay);
      measureTimersRef.current.push(id);
    });
  }, []);
  
  const scrollToChat = () => {
    // Scroll so chat appears directly below fixed buttons (140px from top)
    if (chatRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const containerTop = container.getBoundingClientRect().top;
      const elementTop = chatRef.current.getBoundingClientRect().top;
      const offsetPosition = elementTop - containerTop + container.scrollTop;
      container.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      return;
    }
  };
  const scrollToChatInstant = () => {
    if (chatRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const containerTop = container.getBoundingClientRect().top;
      const elementTop = chatRef.current.getBoundingClientRect().top;
      const offsetPosition = elementTop - containerTop + container.scrollTop;
      container.scrollTo({
        top: offsetPosition,
        behavior: "auto"
      });
    }
  };
  const scrollToChatSoon = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToChat);
    });
  };

  useLayoutEffect(() => {
    scheduleMeasure();
    return () => {
      measureTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, [scheduleMeasure]);

  useEffect(() => {
    if (!fixedStackRef.current) return;
    const element = fixedStackRef.current;
    scheduleMeasure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureFixedStackHeight);
      return () => {
        window.removeEventListener("resize", measureFixedStackHeight);
        measureTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      };
    }
    const resizeObserver = new ResizeObserver(measureFixedStackHeight);
    resizeObserver.observe(element);
    window.addEventListener("resize", measureFixedStackHeight);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureFixedStackHeight);
      measureTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, [scheduleMeasure]);

  useEffect(() => {
    if (!isWelcomeOpen) return;
    if (welcomeRef.current) {
      setWelcomeHeight(welcomeRef.current.scrollHeight);
    }
  }, [isWelcomeOpen]);

  useEffect(() => {
    if (!isWelcomeOpen) return;
    if (inputMode === "talk") return;
    const timer = window.setTimeout(() => {
      setIsWelcomeOpen(false);
    }, 7000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [inputMode, isWelcomeOpen]);

  useEffect(() => {
    scheduleMeasure();
    return () => {
      measureTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, [isWelcomeOpen, scheduleMeasure]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* ========== FIXED CONTAINER - STARTS AT HEADER, BLOCKS ALL CONTENT ========== */}
      <div 
        ref={fixedStackRef}
        style={{ 
          position: 'fixed',
          top: `${headerOffsetPx}px`,
          left: 0,
          right: 0,
          zIndex: 99999,
          backgroundColor: 'white',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          transition: 'box-shadow 0.2s ease',
          isolation: 'isolate'
        }}
      >
        {/* Alerts */}
        <div style={{ width: '100%', backgroundColor: 'white' }}>
          <UsageAlertBanner onHeightChange={scheduleMeasure} />
          <AlphaFeedbackBanner onHeightChange={scheduleMeasure} />
        </div>
        
        {/* Welcome Banner */}
        <div
          className="overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-in-out"
          style={{
            maxHeight: isWelcomeOpen ? `${welcomeHeight}px` : "0px",
            opacity: isWelcomeOpen ? 1 : 0,
            transform: isWelcomeOpen ? "translateY(0)" : "translateY(-4px)"
          }}
        >
          <div
            ref={welcomeRef}
            style={{ backgroundColor: 'white', paddingTop: '0px', paddingBottom: '4px', paddingLeft: '16px', paddingRight: '16px', width: '100%' }}
          >
            <div className="max-w-7xl mx-auto">
              <div className="bg-gradient-to-r from-brandBlue to-brandGreen rounded-lg p-2 text-white">
                <h1 className="text-sm font-bold">{greeting()}</h1>
                <p className="text-white/90 text-xs">{formattedDate}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Type/Hold to Talk Buttons */}
        <div style={{ backgroundColor: 'white', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '16px', paddingRight: '16px', borderBottom: '4px solid #9ca3af' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 p-2 rounded-lg border border-gray-200" style={{ backgroundColor: '#f9fafb' }}>
            <button
              onClick={() => {
                setInputMode("type");
                scrollToChatSoon();
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all ${
                inputMode === "type"
                  ? "bg-brandBlue text-white border border-brandBlue"
                  : "bg-white text-brandTextLight hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Type
            </button>
            
            <button
              onPointerDown={(event) => {
                event.preventDefault();
                if (isHoldingToTalkRef.current) return;
                isHoldingToTalkRef.current = true;
                event.currentTarget.setPointerCapture(event.pointerId);
                setInputMode("talk");
                // Scroll without smooth animation to avoid canceling press
                scrollToChatInstant();
              }}
              onPointerUp={(event) => {
                event.preventDefault();
                if (!isHoldingToTalkRef.current) return;
                isHoldingToTalkRef.current = false;
                event.currentTarget.releasePointerCapture(event.pointerId);
                setInputMode("type");
                // Apply any pending height changes now that user released button
                applyPendingHeight();
              }}
              onPointerCancel={(event) => {
                event.preventDefault();
                if (!isHoldingToTalkRef.current) return;
                isHoldingToTalkRef.current = false;
                event.currentTarget.releasePointerCapture(event.pointerId);
                setInputMode("type");
                // Apply any pending height changes now that user released button
                applyPendingHeight();
              }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all select-none touch-none ${
                inputMode === "talk"
                  ? "bg-red-500 text-white"
                  : "bg-white text-brandTextLight hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              Hold to talk
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========== SCROLLABLE CONTENT ========== */}
      <div
        ref={scrollContainerRef}
        style={{ 
          marginTop: `${fixedOffset}px`,
          height: `calc(100vh - ${fixedOffset}px)`,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          position: 'relative',
          zIndex: 0,
          backgroundColor: '#f9fafb'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 pb-4">
        <div className="space-y-2 md:space-y-4">
          <div ref={chatRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="order-1">
              <ChatInput onNavigateCalendar={setSelectedDate} inputMode={inputMode} />
            </div>

        <div className="space-y-4 md:space-y-6 order-2">
          {/* Expand/Collapse All Control */}
          <div className="flex justify-start">
            <button
              onClick={toggleAllModules}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              title={allExpanded ? "Collapse all modules" : "Expand all modules"}
            >
              <svg 
                className={`w-4 h-4 transition-transform ${allExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>{allExpanded ? "Collapse all" : "Expand all"}</span>
            </button>
          </div>
          
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <button
                onClick={() => toggleModule('today')}
                className="font-semibold flex items-center gap-2 text-brandText text-sm md:text-base hover:opacity-70 transition-opacity"
              >
                <span className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 text-xs md:text-sm">◷</span>
                {isViewingToday && calendarView === "day" ? "Today" : formattedViewDate()}
                <svg className={`w-4 h-4 transition-transform ${expandedModules.today ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                {/* Date navigation arrows */}
                {expandedModules.today && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={navigatePrev}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      aria-label={`Previous ${calendarView}`}
                    >
                      <svg className="w-4 h-4 text-brandTextLight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={navigateNext}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      aria-label={`Next ${calendarView}`}
                    >
                      <svg className="w-4 h-4 text-brandTextLight" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
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
            {/* View toggle buttons */}
            {expandedModules.today && (
              <div className="flex items-center gap-1 mb-3 border-b border-gray-200 pb-3">
                <button
                  onClick={() => setCalendarView("day")}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    calendarView === "day"
                      ? "bg-violet-100 text-violet-700"
                      : "text-brandTextLight hover:bg-gray-100"
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setCalendarView("week")}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    calendarView === "week"
                      ? "bg-violet-100 text-violet-700"
                      : "text-brandTextLight hover:bg-gray-100"
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCalendarView("month")}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    calendarView === "month"
                      ? "bg-violet-100 text-violet-700"
                      : "text-brandTextLight hover:bg-gray-100"
                  }`}
                >
                  Month
                </button>
              </div>
            )}
            {expandedModules.today && (
              <div className="space-y-2 max-h-[150px] md:max-h-[200px] overflow-y-auto">
                {viewDateAppointments.length > 0 ? (
                  viewDateAppointments.map((apt) => <AppointmentCard key={apt.id} appointment={apt} />)
                ) : (
                  <p className="text-sm text-brandTextLight text-center py-3 md:py-4">
                    No appointments {calendarView === "day" ? (isViewingToday ? "today" : "on this day") : `this ${calendarView}`}
                  </p>
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
                    onClick={() => setPriorityFilter(p.key)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-all
                      ${priorityFilter === p.key ? `${p.color} ${p.activeText}` : `${p.inactiveBg} ${p.inactiveText} hover:opacity-80`}`}
                  >
                    {p.label}
                  </button>
                ))}
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
        </div>
      </div>
    </div>
  );
}
