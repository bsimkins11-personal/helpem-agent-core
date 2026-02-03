import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const APP_STORE_BASE = "https://api.storekit.itunes.apple.com/in-app/v1";

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

export function createAppStoreServerJwt() {
  const issuerId = getEnv("APP_STORE_ISSUER_ID");
  const keyId = getEnv("APP_STORE_KEY_ID");
  const bundleId = getEnv("APP_STORE_BUNDLE_ID");
  const privateKey = getEnv("APP_STORE_PRIVATE_KEY").replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 1200,
    aud: "appstoreconnect-v1",
    bid: bundleId,
  };

  return jwt.sign(payload, privateKey, {
    algorithm: "ES256",
    header: {
      kid: keyId,
      typ: "JWT",
    },
  });
}

export async function extendSubscriptionRenewalDate(originalTransactionId, extendByDays = 30) {
  const token = createAppStoreServerJwt();
  const requestIdentifier = crypto.randomUUID();

  const res = await fetch(`${APP_STORE_BASE}/subscriptions/extend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      originalTransactionId,
      extendByDays,
      extendReasonCode: 1,
      requestIdentifier,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`App Store extend failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return { data, requestIdentifier };
}
