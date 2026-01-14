import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const client = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

function getKey(header, callback) {
  if (!header.kid) {
    return callback(new Error("Missing kid in token header"));
  }

  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Verifies an Apple identity token (JWT string).
 * Used by /auth/apple endpoint.
 * 
 * Per policy: we do NOT store or expose Apple email or name.
 */
export async function verifyAppleIdentityToken(identityToken) {
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

        if (!decoded?.sub) {
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
            id: decoded.sub,
          },
        });
      }
    );
  });
}

/**
 * @deprecated Use verifyAppleIdentityToken for /auth/apple endpoint.
 * Legacy function for existing routes that use Authorization header.
 */
export async function verifyAppleToken(req) {
  const authHeader = req.headers.authorization;

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
