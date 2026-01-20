export type Appointment = {
  id: string;
  title: string;
  withWhom: string | null;
  datetime: Date;
  durationMinutes: number;
  createdAt: Date;
};

export type CreateAppointmentInput = Omit<Appointment, 'id' | 'createdAt'>;
