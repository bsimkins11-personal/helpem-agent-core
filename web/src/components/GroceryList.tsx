"use client";

import { useLife } from "@/state/LifeStore";

export function GroceryList() {
  const { routines, completeRoutineItem, clearCompletedRoutineItems } = useLife();
  
  const groceryRoutine = routines.find(r => r.category === "groceries");
  
  if (!groceryRoutine) {
    return null;
  }

  const activeItems = groceryRoutine.items.filter(item => !item.completed);
  const completedItems = groceryRoutine.items.filter(item => item.completed);

  return (
    <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <span className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 text-lg md:text-xl">
            🛒
          </span>
          <h2 className="text-lg md:text-xl font-bold text-brandText">Groceries</h2>
        </div>
        {completedItems.length > 0 && (
          <button
            onClick={() => clearCompletedRoutineItems(groceryRoutine.id)}
            className="text-xs md:text-sm text-brandTextLight hover:text-brandText transition-colors"
          >
            Clear completed
          </button>
        )}
      </div>

      {activeItems.length === 0 && completedItems.length === 0 ? (
        <div className="p-6 md:p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <div className="text-2xl md:text-3xl mb-2 md:mb-3">🛒</div>
          <p className="text-sm md:text-base text-brandTextLight mb-1">No items yet</p>
          <p className="text-xs md:text-sm text-brandTextLight">
            Try saying &quot;Add milk to groceries&quot; or &quot;We need eggs&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Active items */}
          {activeItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <button
                onClick={() => completeRoutineItem(groceryRoutine.id, item.id)}
                className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-orange-500 
                           flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <span className="opacity-0 group-hover:opacity-100 text-orange-500 text-xs">✓</span>
              </button>
              <span className="text-brandText capitalize">{item.content}</span>
            </div>
          ))}

          {/* Completed items (collapsed) */}
          {completedItems.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm text-brandTextLight cursor-pointer hover:text-brandText transition-colors">
                {completedItems.length} completed
              </summary>
              <div className="mt-2 space-y-1">
                {completedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 text-sm opacity-50"
                  >
                    <span className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                      ✓
                    </span>
                    <span className="text-brandTextLight capitalize line-through">{item.content}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
