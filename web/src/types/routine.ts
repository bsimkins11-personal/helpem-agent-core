export type RoutineCategory = "groceries" | "general";

export type RoutineItem = {
  id: string;
  content: string;
  addedAt: Date;
  completed?: boolean;
  completedAt?: Date;
};

export type Routine = {
  id: string;
  category: RoutineCategory;
  title: string; // e.g., "Groceries", "Weekly Chores"
  items: RoutineItem[];
  createdAt: Date;
};

export type CreateRoutineInput = Omit<Routine, 'id' | 'createdAt' | 'items'>;
export type AddRoutineItemInput = {
  routineId: string;
  content: string;
};
