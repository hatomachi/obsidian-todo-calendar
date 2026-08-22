export type TodoStatus = 'todo' | 'done';

export interface TodoItem {
  id: string;
  title: string;
  due: string; // YYYY-MM-DD
  status: TodoStatus;
  description?: string;
}

export interface ItemData {
  id: string;
  collectionId: string;
  filePath: string;
  title: string;
  createdAt: string;
  todos: TodoItem[];
}

export interface CollectionData {
  id: string;
  filePath: string;
  title: string;
  description?: string;
  color?: string;
  createdAt: string;
  itemCount?: number;
}
