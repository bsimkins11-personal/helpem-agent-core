"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { Todo, Priority } from "@/types/todo";
import { Habit } from "@/types/habit";
import { Appointment } from "@/types/appointment";
import { Routine, RoutineItem } from "@/types/routine";
import { Grocery } from "@/types/grocery";

// No seed data - all users start with clean slate for UAT/production

// Export types for external use
export type LifeContextType = {
  todos: Todo[];
  habits: Habit[];
  appointments: Appointment[];
  routines: Routine[];
  groceries: Grocery[];
  addTodo: (todo: Todo) => void;
  completeTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  updateTodoPriority: (id: string, priority: Priority) => void;
  moveTodoToGroceries: (id: string) => void;
  moveTodoToAppointment: (id: string) => void;
  addHabit: (habit: Habit) => void;
  logHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  addAppointment: (appt: Appointment) => void;
  deleteAppointment: (id: string) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  addRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
  addRoutineItem: (routineId: string, item: RoutineItem) => void;
  completeRoutineItem: (routineId: string, itemId: string) => void;
  clearCompletedRoutineItems: (routineId: string) => void;
  moveRoutineItemToTodos: (routineId: string, itemId: string, title: string) => void;
  addGrocery: (grocery: Grocery) => void;
  completeGrocery: (id: string) => void;
  deleteGrocery: (id: string) => void;
  updateGrocery: (id: string, updates: Partial<Grocery>) => void;
  clearCompletedGroceries: () => void;
  moveGroceryToTodos: (id: string) => void;
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
  const [groceries, setGroceries] = useState<Grocery[]>([]);
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
        console.log('🔄 Fetching appointments from /api/appointments...');
        const apptsRes = await fetch('/api/appointments');
        console.log('📡 Appointments API response status:', apptsRes.status, apptsRes.statusText);
        
        if (apptsRes.ok) {
          const apptsData = await apptsRes.json();
          console.log('📡 Appointments API response data:', apptsData);
          
          if (apptsData.appointments && apptsData.appointments.length > 0) {
            const dbAppointments: Appointment[] = apptsData.appointments.map((a: any) => ({
              id: a.id,
              title: a.title,
              withWhom: a.with_whom ?? null,
              datetime: new Date(a.datetime),
              durationMinutes: typeof a.duration_minutes === "number" ? a.duration_minutes : 30,
              createdAt: new Date(a.created_at),
            }));
            setAppointments(dbAppointments);
            console.log(`✅ Loaded ${dbAppointments.length} appointments from database`);
            dbAppointments.forEach((apt, idx) => {
              console.log(`   [${idx}] ${apt.title} at ${new Date(apt.datetime).toISOString()}`);
            });
          } else {
            console.log('✅ No appointments in database - starting fresh with empty state');
          }
        } else {
          console.error('❌ Failed to load appointments, status:', apptsRes.status);
        }

        // Load habits from database
        console.log('🔄 Fetching habits from /api/habits...');
        const habitsRes = await fetch('/api/habits');
        console.log('📡 Habits API response status:', habitsRes.status, habitsRes.statusText);
        
        if (habitsRes.ok) {
          const habitsData = await habitsRes.json();
          console.log('📡 Habits API response data:', habitsData);
          
          if (habitsData.habits && habitsData.habits.length > 0) {
            const dbHabits: Habit[] = habitsData.habits.map((h: any) => ({
              id: h.id,
              title: h.title,
              frequency: h.frequency || 'daily',
              daysOfWeek: h.days_of_week || [],
              completions: Array.isArray(h.completions) ? h.completions : [],
              createdAt: new Date(h.created_at),
            }));
            setHabits(dbHabits);
            console.log(`✅ Loaded ${dbHabits.length} habits from database`);
          } else {
            console.log('✅ No habits in database - starting fresh with empty state');
          }
        } else {
          console.error('❌ Failed to load habits, status:', habitsRes.status);
        }

        // Load groceries from database
        console.log('🔄 Fetching groceries from /api/groceries...');
        const groceriesRes = await fetch('/api/groceries');
        console.log('📡 Groceries API response status:', groceriesRes.status, groceriesRes.statusText);
        
        if (groceriesRes.ok) {
          const groceriesData = await groceriesRes.json();
          console.log('📡 Groceries API response data:', groceriesData);
          
          if (groceriesData.groceries && groceriesData.groceries.length > 0) {
            const dbGroceries: Grocery[] = groceriesData.groceries.map((g: any) => ({
              id: g.id,
              content: g.content,
              completed: g.completed || false,
              completedAt: g.completed_at ? new Date(g.completed_at) : undefined,
              createdAt: new Date(g.created_at),
            }));
            setGroceries(dbGroceries);
            console.log(`✅ Loaded ${dbGroceries.length} grocery items from database`);
          } else {
            console.log('✅ No groceries in database - starting fresh with empty state');
          }
        } else {
          console.error('❌ Failed to load groceries, status:', groceriesRes.status);
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
    
    // Cancel notification when todo is completed (iOS only)
    if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.native) {
      window.webkit.messageHandlers.native.postMessage({
        action: "cancelNotification",
        id: id,
      });
    }
  }, []);

  const updateTodo = useCallback(async (id: string, updates: Partial<Todo>) => {
    // Optimistic update
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    
    // Persist to database
    try {
      const response = await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      
      if (!response.ok) {
        console.error('❌ Failed to update todo in database');
      } else {
        console.log('✅ Todo updated in database');
      }
    } catch (error) {
      console.error('❌ Error updating todo:', error);
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    // Optimistic update - remove from UI immediately
    setTodos(prev => prev.filter(t => t.id !== id));
    
    // Cancel notification when todo is deleted (iOS only)
    if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.native) {
      window.webkit.messageHandlers.native.postMessage({
        action: "cancelNotification",
        id: id,
      });
    }
    
    // Persist to database
    try {
      const response = await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      if (response.ok || response.status === 404) {
        // 404 means it was already deleted (likely cleared elsewhere)
        console.log('✅ Todo deleted from database');
      } else {
        console.error('❌ Failed to delete todo from database');
      }
    } catch (error) {
      console.error('❌ Error deleting todo:', error);
    }
  }, []);

  const updateTodoPriority = useCallback(async (id: string, priority: Priority) => {
    // Optimistic update
    setTodos(prev => prev.map(t => t.id === id ? { ...t, priority } : t));

    // Persist to database
    try {
      const response = await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, priority }),
      });

      if (!response.ok) {
        console.error('❌ Failed to update todo priority in database');
      } else {
        console.log('✅ Todo priority updated in database');
      }
    } catch (error) {
      console.error('❌ Error updating todo priority:', error);
    }
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

  const addHabit = useCallback(async (habit: Habit) => {
    // Optimistic update - add to UI immediately
    setHabits(prev => [...prev, habit]);
    
    // Persist to database
    try {
      const response = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: habit.title,
          frequency: habit.frequency || "daily",
          daysOfWeek: habit.daysOfWeek || [],
          completions: habit.completions || [],
        }),
      });
      
      if (!response.ok) {
        console.error('❌ Failed to save habit to database (but added locally)');
      } else {
        console.log('✅ Habit saved to database successfully');
      }
    } catch (error) {
      console.error('❌ Error saving habit to database (saved locally):', error);
    }
  }, []);

  const logHabit = useCallback((id: string) => {
    setHabits(prev => prev.map(h => 
      h.id === id ? { ...h, completions: [...h.completions, { date: new Date() }] } : h
    ));
  }, []);

  const updateHabit = useCallback(async (id: string, updates: Partial<Habit>) => {
    // Optimistic update
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    
    // Persist to database
    try {
      const response = await fetch("/api/habits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      
      if (!response.ok) {
        console.error('❌ Failed to update habit in database');
      } else {
        console.log('✅ Habit updated in database');
      }
    } catch (error) {
      console.error('❌ Error updating habit:', error);
    }
  }, []);

  const deleteHabit = useCallback(async (id: string) => {
    // Optimistic update - remove from UI immediately
    setHabits(prev => prev.filter(h => h.id !== id));
    
    // Persist to database
    try {
      const response = await fetch(`/api/habits?id=${id}`, { method: 'DELETE' });
      if (response.status === 404) {
        // 404 means item doesn't exist - treat as successful deletion
        console.log('⚠️ Habit not found in database (already deleted)');
        console.log('✅ Treating 404 as successful deletion');
      } else if (!response.ok) {
        console.error('❌ Failed to delete habit from database');
      } else {
        console.log('✅ Habit deleted from database');
      }
    } catch (error) {
      console.error('❌ Error deleting habit:', error);
    }
  }, []);

  const addAppointment = useCallback((appt: Appointment) => {
    console.log('🚨 ========================================');
    console.log('🚨 LifeStore: addAppointment CALLED');
    console.log('🚨 ========================================');
    console.log('📅 Input appointment object:', {
      id: appt.id,
      title: appt.title,
      datetime: appt.datetime,
      datetimeType: typeof appt.datetime,
      datetimeISO: appt.datetime instanceof Date ? appt.datetime.toISOString() : 'NOT A DATE OBJECT',
      isValidDate: appt.datetime instanceof Date && !isNaN(appt.datetime.getTime()),
      createdAt: appt.createdAt,
    });
    
    // CRITICAL: Ensure datetime is a Date object
    const normalizedAppt = {
      ...appt,
      datetime: appt.datetime instanceof Date ? appt.datetime : new Date(appt.datetime),
      createdAt: appt.createdAt instanceof Date ? appt.createdAt : new Date(appt.createdAt),
      durationMinutes: typeof appt.durationMinutes === "number" ? appt.durationMinutes : 30,
      withWhom: appt.withWhom ?? null,
    };
    
    console.log('📅 Normalized appointment:', {
      id: normalizedAppt.id,
      title: normalizedAppt.title,
      datetime: normalizedAppt.datetime.toISOString(),
      dateOnly: normalizedAppt.datetime.toLocaleDateString(),
      timeOnly: normalizedAppt.datetime.toLocaleTimeString(),
    });
    
    setAppointments(prev => {
      console.log('📅 LifeStore: BEFORE setState');
      console.log('   Previous appointments array:', prev);
      console.log('   Previous count:', prev.length);
      
      const newAppointments = [...prev, normalizedAppt];
      
      console.log('📅 LifeStore: AFTER creating new array');
      console.log('   New appointments array:', newAppointments);
      console.log('   New count:', newAppointments.length);
      console.log('   Just added:', normalizedAppt.title);
      console.log('🚨 ========================================');
      console.log('🚨 LifeStore: addAppointment COMPLETE');
      console.log('🚨 Returning new array with', newAppointments.length, 'appointments');
      console.log('🚨 ========================================');
      
      return newAppointments;
    });
    
    // Force log after state update
    setTimeout(() => {
      console.log('⏰ 1 second later - checking if state persisted...');
    }, 1000);
  }, []);

  const moveTodoToAppointment = useCallback((id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const now = new Date();
    const fallback = new Date(now);
    fallback.setHours(fallback.getHours() + 1, 0, 0, 0);

    const datetime = todo.dueDate || todo.reminderTime || fallback;
    const appointmentId = uuidv4();

    addAppointment({
      id: appointmentId,
      title: todo.title,
      withWhom: null,
      topic: null,
      location: null,
      datetime,
      durationMinutes: 30,
      createdAt: now,
    });

    fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: todo.title,
        withWhom: null,
        datetime: datetime.toISOString(),
        durationMinutes: 30,
      }),
    }).catch((error) => {
      console.error("❌ Error creating appointment from todo:", error);
    });

    deleteTodo(id);
  }, [todos, addAppointment, deleteTodo]);

  const updateAppointment = useCallback(async (id: string, updates: Partial<Appointment>) => {
    // Optimistic update
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    
    // Persist to database
    try {
      const response = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      
      if (!response.ok) {
        console.error('❌ Failed to update appointment in database');
      } else {
        console.log('✅ Appointment updated in database');
      }
    } catch (error) {
      console.error('❌ Error updating appointment:', error);
    }
  }, []);

  const deleteAppointment = useCallback(async (id: string) => {
    console.log(`🗑️ deleteAppointment called with ID: ${id}`);
    
    // Optimistic update - remove from UI immediately
    setAppointments(prev => {
      const appointmentToDelete = prev.find(a => a.id === id);
      console.log(`📍 Appointment in local state:`, appointmentToDelete);
      return prev.filter(a => a.id !== id);
    });
    
    // Cancel notification when appointment is deleted (iOS only)
    if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.native) {
      window.webkit.messageHandlers.native.postMessage({
        action: "cancelNotification",
        id: `${id}-reminder`,
      });
    }
    
    // Persist to database
    try {
      const response = await fetch(`/api/appointments?id=${id}`, { method: 'DELETE' });
      
      if (response.status === 404) {
        // 404 means item doesn't exist - this is actually fine for a delete operation
        console.log(`⚠️ Appointment ${id} not found in database (already deleted or never saved)`);
        console.log('✅ Treating 404 as successful deletion');
      } else if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to delete appointment from database: ${response.status} ${errorText}`);
      } else {
        console.log('✅ Appointment deleted from database');
      }
    } catch (error) {
      console.error('❌ Error deleting appointment:', error);
    }
  }, []);

  const addRoutine = useCallback((routine: Routine) => {
    setRoutines(prev => [...prev, routine]);
  }, []);

  const deleteRoutine = useCallback((id: string) => {
    setRoutines(prev => prev.filter(r => r.id !== id));
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

  const addGrocery = useCallback((grocery: Grocery) => {
    setGroceries(prev => [...prev, grocery]);
  }, []);

  const completeGrocery = useCallback(async (id: string) => {
    // Optimistic update
    setGroceries(prev => prev.map(g => 
      g.id === id ? { ...g, completed: true, completedAt: new Date() } : g
    ));
    
    // Persist to database
    try {
      const response = await fetch("/api/groceries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: true }),
      });
      
      if (!response.ok) {
        console.error('❌ Failed to update grocery in database');
      } else {
        console.log('✅ Grocery updated in database');
      }
    } catch (error) {
      console.error('❌ Error updating grocery:', error);
    }
  }, []);

  const updateGrocery = useCallback(async (id: string, updates: Partial<Grocery>) => {
    // Optimistic update
    setGroceries(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    
    // Persist to database
    try {
      const response = await fetch("/api/groceries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      
      if (!response.ok) {
        console.error('❌ Failed to update grocery in database');
      } else {
        console.log('✅ Grocery updated in database');
      }
    } catch (error) {
      console.error('❌ Error updating grocery:', error);
    }
  }, []);

  const deleteGrocery = useCallback(async (id: string) => {
    // Optimistic update - remove from UI immediately
    setGroceries(prev => prev.filter(g => g.id !== id));
    
    // Persist to database
    try {
      const response = await fetch(`/api/groceries?id=${id}`, { method: 'DELETE' });
      if (response.status === 404) {
        // 404 means item doesn't exist - treat as successful deletion
        console.log('⚠️ Grocery not found in database (already deleted)');
        console.log('✅ Treating 404 as successful deletion');
      } else if (!response.ok) {
        console.error('❌ Failed to delete grocery from database');
      } else {
        console.log('✅ Grocery deleted from database');
      }
    } catch (error) {
      console.error('❌ Error deleting grocery:', error);
    }
  }, []);

  const clearCompletedGroceries = useCallback(async () => {
    // Get IDs of completed groceries
    const completedIds = groceries.filter(g => g.completed).map(g => g.id);
    
    // Optimistic update - remove completed items
    setGroceries(prev => prev.filter(g => !g.completed));
    
    // Delete from database
    try {
      await Promise.all(
        completedIds.map(id => 
          fetch(`/api/groceries?id=${id}`, { method: 'DELETE' })
        )
      );
      console.log(`✅ Cleared ${completedIds.length} completed groceries from database`);
    } catch (error) {
      console.error('❌ Error clearing completed groceries:', error);
    }
  }, [groceries]);

  const moveGroceryToTodos = useCallback((id: string) => {
    const grocery = groceries.find(g => g.id === id);
    if (!grocery) return;

    const now = new Date();
    addTodo({
      id: uuidv4(),
      title: grocery.content,
      priority: "medium",
      createdAt: now,
    });

    deleteGrocery(id);
  }, [groceries, addTodo, deleteGrocery]);

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
    setGroceries([]);
    console.log('✅ All data cleared from app');
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<LifeContextType>(() => ({
    todos,
    habits,
    appointments,
    routines,
    groceries,
    addTodo,
    completeTodo,
    deleteTodo,
    updateTodo,
    updateTodoPriority,
    moveTodoToGroceries,
    moveTodoToAppointment,
    addHabit,
    logHabit,
    deleteHabit,
    updateHabit,
    addAppointment,
    deleteAppointment,
    updateAppointment,
    addRoutine,
    deleteRoutine,
    addRoutineItem,
    completeRoutineItem,
    clearCompletedRoutineItems,
    moveRoutineItemToTodos,
    addGrocery,
    completeGrocery,
    deleteGrocery,
    updateGrocery,
    clearCompletedGroceries,
    moveGroceryToTodos,
    clearAllData,
  }), [todos, habits, appointments, routines, groceries, addTodo, completeTodo, deleteTodo, updateTodo, updateTodoPriority, moveTodoToGroceries, moveTodoToAppointment, addHabit, logHabit, deleteHabit, updateHabit, addAppointment, deleteAppointment, updateAppointment, addRoutine, deleteRoutine, addRoutineItem, completeRoutineItem, clearCompletedRoutineItems, moveRoutineItemToTodos, addGrocery, completeGrocery, deleteGrocery, updateGrocery, clearCompletedGroceries, moveGroceryToTodos, clearAllData]);

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
