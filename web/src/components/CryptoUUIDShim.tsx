"use client";

import { v4 as uuidv4 } from "uuid";

if (typeof crypto !== "undefined" && !crypto.randomUUID) {
  (crypto as Crypto & { randomUUID?: () => string }).randomUUID = () => uuidv4();
}

export function CryptoUUIDShim() {
  return null;
}
