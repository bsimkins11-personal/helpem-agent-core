'use client';

import { useMemo } from 'react';
import { Habit } from '@/types/habit';
import { LogHabitButton } from './LogHabitButton';

interface HabitCardProps {
  habit: Habit;
}

export function HabitCard({ habit }: HabitCardProps) {
  // Memoize today's date at midnight for comparisons
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Memoize completion check
  const isCompletedToday = useMemo(() => {
    const todayTime = today.getTime();
    return habit.completions.some((c) => {
      const cDate = new Date(c.date);
      cDate.setHours(0, 0, 0, 0);
      return cDate.getTime() === todayTime;
    });
  }, [habit.completions, today]);

  // Memoize streak calculation - O(n) but only runs when completions change
  const streak = useMemo(() => {
    if (habit.completions.length === 0) return 0;

    // Create a Set of completion dates for O(1) lookup
    const completionDates = new Set(
      habit.completions.map((c) => {
        const d = new Date(c.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    );

    let count = 0;
    const checkDate = new Date(today);

    // If not completed today, start checking from yesterday
    if (!completionDates.has(checkDate.getTime())) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive days
    while (completionDates.has(checkDate.getTime()) && count < 365) {
      count++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return count;
  }, [habit.completions, today]);

  return (
    <div className={`group relative p-3 rounded-xl border transition-all duration-200
                    ${isCompletedToday 
                      ? 'bg-brandGreenLight border-brandGreen/30' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
      {/* Tribe indicator badge */}
      {habit.addedByTribeName && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {habit.addedByTribeName}
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <LogHabitButton habitId={habit.id} isCompletedToday={isCompletedToday} />

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-brandText text-sm">{habit.title}</h3>

          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-brandGreenLight text-brandGreen">
              {habit.frequency}
            </span>

            {streak > 0 && (
              <span className="text-xs flex items-center gap-1 text-amber-600">
                🔥 {streak} day{streak !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
