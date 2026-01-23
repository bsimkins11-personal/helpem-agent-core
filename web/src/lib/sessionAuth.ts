import jwt from "jsonwebtoken";

/**
 * Session Auth - App-owned JWT session tokens
 * 
 * These tokens are issued by our backend after Apple identity verification.
 * They are stored in iOS Keychain and sent via Authorization header.
 */

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_EXPIRY = "30d"; // 30 days - Aligned with backend for consistency

export interface SessionPayload {
  userId: string;      // Our internal UUID
  appleUserId: string; // Apple's stable sub identifier
  iat?: number;
  exp?: number;
}

export interface SessionResult {
  success: true;
  session: SessionPayload;
}

export interface SessionError {
  success: false;
  error: string;
  status: number;
}

function getJwtSecrets(): string[] {
  const secrets: string[] = [];

  const primary = process.env.JWT_SECRET;
  const fallback = process.env.JWT_SECRET_FALLBACK;
  const list = process.env.JWT_SECRETS;

  if (primary) secrets.push(primary);
  if (fallback) secrets.push(fallback);
  if (list) {
    list.split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => secrets.push(s));
  }

  return Array.from(new Set(secrets));
}

/**
 * Creates an app-owned session token after successful Apple auth.
 * 
 * @param userId - Our internal user UUID from the database
 * @param appleUserId - Apple's stable sub identifier
 * @returns Signed JWT session token
 */
export function createSessionToken(userId: string, appleUserId: string): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable not set");
  }

  const payload: Omit<SessionPayload, "iat" | "exp"> = {
    userId,
    appleUserId,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: SESSION_EXPIRY,
    algorithm: "HS256",
  });
}

/**
 * Verifies an app-owned session token from the Authorization header.
 * 
 * Usage in protected route handlers:
 * ```
 * const session = await verifySessionToken(request);
 * if (!session.success) {
 *   return NextResponse.json({ error: session.error }, { status: session.status });
 * }
 * const { userId, appleUserId } = session.session;
 * ```
 */
export async function verifySessionToken(
  request: Request
): Promise<SessionResult | SessionError> {
  const secrets = getJwtSecrets();
  if (secrets.length === 0) {
    console.error("JWT_SECRET environment variable not set");
    return {
      success: false,
      error: "Server configuration error",
      status: 500,
    };
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: "Missing Authorization header",
      status: 401,
    };
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    let decoded: SessionPayload | null = null;
    let lastError: unknown = null;

    for (const secret of secrets) {
      try {
        decoded = jwt.verify(token, secret, {
          algorithms: ["HS256"],
        }) as SessionPayload;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!decoded) {
      throw lastError ?? new Error("JWT verification failed");
    }

    if (!decoded.userId || !decoded.appleUserId) {
      return {
        success: false,
        error: "Invalid session token payload",
        status: 401,
      };
    }

    return {
      success: true,
      session: decoded,
    };
  } catch (err) {
    const error = err as Error;
    
    if (error.name === "TokenExpiredError") {
      return {
        success: false,
        error: "Session expired",
        status: 401,
      };
    }

    return {
      success: false,
      error: "Invalid session token",
      status: 401,
    };
  }
}

/**
 * Helper to require a valid session or throw.
 * Use in try/catch blocks for cleaner code.
 */
export async function requireSession(request: Request): Promise<SessionPayload> {
  const result = await verifySessionToken(request);
  if (!result.success) {
    const error = new Error(result.error) as Error & { status: number };
    error.status = result.status;
    throw error;
  }
  return result.session;
}
