/**
 * Rate Limiter - Protects API endpoints from abuse
 * 
 * Features:
 * - IP-based rate limiting
 * - Session-based tracking
 * - Configurable limits per endpoint
 * - Memory-efficient with automatic cleanup
 */

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
  identifier: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// In-memory store (consider Redis/Upstash for multi-instance deployments)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function checkRateLimit(
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const key = config.identifier;

  let entry = store.get(key);

  // Create new entry or reset if window expired
  if (!entry || now > entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    store.set(key, entry);
  }

  // Increment request count
  entry.count++;

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  
  const ip = cfConnectingIp || realIp || forwarded?.split(",")[0] || "unknown";
  
  return ip;
}

export const RATE_LIMITS = {
  // Support endpoint: 20 requests per 15 minutes per IP
  SUPPORT: {
    maxRequests: 20,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // Chat endpoint: 100 requests per hour per user
  CHAT: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // Strict limit for anonymous/guest access
  ANONYMOUS: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
} as const;
