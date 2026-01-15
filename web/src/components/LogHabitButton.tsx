'use client';

import { useLife } from '@/state/LifeStore';

interface LogHabitButtonProps {
  habitId: string;
  isCompletedToday: boolean;
}

export function LogHabitButton({ habitId, isCompletedToday }: LogHabitButtonProps) {
  const { logHabit } = useLife();

  const handleClick = () => {
    logHabit(habitId);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex-shrink-0 w-8 h-8 rounded-lg transition-all duration-200
                  flex items-center justify-center text-sm font-bold
                  ${
                    isCompletedToday
                      ? 'bg-brandGreen text-white'
                      : 'border-2 border-brandGreen/50 text-brandGreen hover:bg-brandGreenLight hover:scale-105'
                  }`}
      aria-label={isCompletedToday ? 'Log again' : 'Log habit'}
    >
      {isCompletedToday ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <span>+</span>
      )}
    </button>
  );
}
