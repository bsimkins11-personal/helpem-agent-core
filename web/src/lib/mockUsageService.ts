/**
 * Mock Usage Service (Alpha Only)
 * 
 * TODO (Beta): Replace with real API endpoint
 * Endpoint: GET /api/usage/status
 * 
 * This contract is LOCKED and will not change between alpha and beta.
 */

export type UsageData = {
  plan: "free" | "pro" | "max";
  used: number;
  limit: number;
  periodStart: string;
  periodEnd: string;
  resetAt: string;
  pace: {
    projectedTotal: number;
    daysRemaining: number;
  } | null;
  actions: {
    canUpgrade: boolean;
    canAddUsage: boolean;
    addUsageOptions: Array<{
      amount: number;
      price: number;
    }>;
  };
};

/**
 * Mock implementation for alpha testing
 * Returns realistic usage data for demonstration
 */
export async function getUsageStatus(): Promise<UsageData> {
  // TODO (Beta): Replace with fetch('/api/usage/status')
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  const daysInMonth = endOfMonth.getDate();
  const daysElapsed = now.getDate();
  const daysRemaining = daysInMonth - daysElapsed;
  
  // Mock usage data (Alpha tier - 1000 messages per month, $2 API limit)
  const used = 15;
  const limit = 1000;
  const projectedTotal = daysElapsed > 3 ? Math.round((used / daysElapsed) * daysInMonth) : null;
  
  return {
    plan: "free",
    used,
    limit,
    periodStart: startOfMonth.toISOString(),
    periodEnd: endOfMonth.toISOString(),
    resetAt: nextMonth.toISOString(),
    pace: projectedTotal ? {
      projectedTotal,
      daysRemaining,
    } : null,
    actions: {
      canUpgrade: false, // No upgrades during alpha
      canAddUsage: false, // No add-ons during alpha
      addUsageOptions: [],
    },
  };
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(plan: UsageData["plan"]): string {
  const names = {
    free: "Free",
    pro: "Pro",
    max: "Max",
  };
  return names[plan];
}

/**
 * Get plan upgrade options
 * TODO (Beta): Replace with real pricing from backend
 */
export function getUpgradeOptions(currentPlan: UsageData["plan"]) {
  const options = {
    free: [
      { plan: "pro", name: "Basic", price: 4.99, limit: 500 },
      { plan: "max", name: "Premium", price: 9.99, limit: 5000 },
    ],
    pro: [
      { plan: "max", name: "Premium", price: 9.99, limit: 5000 },
    ],
    max: [],
  };
  
  return options[currentPlan];
}
