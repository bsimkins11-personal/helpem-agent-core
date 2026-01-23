export type HabitCompletion = {
  date: Date;
};

export type Habit = {
  id: string;
  title: string;
  frequency: "daily" | "weekly";
  daysOfWeek?: string[]; // optional list of days, e.g., ["monday","wednesday"]
  createdAt: Date;
  completions: HabitCompletion[];
  addedByTribeId?: string | null;
  addedByTribeName?: string | null;
};

export type CreateHabitInput = Omit<Habit, 'id' | 'createdAt' | 'completions'>;
