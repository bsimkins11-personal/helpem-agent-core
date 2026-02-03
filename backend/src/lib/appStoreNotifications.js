import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";

const APPLE_NOTIFICATION_JWKS_URL = "https://api.storekit.itunes.apple.com/in-app/v1/notifications/jwsPublicKeys";

const jwksClient = jwksRsa({
  cache: true,
  cacheMaxEntries: 5,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
  jwksUri: APPLE_NOTIFICATION_JWKS_URL,
});

function getKey(header, callback) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export async function decodeSignedPayload(signedPayload) {
  return jwt.decode(signedPayload, { complete: true });
}

export async function verifySignedPayload(signedPayload) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      signedPayload,
      getKey,
      {
        algorithms: ["ES256"],
        ignoreExpiration: true,
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });
}

export async function verifyOrDecodeSignedPayload(signedPayload, { verify = false } = {}) {
  if (verify) {
    const decoded = await verifySignedPayload(signedPayload);
    return { decoded, verified: true };
  }

  const decoded = await decodeSignedPayload(signedPayload);
  return { decoded: decoded?.payload ?? decoded, verified: false };
}

export async function verifyNestedSignedPayload(signedPayload, { verify = false } = {}) {
  if (!signedPayload) return { decoded: null, verified: false };
  if (verify) {
    const decoded = await verifySignedPayload(signedPayload);
    return { decoded, verified: true };
  }
  const decoded = await decodeSignedPayload(signedPayload);
  return { decoded: decoded?.payload ?? decoded, verified: false };
}
