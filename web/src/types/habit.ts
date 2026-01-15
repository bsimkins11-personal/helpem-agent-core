export type HabitCompletion = {
  date: Date;
};

export type Habit = {
  id: string;
  title: string;
  frequency: "daily" | "weekly";
  createdAt: Date;
  completions: HabitCompletion[];
};

export type CreateHabitInput = Omit<Habit, 'id' | 'createdAt' | 'completions'>;
