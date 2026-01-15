// Usage Tracker - Monitors API costs and enforces monthly limit
// For demos: Uses in-memory tracking (resets on redeploy)
// For production: Use Upstash Redis or Vercel KV

// Cost estimates per API call (in USD)
const COSTS = {
  WHISPER_PER_SECOND: 0.0001,     // ~$0.006/minute
  TTS_PER_CHAR: 0.000015,         // ~$0.015/1000 chars
  CHAT_PER_REQUEST: 0.001,        // Estimated average
};

// Monthly limit in USD
const MONTHLY_LIMIT_USD = parseFloat(process.env.MONTHLY_USAGE_LIMIT || "20");

// In-memory storage (resets on deploy - for demos only)
// For production, replace with Redis/KV storage
let usageData = {
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
  totalCostUSD: 0,
  requestCount: 0,
  lastUpdated: new Date().toISOString(),
};

function resetIfNewMonth() {
  const now = new Date();
  if (now.getMonth() !== usageData.month || now.getFullYear() !== usageData.year) {
    console.log(`📊 Resetting usage for new month: ${now.getMonth() + 1}/${now.getFullYear()}`);
    usageData = {
      month: now.getMonth(),
      year: now.getFullYear(),
      totalCostUSD: 0,
      requestCount: 0,
      lastUpdated: now.toISOString(),
    };
  }
}

export function checkUsageLimit(): { allowed: boolean; remaining: number; used: number } {
  resetIfNewMonth();
  
  const remaining = Math.max(0, MONTHLY_LIMIT_USD - usageData.totalCostUSD);
  const allowed = remaining > 0;
  
  return {
    allowed,
    remaining: Math.round(remaining * 100) / 100,
    used: Math.round(usageData.totalCostUSD * 100) / 100,
  };
}

export function trackUsage(type: "whisper" | "tts" | "chat", metadata?: { seconds?: number; chars?: number }) {
  resetIfNewMonth();
  
  let cost = 0;
  
  switch (type) {
    case "whisper":
      // Estimate based on audio duration
      const seconds = metadata?.seconds || 5;
      cost = seconds * COSTS.WHISPER_PER_SECOND;
      break;
    
    case "tts":
      // Based on character count
      const chars = metadata?.chars || 100;
      cost = chars * COSTS.TTS_PER_CHAR;
      break;
    
    case "chat":
      cost = COSTS.CHAT_PER_REQUEST;
      break;
  }
  
  usageData.totalCostUSD += cost;
  usageData.requestCount += 1;
  usageData.lastUpdated = new Date().toISOString();
  
  console.log(`💰 Usage: +$${cost.toFixed(4)} (${type}) | Total: $${usageData.totalCostUSD.toFixed(2)}/${MONTHLY_LIMIT_USD}`);
  
  return cost;
}

export function getUsageStats() {
  resetIfNewMonth();
  
  return {
    month: usageData.month + 1,
    year: usageData.year,
    totalCostUSD: Math.round(usageData.totalCostUSD * 100) / 100,
    limitUSD: MONTHLY_LIMIT_USD,
    percentUsed: Math.round((usageData.totalCostUSD / MONTHLY_LIMIT_USD) * 100),
    requestCount: usageData.requestCount,
    lastUpdated: usageData.lastUpdated,
  };
}

// Error response for when limit is exceeded
export function usageLimitError() {
  const stats = getUsageStats();
  return {
    error: "Monthly usage limit reached",
    message: `Demo limit of $${stats.limitUSD} reached. Resets next month.`,
    stats,
  };
}
