import jwt, { JwtHeader } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const client = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

function getKey(header: JwtHeader, callback: jwt.SigningKeyCallback) {
  if (!header.kid) {
    return callback(new Error("Missing kid in token header"));
  }

  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Apple user identity - only the stable identifier.
 * Per policy: we do NOT store or expose Apple email or name.
 */
export interface AppleUser {
  id: string; // Apple's stable `sub` identifier (userIdentifier)
}

export interface AuthResult {
  success: true;
  user: AppleUser;
}

export interface AuthError {
  success: false;
  error: string;
  status: number;
}

/**
 * Verifies an Apple identity token (JWT from Sign in with Apple).
 * 
 * @param identityToken - The raw JWT string from Apple
 * @returns AuthResult with user.id (Apple's sub) or AuthError
 */
export async function verifyAppleIdentityToken(
  identityToken: string
): Promise<AuthResult | AuthError> {
  if (!identityToken) {
    return {
      success: false,
      error: "Missing identity token",
      status: 401,
    };
  }

  const audience = process.env.APPLE_CLIENT_ID;
  if (!audience) {
    console.error("APPLE_CLIENT_ID environment variable not set");
    return {
      success: false,
      error: "Server configuration error",
      status: 500,
    };
  }

  return new Promise((resolve) => {
    jwt.verify(
      identityToken,
      getKey,
      {
        audience,
        issuer: "https://appleid.apple.com",
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) {
          console.error("Apple token verification failed:", err.message);
          resolve({
            success: false,
            error: "Invalid Apple identity token",
            status: 401,
          });
          return;
        }

        const payload = decoded as jwt.JwtPayload;

        if (!payload?.sub) {
          resolve({
            success: false,
            error: "Invalid Apple token payload: missing sub",
            status: 401,
          });
          return;
        }

        // ✅ Only return the stable Apple user ID - no email/name per policy
        resolve({
          success: true,
          user: {
            id: payload.sub,
          },
        });
      }
    );
  });
}

/**
 * @deprecated Use verifyAppleIdentityToken for /auth/apple endpoint.
 * This legacy function extracts token from Authorization header.
 * Kept for backward compatibility with existing routes during migration.
 */
export async function verifyAppleToken(
  request: Request
): Promise<AuthResult | AuthError> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: "Missing Authorization header",
      status: 401,
    };
  }

  const token = authHeader.replace("Bearer ", "");
  return verifyAppleIdentityToken(token);
}

/**
 * @deprecated Use session-based auth instead.
 */
export async function requireAuth(request: Request): Promise<AppleUser> {
  const result = await verifyAppleToken(request);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.user;
}
