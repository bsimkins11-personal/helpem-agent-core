/**
 * Browser Notification utilities
 * Handles permission requests and notification display
 */

const AUTO_CLOSE_DELAY_MS = 10000;

/**
 * Request notification permission from the browser
 * @returns Promise resolving to whether permission was granted
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission === "denied") {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch {
    return false;
  }
}

/**
 * Send a browser notification
 * @param title - Notification title
 * @param options - Standard NotificationOptions
 */
export function sendNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === "undefined" || Notification.permission !== "granted") {
    return;
  }

  try {
    const notification = new Notification(title, {
      icon: "/logo.png",
      badge: "/logo.png",
      ...options,
    });

    // Auto-close after delay
    const timeoutId = setTimeout(() => notification.close(), AUTO_CLOSE_DELAY_MS);

    // Focus window on click
    notification.onclick = () => {
      window.focus();
      notification.close();
      clearTimeout(timeoutId);
    };
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}
