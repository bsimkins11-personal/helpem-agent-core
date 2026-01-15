// /api/usage - Check current usage stats
// Returns monthly usage and remaining budget

import { NextResponse } from "next/server";
import { getUsageStats } from "@/lib/usageTracker";

export async function GET() {
  const stats = getUsageStats();
  
  return NextResponse.json({
    success: true,
    ...stats,
    message: `$${stats.totalCostUSD} of $${stats.limitUSD} used (${stats.percentUsed}%)`,
  });
}
