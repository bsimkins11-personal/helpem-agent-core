'use client';

import { HabitCard } from '@/components/HabitCard';
import { GroceryList } from '@/components/GroceryList';
import { useLife } from '@/state/LifeStore';

export default function HabitsPage() {
  const { habits } = useLife();

  // Calculate today's progress
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const habitsCompletedToday = habits.filter((habit) => {
    const completionsToday = habit.completions.filter((c) => {
      const cDate = new Date(c.date);
      cDate.setHours(0, 0, 0, 0);
      return cDate.getTime() === today.getTime();
    });
    return completionsToday.length > 0;
  }).length;

  const progressPercentage = habits.length > 0 
    ? Math.round((habitsCompletedToday / habits.length) * 100) 
    : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 md:gap-3 mb-2">
          <span className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-brandGreenLight flex items-center justify-center text-brandGreen text-lg md:text-xl">↻</span>
          <h1 className="text-xl md:text-2xl font-bold text-brandText">Routines</h1>
        </div>
        <p className="text-sm md:text-base text-brandTextLight">{habits.length} routines tracked</p>
      </div>

      {/* Today's Progress */}
      {habits.length > 0 && (
        <div className="bg-gradient-to-r from-brandGreen to-emerald-400 rounded-xl md:rounded-2xl p-4 md:p-6 text-white">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <h3 className="font-semibold text-base md:text-lg">Today&apos;s Progress</h3>
              <p className="text-white/80 text-sm md:text-base">
                {habitsCompletedToday} of {habits.length} done
              </p>
            </div>
            <div className="text-3xl md:text-4xl font-bold">{progressPercentage}%</div>
          </div>
          
          <div className="w-full h-2.5 md:h-3 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Groceries */}
      <GroceryList />

      {/* Habits List */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
        {habits.length > 0 ? (
          <div className="space-y-2 md:space-y-3">
            {habits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </div>
        ) : (
          <div className="p-8 md:p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <div className="text-3xl md:text-4xl mb-3 md:mb-4">↻</div>
            <p className="text-sm md:text-base text-brandTextLight mb-2">No routines yet</p>
            <p className="text-xs md:text-sm text-brandTextLight">
              Try saying &quot;Exercise daily&quot; or &quot;Meditate every morning&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
