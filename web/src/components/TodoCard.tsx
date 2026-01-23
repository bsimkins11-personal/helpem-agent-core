'use client';

import { useState, useCallback, useMemo } from 'react';
import { Todo, Priority } from '@/types/todo';
import { CompleteTodoButton } from './CompleteTodoButton';
import { useLife } from '@/state/LifeStore';
import { isGroceryCandidate } from '@/lib/classifier';

interface TodoCardProps {
  todo: Todo;
}

const PRIORITY_CONFIG = {
  high: {
    label: "High",
    color: "bg-red-50 text-red-600",
    activeColor: "bg-red-500 text-white",
    border: "border-l-red-500",
  },
  medium: {
    label: "Medium", 
    color: "bg-amber-50 text-amber-600",
    activeColor: "bg-amber-500 text-white",
    border: "border-l-amber-500",
  },
  low: {
    label: "Low",
    color: "bg-green-50 text-green-600",
    activeColor: "bg-green-500 text-white",
    border: "border-l-green-500",
  },
} as const;

const PRIORITIES: Priority[] = ["high", "medium", "low"];

export function TodoCard({ todo }: TodoCardProps) {
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const { updateTodoPriority, moveTodoToGroceries, moveTodoToAppointment } = useLife();
  
  const isCompleted = !!todo.completedAt;
  const config = PRIORITY_CONFIG[todo.priority];
  const showMoveToGroceries = useMemo(() => {
    if (isCompleted) return false;
    return isGroceryCandidate(todo.title);
  }, [isCompleted, todo.title]);

  // Memoize overdue calculation
  const isOverdue = useMemo(() => {
    if (!todo.dueDate || isCompleted) return false;
    return new Date(todo.dueDate) < new Date();
  }, [todo.dueDate, isCompleted]);

  // Memoize date formatting
  const formattedDueDate = useMemo(() => {
    if (!todo.dueDate) return null;
    return new Date(todo.dueDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, [todo.dueDate]);

  // Memoize reminder formatting
  const formattedReminderTime = useMemo(() => {
    if (!todo.reminderTime) return null;
    return new Date(todo.reminderTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [todo.reminderTime]);

  const handlePriorityChange = useCallback((priority: Priority) => {
    console.log(`📝 TodoCard: Changing priority for "${todo.title}" from ${todo.priority} to ${priority}`);
    updateTodoPriority(todo.id, priority);
    setShowPriorityPicker(false);
  }, [todo.id, todo.title, todo.priority, updateTodoPriority]);

  const togglePriorityPicker = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isCompleted) {
      console.log(`🎯 TodoCard: Toggling priority picker for "${todo.title}", current: ${showPriorityPicker}`);
      setShowPriorityPicker(prev => !prev);
    }
  }, [isCompleted, todo.title, showPriorityPicker]);

  return (
    <div
      className={`group relative p-3 bg-gray-50 border border-gray-200 rounded-xl 
                  border-l-4 ${config.border}
                  hover:bg-gray-100 transition-all duration-200
                  ${isCompleted ? 'opacity-50' : ''}`}
    >
      {/* Tribe indicator badge */}
      {todo.addedByTribeName && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {todo.addedByTribeName}
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <CompleteTodoButton todoId={todo.id} completed={isCompleted} />

        <div className="flex-1 min-w-0">
          <h3
            onClick={togglePriorityPicker}
            className={`font-medium text-brandText text-sm ${
              isCompleted ? 'line-through opacity-60' : 'cursor-pointer'
            }`}
            aria-label={`Todo: ${todo.title}. Tap to change priority.`}
          >
            {todo.title}
          </h3>

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <button
              onClick={togglePriorityPicker}
              disabled={isCompleted}
              className={`text-xs px-2 py-0.5 rounded-full transition-all ${config.color} 
                         ${!isCompleted ? 'hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 cursor-pointer' : 'cursor-default'}`}
              aria-label={`Priority: ${config.label}. Click to change.`}
            >
              {config.label}
            </button>
            
            {formattedReminderTime && (
              <span className="text-xs flex items-center gap-1 text-blue-600">
                🔔 {formattedReminderTime}
              </span>
            )}
            
            {formattedDueDate && (
              <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-brandTextLight'}`}>
                📅 {formattedDueDate}
                {isOverdue && " (overdue)"}
              </span>
            )}
          </div>

          {showPriorityPicker && !isCompleted && (
            <div className="mt-2 flex gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => handlePriorityChange(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all
                    ${todo.priority === p 
                      ? PRIORITY_CONFIG[p].activeColor 
                      : `${PRIORITY_CONFIG[p].color} hover:opacity-80`}`}
                  aria-pressed={todo.priority === p}
                >
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          )}

          {(showMoveToGroceries || !isCompleted) && (
            <div className="mt-2 flex flex-wrap gap-3">
              {showMoveToGroceries && (
                <button
                  onClick={() => moveTodoToGroceries(todo.id)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  Move to groceries
                </button>
              )}
              {!isCompleted && (
                <button
                  onClick={() => moveTodoToAppointment(todo.id)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Convert to appointment
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
