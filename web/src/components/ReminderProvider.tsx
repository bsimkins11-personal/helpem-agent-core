"use client";

import { useReminders } from "@/hooks/useReminders";

export function ReminderProvider({ children }: { children: React.ReactNode }) {
  useReminders();
  return <>{children}</>;
}
