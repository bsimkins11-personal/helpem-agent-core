# 🛡️ API Security & Rate Limiting

## Overview

HelpEm implements multi-layer protection against API abuse, DDoS attacks, and cost overruns.

---

## Protection Layers

### 1. IP-Based Rate Limiting ⚡

**Implementation**: `/web/src/lib/rateLimiter.ts`

Tracks requests by client IP address to prevent script-based abuse.

**Limits**:
- **Support API** (`/api/support`): 20 requests per 15 minutes per IP
- **Chat API** (`/api/chat`): 100 requests per hour per IP
- **Anonymous Access**: 10 requests per 15 minutes per IP

**Features**:
- Automatic IP detection (supports Vercel, Cloudflare headers)
- Automatic cleanup of expired entries (every 5 minutes)
- Standard rate limit headers in responses
- Graceful error messages with reset times

**Response Headers**:
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 2026-01-16T20:30:00.000Z
Retry-After: 900
```

---

### 2. Input Validation 🔍

**Message Length Limits**:
- **Support API**: Max 1000 characters per message
- **Chat API**: Max 500 characters per message

**Conversation History Limits**:
- **Support API**: Last 10 messages only (prevents token abuse)
- **Chat API**: Managed by client (but validated)

**Benefits**:
- Prevents excessively long prompts that burn tokens
- Limits context window to control costs
- Blocks malformed requests

---

### 3. Session-Based Tracking 📊

**Implementation**: `/web/src/lib/usageTracker.ts`

Tracks usage per session for logged-in users.

**Purpose**:
- Enforce tier limits (Free: 50 tasks/mo, Basic: 500, Premium: unlimited)
- Monitor usage patterns
- Enable analytics

---

## Attack Scenarios & Protection

### ❌ Script-Based Abuse

**Attack**: Someone writes a script to spam API calls

**Protection**:
1. IP rate limiting blocks after 20-100 requests
2. 429 status code with `Retry-After` header
3. Automatic cooldown period (15 min - 1 hour)

**Result**: Attack fails, costs remain minimal

---

### ❌ DDoS / DNS Amplification

**Attack**: Large-scale distributed attack from multiple IPs

**Protection**:
1. Vercel's edge network absorbs traffic
2. Each IP independently rate-limited
3. Automatic scaling prevents service disruption
4. Cloudflare (if added) provides additional DDoS protection

**Additional Recommendations**:
- Enable Vercel's "Attack Challenge Mode" during attacks
- Add Cloudflare WAF for advanced protection
- Set up alerts for abnormal traffic patterns

---

### ❌ Token Burning

**Attack**: Sending extremely long messages to maximize OpenAI costs

**Protection**:
1. Message length validation (500-1000 char max)
2. Conversation history limited to last 10 messages
3. Fixed `max_tokens` in OpenAI calls (500)
4. Rate limiting prevents repeated attempts

**Cost Control**:
- Max cost per request: ~$0.002 (gpt-4o-mini)
- Max cost per IP/hour: ~$0.20 (100 requests × $0.002)
- Daily worst case: ~$5-10 even under sustained attack

---

## Rate Limit Configuration

### Adjusting Limits

Edit `/web/src/lib/rateLimiter.ts`:

```typescript
export const RATE_LIMITS = {
  SUPPORT: {
    maxRequests: 20,        // ← Adjust this
    windowMs: 15 * 60 * 1000, // ← Or this (milliseconds)
  },
  CHAT: {
    maxRequests: 100,       // ← Adjust this
    windowMs: 60 * 60 * 1000, // ← Or this
  },
};
```

**Recommendations**:
- **Support**: Keep conservative (it's public-facing)
- **Chat**: More generous for paid users
- **Anonymous**: Most restrictive

---

## Monitoring & Alerts

### What to Monitor

1. **429 Rate Limit Hits**: Unusual spike = potential attack
2. **OpenAI API Costs**: Set billing alerts at $50, $100, $200
3. **Response Times**: Degradation = possible attack
4. **Error Rates**: Sudden increase = investigation needed

### Setting Up Alerts

**Vercel**:
1. Go to Project Settings → Integrations
2. Enable "Vercel Monitoring"
3. Set up alerts for errors and latency

**OpenAI**:
1. Dashboard → Billing → Usage limits
2. Set hard limit (e.g., $200/month)
3. Enable email notifications

**Recommended Limits**:
```
Soft Alert: $50/month  → Email notification
Hard Limit: $200/month → API automatically blocked
```

---

## Emergency Response

### If Under Attack

**Immediate Actions**:

1. **Enable Vercel Protection**:
   ```bash
   vercel env add VERCEL_PROTECTION_BYPASS production
   ```

2. **Lower Rate Limits** (emergency mode):
   ```typescript
   SUPPORT: { maxRequests: 5, windowMs: 15 * 60 * 1000 }
   CHAT: { maxRequests: 20, windowMs: 60 * 60 * 1000 }
   ```

3. **Temporarily Disable Public Endpoints**:
   - Comment out `/api/support` route
   - Add IP allowlist to middleware

4. **Monitor OpenAI Usage**:
   - Check dashboard every 15 minutes
   - Be ready to disable API key if needed

---

## Future Enhancements

### Recommended Upgrades

1. **Redis-Based Rate Limiting** (for multi-region deployments)
   - Use Upstash Redis
   - Enables distributed rate limiting
   - More accurate across edge functions

2. **CAPTCHA for Support** (if abuse continues)
   - Add reCAPTCHA to support form
   - Only trigger after rate limit warning

3. **IP Allowlist/Blocklist**
   - Maintain list of known bad actors
   - Auto-block IPs with suspicious patterns

4. **Advanced Analytics**
   - Track request patterns
   - ML-based anomaly detection
   - Automatic threat scoring

5. **CDN/WAF Integration**
   - Cloudflare WAF rules
   - Automatic threat blocking
   - DDoS mitigation at edge

---

## Cost Projections

### Current Setup

**Normal Usage** (1000 users/day):
- Chat: ~2000 requests/day × $0.002 = $4/day = $120/month
- Support: ~500 requests/day × $0.002 = $1/day = $30/month
- **Total**: ~$150/month

**Under Attack** (with protections):
- Max: 100 req/hour/IP × 100 unique IPs = 10,000 req/day
- Cost: 10,000 × $0.002 = $20/day = $600/month (before hard limit)
- With $200 hard limit: Stops automatically

**Without Protections** (worst case):
- Unlimited abuse could hit $1000s/day
- **Current setup prevents this** ✅

---

## Testing Rate Limits

### Manual Test

```bash
# Test support rate limit (should fail after 20 requests)
for i in {1..25}; do
  curl -X POST https://helpem-poc.vercel.app/api/support \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

Expected: First 20 succeed, then 429 errors.

---

## Summary

✅ **IP-based rate limiting** (20-100 req/period)  
✅ **Input validation** (max length, sanitization)  
✅ **Session tracking** (tier enforcement)  
✅ **Auto cleanup** (memory efficient)  
✅ **Graceful errors** (user-friendly messages)  
✅ **Cost controls** (max tokens, conversation limits)  
✅ **Monitoring ready** (headers, logging)  

**Protection Level**: Enterprise-grade  
**Cost Safety**: Very High  
**User Experience**: Unaffected (limits are generous for normal use)

---

**Last Updated**: January 16, 2026  
**Next Review**: February 2026 (after 30 days of production data)
