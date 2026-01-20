"use client";

import { useLife } from "@/state/LifeStore";
import { isTodoSignal } from "@/lib/classifier";

export function GroceryList() {
  const { groceries, completeGrocery, clearCompletedGroceries, moveGroceryToTodos } = useLife();

  const allItems = groceries;
  const hasCompletedItems = allItems.some(item => item.completed);

  return (
    <div>
      {allItems.length === 0 ? (
        <div className="p-6 md:p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <div className="text-2xl md:text-3xl mb-2 md:mb-3">🛒</div>
          <p className="text-sm md:text-base text-brandTextLight mb-1">No items yet</p>
          <p className="text-xs md:text-sm text-brandTextLight">
            Try saying &quot;Add milk to groceries&quot; or &quot;We need eggs&quot;
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {allItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <button
                  onClick={() => completeGrocery(item.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                    ${item.completed 
                      ? 'bg-orange-500 border-orange-500' 
                      : 'border-gray-300 hover:border-orange-500'}`}
                >
                  {item.completed && (
                    <span className="text-white text-xs">✓</span>
                  )}
                  {!item.completed && (
                    <span className="opacity-0 group-hover:opacity-100 text-orange-500 text-xs">✓</span>
                  )}
                </button>
                <div className="flex-1 flex items-center gap-3">
                  <span className={`capitalize ${item.completed ? 'text-brandTextLight line-through' : 'text-brandText'}`}>
                    {item.content}
                  </span>
                  {!item.completed && isTodoSignal(item.content) && (
                    <button
                      onClick={() => moveGroceryToTodos(item.id)}
                      className="text-xs text-brandBlue hover:text-blue-700"
                    >
                      Move to todos
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Clear picked-up items at bottom */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={clearCompletedGroceries}
              disabled={!hasCompletedItems}
              className={`w-full py-2 px-4 text-sm font-medium rounded-lg transition-colors ${
                hasCompletedItems
                  ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  : "text-gray-400 cursor-not-allowed"
              }`}
            >
              Clear picked up items
            </button>
          </div>
        </>
      )}
    </div>
  );
}
