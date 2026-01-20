"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useLife } from "@/state/LifeStore";
import { Priority } from "@/types/todo";

type ClassifyResult = {
  type: "todo" | "habit" | "appointment" | "grocery";
  title?: string;
  confidence: number;
  dueDate?: string;
  reminderTime?: string;
  frequency?: "daily" | "weekly";
  priority?: Priority;
  hasUrgency?: boolean;
  notes?: string;
  items?: string[]; // For grocery type
};

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: "high", label: "High", color: "bg-red-500 hover:bg-red-600" },
  { value: "medium", label: "Medium", color: "bg-amber-500 hover:bg-amber-600" },
  { value: "low", label: "Low", color: "bg-green-500 hover:bg-green-600" },
];

export default function CaptureInput() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<Priority>("medium");

  const { addTodo, addHabit, addAppointment, routines, addRoutineItem } = useLife();

  const organize = async () => {
    setLoading(true);
    setResult(null);
    setSaved(false);

    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });

      if (!response.ok) {
        throw new Error(`Classification failed with status ${response.status}`);
      }

      const data = await response.json();
      setResult(data as ClassifyResult);
      setSelectedPriority("medium");
    } catch (error) {
      console.error("Classification error:", error);
      setResult({
        type: "todo",
        title: text,
        confidence: 0.5,
      });
      setSelectedPriority("medium");
    } finally {
      setLoading(false);
    }
  };

  const saveItem = () => {
    if (!result) return;

    const id = uuidv4();
    const now = new Date();

    switch (result.type) {
      case "todo":
        addTodo({
          id,
          title: result.title || text,
          priority: selectedPriority,
          dueDate: result.dueDate ? new Date(result.dueDate) : undefined,
          reminderTime: result.reminderTime ? new Date(result.reminderTime) : undefined,
          createdAt: now,
        });
        break;

      case "habit":
        addHabit({
          id,
          title: result.title || text,
          frequency: result.frequency || "daily",
          createdAt: now,
          completions: [],
        });
        break;

      case "appointment":
        addAppointment({
          id,
          title: result.title || text,
          withWhom: null,
          datetime: result.dueDate ? new Date(result.dueDate) : now,
          durationMinutes: 30,
          createdAt: now,
        });
        break;

      case "grocery":
        // Find or create groceries routine
        const groceryRoutine = routines.find(r => r.category === "groceries");
        if (groceryRoutine && result.items) {
          result.items.forEach(itemContent => {
            addRoutineItem(groceryRoutine.id, {
              id: uuidv4(),
              content: itemContent,
              addedAt: now,
            });
          });
        }
        break;
    }

    setSaved(true);
    setText("");
    setTimeout(() => {
      setResult(null);
      setSaved(false);
    }, 2000);
  };

  const successText = result?.type === "grocery" ? "Added." : "Got it.";

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <input
        className="w-full border border-gray-200 p-3 rounded-xl text-brandText placeholder-gray-400 
                   focus:outline-none focus:ring-2 focus:ring-brandBlue/50 focus:border-brandBlue"
        placeholder="Tell helpem what you need to do…"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === "Enter" && !loading && organize()}
      />

      <button
        className="mt-3 bg-gradient-to-r from-brandBlue to-brandGreen text-white px-5 py-2.5 rounded-xl 
                   font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        onClick={organize}
        disabled={loading || !text.trim()}
      >
        {loading ? "helpem is thinking…" : "Organize"}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm
                ${result.type === 'todo' ? 'bg-brandBlue' : 
                  result.type === 'habit' ? 'bg-brandGreen' : 
                  result.type === 'grocery' ? 'bg-orange-500' : 'bg-violet-500'}`}>
                {result.type === 'todo' ? '✓' : 
                 result.type === 'habit' ? '↻' : 
                 result.type === 'grocery' ? '🛒' : '◷'}
              </span>
              <span className="font-medium text-brandText capitalize">
                {result.type === 'grocery' ? 'Grocery Items' : result.type}
              </span>
            </div>
            <span className="text-xs text-brandTextLight">
              {Math.round(result.confidence * 100)}% confident
            </span>
          </div>
          
          {result.type === 'grocery' && result.items ? (
            <div className="mt-3">
              <p className="text-sm text-brandTextLight mb-2">Items to add:</p>
              <ul className="space-y-1">
                {result.items.map((item, i) => (
                  <li key={i} className="text-brandText capitalize flex items-center gap-2">
                    <span className="text-orange-500">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 font-medium text-brandText">{result.title}</p>
          )}
          
          {/* Priority selector for todos */}
          {result.type === "todo" && (
            <div className="mt-4">
              <p className="text-sm text-brandTextLight mb-2">Set priority:</p>
              <div className="flex gap-2">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedPriority(option.value)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all
                      ${selectedPriority === option.value 
                        ? `${option.color} text-white` 
                        : 'bg-gray-100 text-brandTextLight hover:bg-gray-200'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {result.reminderTime && (
            <p className="mt-3 text-sm text-brandTextLight flex items-center gap-2">
              <span>🔔</span>
              Reminder: {new Date(result.reminderTime).toLocaleString()}
            </p>
          )}
          
          {result.dueDate && (
            <p className="mt-3 text-sm text-brandTextLight flex items-center gap-2">
              <span>📅</span>
              Due: {new Date(result.dueDate).toLocaleString()}
            </p>
          )}
          
          {result.frequency && (
            <p className="mt-2 text-sm text-brandTextLight flex items-center gap-2">
              <span>🔄</span>
              {result.frequency}
            </p>
          )}

          <button
            className={`mt-4 w-full py-2.5 rounded-xl font-medium transition-colors ${
              saved
                ? "bg-brandGreen text-white"
                : "bg-brandBlue text-white hover:bg-blue-600"
            }`}
            onClick={saveItem}
            disabled={saved}
          >
            {saved ? successText : `Add to ${result.type}s`}
          </button>
        </div>
      )}
    </div>
  );
}
