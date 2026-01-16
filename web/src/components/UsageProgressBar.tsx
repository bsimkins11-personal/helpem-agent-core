/**
 * UsageProgressBar Component
 * Displays usage progress with color-coded states
 */

type UsageProgressBarProps = {
  used: number;
  limit: number;
  size?: "sm" | "lg";
};

export function UsageProgressBar({ used, limit, size = "sm" }: UsageProgressBarProps) {
  const percentage = Math.min((used / limit) * 100, 100);
  
  // Color states: green → yellow → red
  const getColor = () => {
    if (percentage < 70) return "bg-green-500";
    if (percentage < 90) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  const height = size === "sm" ? "h-1.5" : "h-3";
  
  return (
    <div className="w-full">
      <div className={`w-full ${height} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${getColor()} transition-all duration-300 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
