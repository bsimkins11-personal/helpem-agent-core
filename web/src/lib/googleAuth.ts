import jwt, { JwtHeader } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const client = jwksClient({
  jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
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

export interface GoogleUser {
  id: string;    // Google's stable sub identifier
  email: string | null;
  name: string | null;
}

export interface GoogleAuthResult {
  success: true;
  user: GoogleUser;
}

export interface GoogleAuthError {
  success: false;
  error: string;
  status: number;
}

/**
 * Verifies a Google ID token (JWT from Google Identity Services).
 */
export async function verifyGoogleIdToken(
  idToken: string
): Promise<GoogleAuthResult | GoogleAuthError> {
  if (!idToken) {
    return {
      success: false,
      error: "Missing ID token",
      status: 401,
    };
  }

  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) {
    console.error("GOOGLE_CLIENT_ID environment variable not set");
    return {
      success: false,
      error: "Server configuration error",
      status: 500,
    };
  }

  return new Promise((resolve) => {
    jwt.verify(
      idToken,
      getKey,
      {
        audience,
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) {
          console.error("Google token verification failed:", err.message);
          resolve({
            success: false,
            error: "Invalid Google ID token",
            status: 401,
          });
          return;
        }

        const payload = decoded as jwt.JwtPayload;

        if (!payload?.sub) {
          resolve({
            success: false,
            error: "Invalid Google token payload: missing sub",
            status: 401,
          });
          return;
        }

        resolve({
          success: true,
          user: {
            id: payload.sub,
            email: (payload.email as string) || null,
            name: (payload.name as string) || null,
          },
        });
      }
    );
  });
}
