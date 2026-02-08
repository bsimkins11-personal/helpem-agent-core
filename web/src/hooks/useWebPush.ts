"use client";

import { useEffect, useState, useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

/**
 * Convert a base64 VAPID key to a Uint8Array for the pushManager.subscribe call.
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

type WebPushState = {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | "unsupported";
  loading: boolean;
  error: string | null;
};

type WebPushActions = {
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
};

export function useWebPush(): WebPushState & WebPushActions {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // Check current subscription state on mount
  useEffect(() => {
    if (!isSupported) return;

    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError("Push notifications not supported in this browser");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError("Notification permission denied");
        setLoading(false);
        return;
      }

      // 2. Get VAPID public key from backend
      const vapidRes = await fetch("/api/notifications/vapid-key");
      if (!vapidRes.ok) {
        throw new Error("Failed to get VAPID key");
      }
      const { publicKey } = await vapidRes.json();

      // 3. Subscribe via service worker
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 4. Send subscription to backend
      const regRes = await fetch("/api/notifications/register-web-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!regRes.ok) {
        throw new Error("Failed to register push subscription");
      }

      setIsSubscribed(true);
    } catch (err) {
      console.error("Web push subscribe error:", err);
      setError(err instanceof Error ? err.message : "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();

        // Unregister from backend
        await fetch("/api/notifications/unregister-device", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: subscription.endpoint }),
        });
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("Web push unsubscribe error:", err);
      setError(err instanceof Error ? err.message : "Failed to unsubscribe");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
  };
}
