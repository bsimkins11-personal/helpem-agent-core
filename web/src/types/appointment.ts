export type CalendarSource = 'helpem' | 'google_calendar' | 'apple_calendar';

export type Appointment = {
  id: string;
  title: string;
  withWhom: string | null;
  topic: string | null;
  location: string | null;
  datetime: Date;
  durationMinutes: number;
  createdAt: Date;
  addedByTribeId?: string | null;
  addedByTribeName?: string | null;
  source?: CalendarSource;
  endDatetime?: Date;
  isAllDay?: boolean;
  externalEventId?: string;
  htmlLink?: string;
  description?: string;
};

export type CreateAppointmentInput = Omit<Appointment, 'id' | 'createdAt'>;
