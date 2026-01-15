export type Appointment = {
  id: string;
  title: string;
  datetime: Date;
  createdAt: Date;
};

export type CreateAppointmentInput = Omit<Appointment, 'id' | 'createdAt'>;
