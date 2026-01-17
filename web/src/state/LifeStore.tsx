"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { Todo, Priority } from "@/types/todo";
import { Habit } from "@/types/habit";
import { Appointment } from "@/types/appointment";
import { Routine, RoutineItem } from "@/types/routine";

// No seed data - all users start with clean slate for UAT/production

// Export types for external use
export type LifeContextType = {
  todos: Todo[];
  habits: Habit[];
  appointments: Appointment[];
  routines: Routine[];
  addTodo: (todo: Todo) => void;
  completeTodo: (id: string) => void;
  updateTodoPriority: (id: string, priority: Priority) => void;
  moveTodoToGroceries: (id: string) => void;
  addHabit: (habit: Habit) => void;
  logHabit: (id: string) => void;
  addAppointment: (appt: Appointment) => void;
  deleteAppointment: (id: string) => void;
  addRoutine: (routine: Routine) => void;
  addRoutineItem: (routineId: string, item: RoutineItem) => void;
  completeRoutineItem: (routineId: string, itemId: string) => void;
  clearCompletedRoutineItems: (routineId: string) => void;
  moveRoutineItemToTodos: (routineId: string, itemId: string, title: string) => void;
  clearAllData: () => void;
};

const LifeContext = createContext<LifeContextType | null>(null);

interface LifeProviderProps {
  children: ReactNode;
}

export function LifeProvider({ children }: LifeProviderProps) {
  // Always start with empty state - we'll load seed data only if needed
  const [todos, setTodos] = useState<Todo[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load data from database or seed data on mount
  useEffect(() => {
    if (dataLoaded) return;
    
    const loadData = async () => {
      // Check authentication status (allow time for iOS to inject token)
      // Try multiple times with increasing delays
      let isAuthenticated = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, attempts === 0 ? 50 : 100));
        
        const hasCookie = typeof document !== 'undefined' && document.cookie.includes("session_token");
        const hasNativeToken = typeof window !== 'undefined' && !!(window as any).__nativeSessionToken;
        isAuthenticated = hasCookie || hasNativeToken;
        
        console.log(`🔐 Authentication check (attempt ${attempts + 1}/${maxAttempts}):`, { 
          isAuthenticated,
          hasCookie,
          hasNativeToken,
          cookies: typeof document !== 'undefined' ? document.cookie : 'N/A',
          nativeToken: typeof window !== 'undefined' ? (window as any).__nativeSessionToken?.substring(0, 20) + '...' : 'N/A'
        });
        
        if (isAuthenticated) {
          console.log('✅ Authenticated user detected!');
          break;
        }
        
        attempts++;
      }
      
      if (!isAuthenticated) {
        // No authentication - start with empty state (no demo data in UAT/production)
        console.log('📋 No authentication found - starting with empty state');
        setDataLoaded(true);
        return;
      }
      
      // Authenticated user - load from database
      try {
        console.log('🔄 Loading user data from database...');
        
        // Load todos from database
        const todosRes = await fetch('/api/todos');
        if (todosRes.ok) {
          const todosData = await todosRes.json();
          if (todosData.todos && todosData.todos.length > 0) {
            const dbTodos: Todo[] = todosData.todos.map((t: any) => ({
              id: t.id,
              title: t.title,
              priority: t.priority,
              dueDate: t.due_date ? new Date(t.due_date) : undefined,
              reminderTime: t.reminder_time ? new Date(t.reminder_time) : undefined,
              completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
              createdAt: new Date(t.created_at),
            }));
            setTodos(dbTodos);
            console.log(`✅ Loaded ${dbTodos.length} todos from database`);
          } else {
            console.log('✅ No todos in database - starting fresh with empty state');
          }
        }

        // Load appointments from database
        const apptsRes = await fetch('/api/appointments');
        if (apptsRes.ok) {
          const apptsData = await apptsRes.json();
          if (apptsData.appointments && apptsData.appointments.length > 0) {
            const dbAppointments: Appointment[] = apptsData.appointments.map((a: any) => ({
              id: a.id,
              title: a.title,
              datetime: new Date(a.datetime),
              createdAt: new Date(a.created_at),
            }));
            setAppointments(dbAppointments);
            console.log(`✅ Loaded ${dbAppointments.length} appointments from database`);
          } else {
            console.log('✅ No appointments in database - starting fresh with empty state');
          }
        }

        setDataLoaded(true);
      } catch (error) {
        console.error("❌ Failed to load data from database:", error);
        setDataLoaded(true);
      }
    };

    loadData();
  }, [dataLoaded]);

  const addTodo = useCallback((todo: Todo) => {
    setTodos(prev => [...prev, todo]);
  }, []);

  const completeTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completedAt: new Date() } : t));
  }, []);

  const updateTodoPriority = useCallback((id: string, priority: Priority) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, priority } : t));
  }, []);

  const sendFeedback = useCallback((text: string, to: "todo" | "grocery", from?: "todo" | "grocery") => {
    if (typeof window === "undefined") return;
    const payload = { text, to, from };
    void fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Best-effort only; ignore network failures.
    });
  }, []);

  const addItemsToGroceryRoutine = useCallback((items: string[]) => {
    const now = new Date();
    setRoutines(prev => {
      const existing = prev.find(r => r.category === "groceries");
      if (!existing) {
        const newRoutine: Routine = {
          id: uuidv4(),
          category: "groceries",
          title: "Groceries",
          createdAt: now,
          items: items.map(content => ({
            id: uuidv4(),
            content,
            addedAt: now,
          })),
        };
        return [...prev, newRoutine];
      }

      return prev.map(r =>
        r.id === existing.id
          ? {
              ...r,
              items: [
                ...r.items,
                ...items.map(content => ({
                  id: uuidv4(),
                  content,
                  addedAt: now,
                })),
              ],
            }
          : r
      );
    });
  }, []);

  const moveTodoToGroceries = useCallback((id: string) => {
    setTodos(prev => {
      const todo = prev.find(t => t.id === id);
      if (!todo) return prev;
      addItemsToGroceryRoutine([todo.title]);
      sendFeedback(todo.title, "grocery", "todo");
      return prev.filter(t => t.id !== id);
    });
  }, [addItemsToGroceryRoutine, sendFeedback]);

  const addHabit = useCallback((habit: Habit) => {
    setHabits(prev => [...prev, habit]);
  }, []);

  const logHabit = useCallback((id: string) => {
    setHabits(prev => prev.map(h => 
      h.id === id ? { ...h, completions: [...h.completions, { date: new Date() }] } : h
    ));
  }, []);

  const addAppointment = useCallback((appt: Appointment) => {
    setAppointments(prev => [...prev, appt]);
  }, []);

  const deleteAppointment = useCallback((id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  }, []);

  const addRoutine = useCallback((routine: Routine) => {
    setRoutines(prev => [...prev, routine]);
  }, []);

  const addRoutineItem = useCallback((routineId: string, item: RoutineItem) => {
    setRoutines(prev => prev.map(r => 
      r.id === routineId ? { ...r, items: [...r.items, item] } : r
    ));
  }, []);

  const completeRoutineItem = useCallback((routineId: string, itemId: string) => {
    setRoutines(prev => prev.map(r => 
      r.id === routineId 
        ? { 
            ...r, 
            items: r.items.map(item => 
              item.id === itemId 
                ? { ...item, completed: true, completedAt: new Date() } 
                : item
            ) 
          } 
        : r
    ));
  }, []);

  const clearCompletedRoutineItems = useCallback((routineId: string) => {
    setRoutines(prev => prev.map(r => 
      r.id === routineId 
        ? { ...r, items: r.items.filter(item => !item.completed) } 
        : r
    ));
  }, []);

  const moveRoutineItemToTodos = useCallback((routineId: string, itemId: string, title: string) => {
    const now = new Date();
    setRoutines(prev =>
      prev.map(r =>
        r.id === routineId
          ? { ...r, items: r.items.filter(item => item.id !== itemId) }
          : r
      )
    );

    setTodos(prev => [
      ...prev,
      {
        id: uuidv4(),
        title,
        priority: "medium",
        createdAt: now,
      },
    ]);
    sendFeedback(title, "todo", "grocery");
  }, [sendFeedback]);

  const clearAllData = useCallback(async () => {
    console.log('🗑️ Clearing all app data (database + local state)...');
    
    try {
      // Clear from database first
      const response = await fetch('/api/clear-all-data', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Database cleared:', result.deleted);
      } else {
        console.warn('⚠️ Database clear failed, clearing local state only');
      }
    } catch (error) {
      console.error('❌ Error clearing database:', error);
      console.log('⚠️ Continuing to clear local state...');
    }
    
    // Clear local state
    setTodos([]);
    setHabits([]);
    setAppointments([]);
    setRoutines([]);
    console.log('✅ All data cleared from app');
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<LifeContextType>(() => ({
    todos,
    habits,
    appointments,
    routines,
    addTodo,
    completeTodo,
    updateTodoPriority,
    moveTodoToGroceries,
    addHabit,
    logHabit,
    addAppointment,
    deleteAppointment,
    addRoutine,
    addRoutineItem,
    completeRoutineItem,
    clearCompletedRoutineItems,
    moveRoutineItemToTodos,
    clearAllData,
  }), [todos, habits, appointments, routines, addTodo, completeTodo, updateTodoPriority, moveTodoToGroceries, addHabit, logHabit, addAppointment, deleteAppointment, addRoutine, addRoutineItem, completeRoutineItem, clearCompletedRoutineItems, moveRoutineItemToTodos, clearAllData]);

  return (
    <LifeContext.Provider value={value}>
      {children}
    </LifeContext.Provider>
  );
}

export function useLife(): LifeContextType {
  const ctx = useContext(LifeContext);
  if (!ctx) throw new Error("useLife must be used inside LifeProvider");
  return ctx;
}
