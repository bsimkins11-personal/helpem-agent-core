import jwt from "jsonwebtoken";

/**
 * Session Auth - App-owned JWT session tokens (Express version)
 * 
 * These tokens are issued by our backend after Apple identity verification.
 * They are stored in iOS Keychain and sent via Authorization header.
 */

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_EXPIRY = "30d"; // 30 days - Long-lived session, users should not need to re-authenticate

/**
 * Creates an app-owned session token after successful Apple auth.
 * Token is valid for 30 days - users stay signed in unless they explicitly logout.
 */
export function createSessionToken(userId, appleUserId) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable not set");
  }

  return jwt.sign(
    { userId, appleUserId },
    JWT_SECRET,
    { expiresIn: SESSION_EXPIRY, algorithm: "HS256" }
  );
}

/**
 * Verifies an app-owned session token from the Authorization header.
 * Works with Express request objects.
 */
export async function verifySessionToken(req) {
  if (!JWT_SECRET) {
    console.error("JWT_SECRET environment variable not set");
    return {
      success: false,
      error: "Server configuration error",
      status: 500,
    };
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: "Missing Authorization header",
      status: 401,
    };
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });

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
    if (err.name === "TokenExpiredError") {
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
