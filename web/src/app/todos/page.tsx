'use client';

import { useState } from 'react';
import { TodoCard } from '@/components/TodoCard';
import { useLife } from '@/state/LifeStore';

type FilterType = 'all' | 'active' | 'completed';
type SortType = 'priority' | 'created' | 'dueDate';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

const priorityOrder = { high: 0, medium: 1, low: 2 };

const PRIORITY_TABS = [
  { key: 'high' as const, label: 'High', color: 'bg-red-500', hoverColor: 'hover:bg-red-100', textColor: 'text-red-600' },
  { key: 'medium' as const, label: 'Med', color: 'bg-amber-500', hoverColor: 'hover:bg-amber-100', textColor: 'text-amber-600' },
  { key: 'low' as const, label: 'Low', color: 'bg-green-500', hoverColor: 'hover:bg-green-100', textColor: 'text-green-600' },
];

export default function TodosPage() {
  const { todos } = useLife();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('priority');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  const filteredTodos = todos.filter((todo) => {
    // Status filter
    if (filter === 'active' && todo.completedAt) return false;
    if (filter === 'completed' && !todo.completedAt) return false;
    // Priority filter
    if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false;
    return true;
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (sort === 'priority') {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    if (sort === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const stats = {
    total: todos.length,
    active: todos.filter((t) => !t.completedAt).length,
    completed: todos.filter((t) => !!t.completedAt).length,
    high: todos.filter((t) => !t.completedAt && t.priority === 'high').length,
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 md:gap-3 mb-2">
          <span className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-brandBlueLight flex items-center justify-center text-brandBlue text-lg md:text-xl">✓</span>
          <h1 className="text-xl md:text-2xl font-bold text-brandText">Todos</h1>
        </div>
        <p className="text-sm md:text-base text-brandTextLight">
          {stats.active} active · {stats.high} high priority · {stats.completed} done
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex gap-1.5 md:gap-2 overflow-x-auto">
            {(['all', 'active', 'completed'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 whitespace-nowrap
                  ${
                    filter === f
                      ? 'bg-brandBlue text-white'
                      : 'text-brandTextLight hover:text-brandText hover:bg-gray-100 active:bg-gray-200'
                  }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="px-3 md:px-4 py-1.5 md:py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs md:text-sm
                       text-brandText focus:outline-none focus:ring-2 focus:ring-brandBlue/50"
          >
            <option value="priority">Priority</option>
            <option value="dueDate">Due Date</option>
            <option value="created">Recently Created</option>
          </select>
        </div>
      </div>

      {/* Priority Filter Tabs */}
      <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm text-brandTextLight font-medium mr-1">Priority:</span>
          {PRIORITY_TABS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPriorityFilter(p.key)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200
                ${
                  priorityFilter === p.key
                    ? `${p.color} text-white`
                    : `${p.textColor} bg-gray-50 ${p.hoverColor}`
                }`}
            >
              {p.label}
            </button>
          ))}
          {priorityFilter !== 'all' && (
            <button
              onClick={() => setPriorityFilter('all')}
              className="ml-1 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              title="Clear filter"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Todo List */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
        {sortedTodos.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {sortedTodos.map((todo) => (
              <TodoCard key={todo.id} todo={todo} />
            ))}
          </div>
        ) : (
          <div className="p-8 md:p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <div className="text-3xl md:text-4xl mb-3 md:mb-4">✓</div>
            <p className="text-sm md:text-base text-brandTextLight">
              {filter === 'all'
                ? 'No todos yet. Go capture some tasks!'
                : filter === 'active'
                ? 'All caught up! No active todos.'
                : 'No completed todos yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
