import { TodoItem } from '../../types';

export interface TemplateTodoDef {
  title: string;
  group?: string;
}

export interface ItemTemplate {
  id: string;
  name: string;
  todos: TemplateTodoDef[];
}

export interface ItemType {
  id: string;
  name: string;
  icon?: string;
  color?: string; // e.g., 'blue', 'green', 'purple', 'orange', 'red', 'cyan'
  templates: ItemTemplate[];
}

export interface TemplateCheckResult {
  hasTemplate: boolean;
  missingTodos: TemplateTodoDef[];
  missingDueTodos: TodoItem[];
  matchedTodosCount: number;
  totalTemplateTodosCount: number;
  isComplete: boolean;
}
