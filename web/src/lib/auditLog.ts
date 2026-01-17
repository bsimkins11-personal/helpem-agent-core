/**
 * Audit Logging - Track security-critical events
 * 
 * Logs are written to console in production (can be captured by logging service)
 * In the future, this can be extended to write to a database table or external service
 */

type AuditEvent = 
  | "AUTH_SUCCESS"
  | "AUTH_FAILED"
  | "AUTH_RATE_LIMIT"
  | "DATA_ACCESS"
  | "DATA_DELETE"
  | "RATE_LIMIT_EXCEEDED"
  | "INVALID_INPUT"
  | "UNAUTHORIZED_ACCESS";

interface AuditLogEntry {
  timestamp: string;
  event: AuditEvent;
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export function auditLog(
  event: AuditEvent,
  metadata?: Record<string, any>,
  request?: Request
): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    event,
    metadata,
  };

  // Extract request metadata if provided
  if (request) {
    entry.ip = getClientIp(request);
    entry.userAgent = request.headers.get("user-agent") || undefined;
  }

  // Log to console (captured by Railway/Vercel logs)
  console.log(`[AUDIT] ${JSON.stringify(entry)}`);

  // TODO: In production, also write to audit_logs table or external service
  // await writeToAuditTable(entry);
}

function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  
  return cfConnectingIp || realIp || forwarded?.split(",")[0] || undefined;
}
