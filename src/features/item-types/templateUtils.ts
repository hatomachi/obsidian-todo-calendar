import { ItemData, TodoItem } from '../../types';
import { ItemTemplate, ItemType, TemplateCheckResult, TemplateTodoDef } from './types';

/**
 * Check if a todo title matches a template definition title
 * Matching rule: Case-insensitive, trimmed, and allows prefix match or inclusion.
 * e.g., Template "本番作業" matches "本番作業", "本番作業 (22:00〜)", "本番作業【仮】"
 */
export function isTitleMatch(todoTitle: string, templateTitle: string): boolean {
  const normTodo = todoTitle.trim().toLowerCase();
  const normTpl = templateTitle.trim().toLowerCase();
  if (!normTodo || !normTpl) return false;

  return normTodo.startsWith(normTpl) || normTodo.includes(normTpl);
}

/**
 * Validate item's todos against the given template definition
 */
export function checkTemplateStatus(
  item: ItemData,
  template?: ItemTemplate | null
): TemplateCheckResult {
  if (!template || !template.todos || template.todos.length === 0) {
    return {
      hasTemplate: false,
      missingTodos: [],
      missingDueTodos: [],
      matchedTodosCount: 0,
      totalTemplateTodosCount: 0,
      isComplete: true,
    };
  }

  const missingTodos: TemplateTodoDef[] = [];
  const missingDueTodos: TodoItem[] = [];
  let matchedTodosCount = 0;

  for (const tplTodo of template.todos) {
    // Find matching todo in item.todos
    const matchedTodo = item.todos.find((t) => isTitleMatch(t.title, tplTodo.title));

    if (!matchedTodo) {
      missingTodos.push(tplTodo);
    } else {
      matchedTodosCount++;
      // Check if due date is empty
      if (!matchedTodo.due || matchedTodo.due.trim() === '') {
        missingDueTodos.push(matchedTodo);
      }
    }
  }

  const isComplete = missingTodos.length === 0 && missingDueTodos.length === 0;

  return {
    hasTemplate: true,
    missingTodos,
    missingDueTodos,
    matchedTodosCount,
    totalTemplateTodosCount: template.todos.length,
    isComplete,
  };
}

/**
 * Find ItemType by type id or name
 */
export function findItemType(types: ItemType[], typeIdOrName?: string): ItemType | undefined {
  if (!typeIdOrName) return undefined;
  return types.find((t) => t.id === typeIdOrName || t.name === typeIdOrName);
}

/**
 * Find ItemTemplate in an ItemType by template id or name
 */
export function findItemTemplate(
  itemType?: ItemType,
  templateIdOrName?: string
): ItemTemplate | undefined {
  if (!itemType || !templateIdOrName) return undefined;
  return (
    itemType.templates.find((tpl) => tpl.id === templateIdOrName || tpl.name === templateIdOrName) ||
    itemType.templates[0] // fallback to first template
  );
}

/**
 * Default initial template seed data
 */
export function getDefaultItemTypes(): ItemType[] {
  return [
    {
      id: 'release',
      name: 'リリース',
      icon: 'rocket',
      color: 'blue',
      templates: [
        {
          id: 'rel_standard',
          name: '通常リリース',
          todos: [
            { title: 'リリース計画策定', group: '計画' },
            { title: '部内事前レビュー', group: '審査' },
            { title: '本番リリース申請 ＆ 部一覧起票', group: '申請' },
            { title: '本番作業', group: '当日' },
            { title: '事後動作確認・完了報告', group: '当日' },
          ],
        },
        {
          id: 'rel_emergency',
          name: '緊急パッチリリース',
          todos: [
            { title: '緊急リリース申請', group: '申請' },
            { title: 'パッチ適用作業', group: '当日' },
            { title: '事後検証・報告', group: '当日' },
          ],
        },
      ],
    },
    {
      id: 'estimate',
      name: '見積',
      icon: 'calculator',
      color: 'green',
      templates: [
        {
          id: 'est_standard',
          name: '標準見積',
          todos: [
            { title: '工数算出・見積ドラフト作成', group: '作成' },
            { title: 'グループレビュー', group: '審査' },
            { title: '部内レビュー', group: '審査' },
            { title: '顧客・関連部署提出', group: '提出' },
          ],
        },
      ],
    },
    {
      id: 'incident',
      name: '障害対応',
      icon: 'alert-triangle',
      color: 'red',
      templates: [
        {
          id: 'inc_standard',
          name: '障害対応・報告',
          todos: [
            { title: '初動調査・暫定復旧対応', group: '初動' },
            { title: '関係者への速報連絡', group: '報告' },
            { title: '恒久対策検討・修正', group: '対策' },
            { title: '障害報告書作成・部内レビュー', group: '報告' },
          ],
        },
      ],
    },
  ];
}
