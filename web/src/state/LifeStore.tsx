"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import { Todo, Priority } from "@/types/todo";
import { Habit } from "@/types/habit";
import { Appointment } from "@/types/appointment";
import { Routine, RoutineItem } from "@/types/routine";

// Helper to create dates relative to today
const daysFromNow = (days: number, hour: number = 9, minute: number = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
};

// Seed data - computed once at module load
const createSeedData = () => {
  const now = new Date();
  
  const seedAppointments: Appointment[] = [
    { id: "apt-1", title: "Morning standup", datetime: daysFromNow(0, 9, 30), createdAt: now },
    { id: "apt-2", title: "Coffee with Sarah", datetime: daysFromNow(0, 11, 0), createdAt: now },
    { id: "apt-3", title: "Lunch with mentor", datetime: daysFromNow(0, 12, 30), createdAt: now },
    { id: "apt-4", title: "Team lunch", datetime: daysFromNow(1, 12, 30), createdAt: now },
    { id: "apt-5", title: "Call with Mike about project", datetime: daysFromNow(1, 15, 0), createdAt: now },
    { id: "apt-6", title: "Dentist checkup", datetime: daysFromNow(3, 14, 0), createdAt: now },
    { id: "apt-7", title: "Networking event downtown", datetime: daysFromNow(4, 18, 0), createdAt: now },
    { id: "apt-8", title: "Car service appointment", datetime: daysFromNow(5, 8, 0), createdAt: now },
    { id: "apt-9", title: "Flight to Austin - SFO → AUS", datetime: daysFromNow(10, 7, 30), createdAt: now },
    { id: "apt-10", title: "SXSW Conference - Day 1", datetime: daysFromNow(10, 10, 0), createdAt: now },
    { id: "apt-11", title: "Dinner with Austin team", datetime: daysFromNow(10, 19, 0), createdAt: now },
    { id: "apt-12", title: "SXSW Conference - Day 2", datetime: daysFromNow(11, 9, 0), createdAt: now },
    { id: "apt-13", title: "Flight home - AUS → SFO", datetime: daysFromNow(12, 16, 0), createdAt: now },
    { id: "apt-14", title: "1:1 with manager", datetime: daysFromNow(2, 10, 0), createdAt: now },
    { id: "apt-15", title: "Catch up call with college friend", datetime: daysFromNow(6, 17, 0), createdAt: now },
    { id: "apt-16", title: "Interview - Product Designer", datetime: daysFromNow(3, 11, 0), createdAt: now },
    { id: "apt-17", title: "Doctor - annual physical", datetime: daysFromNow(7, 10, 0), createdAt: now },
    { id: "apt-18", title: "Physical therapy session", datetime: daysFromNow(2, 16, 0), createdAt: now },
    { id: "apt-19", title: "Valentine's Day dinner", datetime: new Date(2026, 1, 14, 19, 0), createdAt: now },
    { id: "apt-20", title: "Mom's birthday", datetime: new Date(2026, 2, 20, 18, 0), createdAt: now },
    { id: "apt-21", title: "Tax deadline", datetime: new Date(2026, 3, 15, 17, 0), createdAt: now },
    { id: "apt-22", title: "NYC trip - flight out", datetime: new Date(2026, 4, 15, 8, 0), createdAt: now },
    { id: "apt-23", title: "NYC trip - flight back", datetime: new Date(2026, 4, 19, 18, 0), createdAt: now },
  ];

  const seedTodos: Todo[] = [
    { id: "todo-1", title: "Pick up prescription", priority: "high", dueDate: daysFromNow(0), createdAt: now },
    { id: "todo-2", title: "Call insurance about claim", priority: "high", dueDate: daysFromNow(0), createdAt: now },
    { id: "todo-3", title: "Submit expense report", priority: "high", dueDate: daysFromNow(1), createdAt: now },
    { id: "todo-4", title: "Prepare slides for Monday presentation", priority: "high", dueDate: daysFromNow(3), createdAt: now },
    { id: "todo-5", title: "Reply to Sarah's email", priority: "medium", createdAt: now },
    { id: "todo-6", title: "Book hotel for Austin trip", priority: "medium", dueDate: daysFromNow(5), createdAt: now },
    { id: "todo-7", title: "Follow up with recruiter about role", priority: "medium", dueDate: daysFromNow(2), createdAt: now },
    { id: "todo-8", title: "Schedule B12 shot", priority: "medium", dueDate: daysFromNow(1), createdAt: now },
    { id: "todo-9", title: "Review Q1 budget proposal", priority: "medium", dueDate: daysFromNow(4), createdAt: now },
    { id: "todo-10", title: "Confirm car rental reservation", priority: "medium", dueDate: daysFromNow(8), createdAt: now },
    { id: "todo-11", title: "Send thank you note to Mike", priority: "medium", createdAt: now },
    { id: "todo-12", title: "Order new vitamins", priority: "medium", createdAt: now },
    { id: "todo-13", title: "Buy groceries", priority: "medium", createdAt: now },
    { id: "todo-14", title: "Pack for SXSW", priority: "low", dueDate: daysFromNow(9), createdAt: now },
    { id: "todo-15", title: "Download offline maps for Austin", priority: "low", createdAt: now },
    { id: "todo-16", title: "Connect with Lisa on LinkedIn", priority: "low", createdAt: now },
    { id: "todo-17", title: "Schedule coffee with new team member", priority: "low", createdAt: now },
    { id: "todo-18", title: "Send birthday card to Dad", priority: "low", dueDate: daysFromNow(14), createdAt: now },
    { id: "todo-19", title: "Renew gym membership", priority: "low", dueDate: daysFromNow(5), createdAt: now },
    { id: "todo-20", title: "Book massage appointment", priority: "low", createdAt: now },
    { id: "todo-21", title: "Fix leaky faucet", priority: "low", createdAt: now },
    { id: "todo-22", title: "Update emergency contacts", priority: "low", createdAt: now },
    { id: "todo-23", title: "Research new phone plans", priority: "low", createdAt: now },
  ];

  const seedHabits: Habit[] = [
    { id: "habit-1", title: "Take daily vitamins", frequency: "daily", createdAt: now, completions: [{ date: daysFromNow(-5) }, { date: daysFromNow(-4) }, { date: daysFromNow(-3) }, { date: daysFromNow(-2) }, { date: daysFromNow(-1) }] },
    { id: "habit-2", title: "Morning workout", frequency: "daily", createdAt: now, completions: [{ date: daysFromNow(-3) }, { date: daysFromNow(-2) }, { date: daysFromNow(-1) }] },
    { id: "habit-3", title: "Drink 8 glasses of water", frequency: "daily", createdAt: now, completions: [{ date: daysFromNow(-2) }, { date: daysFromNow(-1) }] },
    { id: "habit-4", title: "10 min meditation", frequency: "daily", createdAt: now, completions: [{ date: daysFromNow(-6) }, { date: daysFromNow(-5) }, { date: daysFromNow(-4) }, { date: daysFromNow(-3) }, { date: daysFromNow(-2) }, { date: daysFromNow(-1) }] },
    { id: "habit-5", title: "Stretch for 10 minutes", frequency: "daily", createdAt: now, completions: [{ date: daysFromNow(-1) }] },
    { id: "habit-6", title: "Read for 30 minutes", frequency: "daily", createdAt: now, completions: [{ date: daysFromNow(-4) }, { date: daysFromNow(-2) }] },
    { id: "habit-7", title: "Practice Spanish on Duolingo", frequency: "daily", createdAt: now, completions: [{ date: daysFromNow(-3) }, { date: daysFromNow(-2) }, { date: daysFromNow(-1) }] },
    { id: "habit-8", title: "Journal before bed", frequency: "daily", createdAt: now, completions: [{ date: daysFromNow(-1) }] },
    { id: "habit-9", title: "Weekly meal prep", frequency: "weekly", createdAt: now, completions: [{ date: daysFromNow(-7) }] },
    { id: "habit-10", title: "B12 injection", frequency: "weekly", createdAt: now, completions: [{ date: daysFromNow(-7) }] },
    { id: "habit-11", title: "Call parents", frequency: "weekly", createdAt: now, completions: [{ date: daysFromNow(-5) }] },
    { id: "habit-12", title: "Review weekly goals", frequency: "weekly", createdAt: now, completions: [{ date: daysFromNow(-7) }] },
  ];

  const seedRoutines: Routine[] = [
    {
      id: "routine-1",
      category: "groceries",
      title: "Groceries",
      createdAt: now,
      items: [
        { id: "item-1", content: "Milk", addedAt: daysFromNow(-2) },
        { id: "item-2", content: "Eggs", addedAt: daysFromNow(-1) },
        { id: "item-3", content: "Bread", addedAt: daysFromNow(-1) },
      ],
    },
  ];

  return { seedAppointments, seedTodos, seedHabits, seedRoutines };
};

// Create seed data once
const { seedAppointments, seedTodos, seedHabits, seedRoutines } = createSeedData();

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
};

const LifeContext = createContext<LifeContextType | null>(null);

interface LifeProviderProps {
  children: ReactNode;
}

export function LifeProvider({ children }: LifeProviderProps) {
  // Check if user is authenticated (has session token from cookie OR iOS native)
  const isAuthenticated = typeof window !== 'undefined' && (
    document.cookie.includes("session_token") || 
    !!(window as any).__nativeSessionToken
  );
  
  // Authenticated users start with empty arrays, demo users get seed data
  const [todos, setTodos] = useState<Todo[]>(isAuthenticated ? [] : seedTodos);
  const [habits, setHabits] = useState<Habit[]>(isAuthenticated ? [] : seedHabits);
  const [appointments, setAppointments] = useState<Appointment[]>(isAuthenticated ? [] : seedAppointments);
  const [routines, setRoutines] = useState<Routine[]>(isAuthenticated ? [] : seedRoutines);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load data from database on mount (only for authenticated users)
  useEffect(() => {
    if (dataLoaded || !isAuthenticated) {
      setDataLoaded(true);
      return;
    }
    
    const loadData = async () => {
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
            console.log('✅ No todos in database - starting fresh');
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
            console.log('✅ No appointments in database - starting fresh');
          }
        }

        setDataLoaded(true);
      } catch (error) {
        console.error("❌ Failed to load data from database:", error);
        setDataLoaded(true);
      }
    };

    loadData();
  }, [dataLoaded, isAuthenticated]);

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
  }), [todos, habits, appointments, routines, addTodo, completeTodo, updateTodoPriority, moveTodoToGroceries, addHabit, logHabit, addAppointment, deleteAppointment, addRoutine, addRoutineItem, completeRoutineItem, clearCompletedRoutineItems, moveRoutineItemToTodos]);

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
