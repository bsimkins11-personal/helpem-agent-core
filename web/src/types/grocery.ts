export type Grocery = {
  id: string;
  content: string;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  addedByTribeId?: string | null;
  addedByTribeName?: string | null;
};

export type CreateGroceryInput = {
  content: string;
};

export type UpdateGroceryInput = {
  id: string;
  content?: string;
  completed?: boolean;
};
