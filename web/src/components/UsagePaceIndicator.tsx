/**
 * UsagePaceIndicator Component
 * Shows projected usage based on current pace
 */

type UsagePaceIndicatorProps = {
  pace: {
    projectedTotal: number;
    daysRemaining: number;
  } | null;
  limit: number;
};

export function UsagePaceIndicator({ pace, limit }: UsagePaceIndicatorProps) {
  if (!pace) {
    return (
      <div className="text-sm text-gray-500">
        Pace projection will be available after a few days of usage
      </div>
    );
  }
  
  const willExceed = pace.projectedTotal > limit;
  const daysUntilLimit = pace.daysRemaining;
  
  if (!willExceed) {
    return (
      <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <span className="text-green-600 text-lg">✓</span>
        <div className="flex-1">
          <p className="text-sm text-green-800 font-medium">You're on track</p>
          <p className="text-xs text-green-700 mt-0.5">
            At your current pace, you'll use about {pace.projectedTotal} of {limit} this month
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <span className="text-amber-600 text-lg">⚠️</span>
      <div className="flex-1">
        <p className="text-sm text-amber-800 font-medium">Approaching limit</p>
        <p className="text-xs text-amber-700 mt-0.5">
          At your current pace, you'll reach your limit in ~{daysUntilLimit} day{daysUntilLimit !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
