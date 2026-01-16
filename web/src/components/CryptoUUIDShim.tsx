"use client";

import { v4 as uuidv4 } from "uuid";

if (typeof crypto !== "undefined" && !crypto.randomUUID) {
  (crypto as Crypto & { randomUUID?: () => `${string}-${string}-${string}-${string}-${string}` }).randomUUID = () =>
    uuidv4() as `${string}-${string}-${string}-${string}-${string}`;
}

export function CryptoUUIDShim() {
  return null;
}
