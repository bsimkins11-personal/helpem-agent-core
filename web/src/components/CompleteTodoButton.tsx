'use client';

import { useLife } from '@/state/LifeStore';

interface CompleteTodoButtonProps {
  todoId: string;
  completed: boolean;
}

export function CompleteTodoButton({ todoId, completed }: CompleteTodoButtonProps) {
  const { completeTodo } = useLife();

  const handleClick = () => {
    if (!completed) {
      completeTodo(todoId);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={completed}
      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-200
                  flex items-center justify-center mt-0.5
                  ${
                    completed
                      ? 'bg-brandGreen border-brandGreen text-white'
                      : 'border-gray-300 hover:border-brandGreen hover:bg-brandGreenLight'
                  }`}
      aria-label={completed ? 'Completed' : 'Mark as complete'}
    >
      {completed && (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
