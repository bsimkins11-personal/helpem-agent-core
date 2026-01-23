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
};

export type CreateAppointmentInput = Omit<Appointment, 'id' | 'createdAt'>;
