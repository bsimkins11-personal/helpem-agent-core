import { useState, useEffect, useCallback, useRef } from "react";
import { Appointment } from "@/types/appointment";
import { getClientSessionToken } from "@/lib/clientSession";

interface UseCalendarEventsOptions {
  timeMin: Date;
  timeMax: Date;
}

interface CalendarEventsResult {
  events: Appointment[];
  googleConnected: boolean;
  appleConnected: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCalendarEvents(
  helpemAppointments: Appointment[],
  options: UseCalendarEventsOptions
): CalendarEventsResult {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [appleConnected, setAppleConnected] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<Appointment[]>([]);
  const [appleEvents, setAppleEvents] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<string>("");

  // Check connection status on mount
  useEffect(() => {
    const token = getClientSessionToken();
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    // Check Google and Apple connection status in parallel
    Promise.allSettled([
      fetch("/api/google/connection", { headers }).then(r => r.json()),
      fetch("/api/apple/connection", { headers }).then(r => r.json()),
    ]).then(([googleResult, appleResult]) => {
      if (googleResult.status === "fulfilled" && googleResult.value.connected) {
        setGoogleConnected(true);
      }
      if (appleResult.status === "fulfilled" && appleResult.value.connected) {
        setAppleConnected(true);
      }
    });
  }, []);

  // Fetch events from connected providers
  const fetchExternalEvents = useCallback(async () => {
    const token = getClientSessionToken();
    if (!token) return;
    if (!googleConnected && !appleConnected) return;

    const fetchKey = `${options.timeMin.toISOString()}-${options.timeMax.toISOString()}-${googleConnected}-${appleConnected}`;
    if (fetchKey === lastFetchRef.current) return;
    lastFetchRef.current = fetchKey;

    setLoading(true);
    setError(null);

    const headers = { Authorization: `Bearer ${token}` };
    const params = new URLSearchParams({
      timeMin: options.timeMin.toISOString(),
      timeMax: options.timeMax.toISOString(),
    });

    const fetches: Promise<void>[] = [];

    if (googleConnected) {
      fetches.push(
        fetch(`/api/google/calendar/events?${params}`, { headers })
          .then(r => r.json())
          .then(data => {
            if (data.events) {
              setGoogleEvents(
                data.events.map((e: Record<string, unknown>) => ({
                  id: e.googleEventId || e.id,
                  title: (e.title as string) || "Untitled Event",
                  withWhom: null,
                  topic: null,
                  location: (e.location as string) || null,
                  datetime: new Date(e.datetime as string),
                  endDatetime: e.endDatetime ? new Date(e.endDatetime as string) : undefined,
                  durationMinutes: e.endDatetime
                    ? Math.round((new Date(e.endDatetime as string).getTime() - new Date(e.datetime as string).getTime()) / 60000)
                    : 60,
                  createdAt: new Date(),
                  source: "google_calendar" as const,
                  isAllDay: e.isAllDay as boolean,
                  externalEventId: (e.googleEventId || e.id) as string,
                  htmlLink: e.htmlLink as string | undefined,
                  description: e.description as string | undefined,
                }))
              );
            }
          })
          .catch(err => {
            console.error("Failed to fetch Google Calendar events:", err);
          })
      );
    }

    if (appleConnected) {
      fetches.push(
        fetch(`/api/apple/calendar/events?${params}`, { headers })
          .then(r => r.json())
          .then(data => {
            if (data.events) {
              setAppleEvents(
                data.events.map((e: Record<string, unknown>) => ({
                  id: e.id as string,
                  title: (e.title as string) || "Untitled Event",
                  withWhom: null,
                  topic: null,
                  location: (e.location as string) || null,
                  datetime: new Date(e.datetime as string),
                  endDatetime: e.endDatetime ? new Date(e.endDatetime as string) : undefined,
                  durationMinutes: e.endDatetime
                    ? Math.round((new Date(e.endDatetime as string).getTime() - new Date(e.datetime as string).getTime()) / 60000)
                    : 60,
                  createdAt: new Date(),
                  source: "apple_calendar" as const,
                  isAllDay: e.isAllDay as boolean,
                  externalEventId: e.appleEventUrl
                    ? btoa(e.appleEventUrl as string)
                    : (e.id as string),
                  description: e.description as string | undefined,
                }))
              );
            }
          })
          .catch(err => {
            console.error("Failed to fetch Apple Calendar events:", err);
          })
      );
    }

    try {
      await Promise.allSettled(fetches);
    } catch (err) {
      setError("Failed to fetch calendar events");
    } finally {
      setLoading(false);
    }
  }, [googleConnected, appleConnected, options.timeMin, options.timeMax]);

  // Fetch when connections or date range change
  useEffect(() => {
    fetchExternalEvents();
  }, [fetchExternalEvents]);

  // Merge all event sources, sorted by datetime
  const events: Appointment[] = [
    ...helpemAppointments.map(a => ({ ...a, source: a.source || ("helpem" as const) })),
    ...googleEvents,
    ...appleEvents,
  ].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  return {
    events,
    googleConnected,
    appleConnected,
    loading,
    error,
    refetch: () => {
      lastFetchRef.current = "";
      fetchExternalEvents();
    },
  };
}
