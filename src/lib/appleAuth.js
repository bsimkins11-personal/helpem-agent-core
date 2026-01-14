import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const client = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
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
 * Verifies an Apple identity token from the Authorization header.
 * Works with Express request objects.
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

  return new Promise((resolve) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: process.env.APPLE_CLIENT_ID,
        issuer: "https://appleid.apple.com",
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) {
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
            error: "Invalid Apple token payload",
            status: 401,
          });
          return;
        }

        resolve({
          success: true,
          user: {
            id: decoded.sub,    // 🔑 stable Apple user ID
            email: decoded.email,
          },
        });
      }
    );
  });
}
