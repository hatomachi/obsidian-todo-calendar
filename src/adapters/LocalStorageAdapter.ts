import { IStorageAdapter } from './IStorageAdapter';
import { CollectionData, ItemData, AgendaTodoItem, TodoItem } from '../types';
import { ItemType } from '../features/item-types/types';
import { getDefaultItemTypes } from '../features/item-types/templateUtils';

const STORAGE_KEYS = {
  COLLECTIONS: 'todo_cal_collections',
  ITEMS: 'todo_cal_items',
  TEMPLATES: 'todo_cal_templates',
};

const SEED_COLLECTIONS: CollectionData[] = [
  {
    id: 'col-default-1',
    filePath: '_todo-calendar/collections/col-default-1.md',
    title: '個人タスク',
    description: '日々のタスクと生活のTODO',
    color: 'purple',
    createdAt: new Date().toISOString(),
    itemCount: 2,
  },
  {
    id: 'col-default-2',
    filePath: '_todo-calendar/collections/col-default-2.md',
    title: '開発プロジェクト',
    description: 'モバイルWebアプリ開発',
    color: 'blue',
    createdAt: new Date().toISOString(),
    itemCount: 1,
  },
];

const SEED_ITEMS: ItemData[] = [
  {
    id: 'item-demo-1',
    collectionId: 'col-default-1',
    filePath: '_todo-calendar/items/col-default-1/item-demo-1.md',
    title: 'モバイルWeb版のセットアップ',
    status: 'todo',
    description: 'PWA対応とGitHub連携の動作確認を行う',
    createdAt: new Date().toISOString(),
    type: 'task',
    todos: [
      {
        id: 'todo-1',
        title: 'Safariでホーム画面に追加して起動テスト',
        due: new Date().toISOString().split('T')[0],
        status: 'todo',
        description: 'PWAとして全画面起動できるか確認',
      },
      {
        id: 'todo-2',
        title: 'GitHub PATを設定してVaultを同期',
        due: new Date().toISOString().split('T')[0],
        status: 'todo',
        description: 'プライベートリポジトリのタスクを読み書きする',
      },
    ],
  },
  {
    id: 'item-demo-2',
    collectionId: 'col-default-1',
    filePath: '_todo-calendar/items/col-default-1/item-demo-2.md',
    title: '日課の確認',
    status: 'todo',
    description: '毎日のルーティン',
    createdAt: new Date().toISOString(),
    type: 'routine',
    todos: [
      {
        id: 'todo-3',
        title: '朝のメール・Slackチェック',
        due: new Date().toISOString().split('T')[0],
        status: 'done',
        description: '',
      },
    ],
  },
];

export class LocalStorageAdapter implements IStorageAdapter {
  private getStoredCollections(): CollectionData[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    if (!raw) {
      this.saveStoredCollections(SEED_COLLECTIONS);
      return SEED_COLLECTIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return SEED_COLLECTIONS;
    }
  }

  private saveStoredCollections(collections: CollectionData[]) {
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
  }

  private getStoredItems(): ItemData[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
    if (!raw) {
      this.saveStoredItems(SEED_ITEMS);
      return SEED_ITEMS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return SEED_ITEMS;
    }
  }

  private saveStoredItems(items: ItemData[]) {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
  }

  async getCollections(): Promise<CollectionData[]> {
    const collections = this.getStoredCollections();
    const items = this.getStoredItems();
    return collections.map((col) => ({
      ...col,
      itemCount: items.filter((item) => item.collectionId === col.id).length,
    }));
  }

  async createCollection(title: string, description = ''): Promise<CollectionData> {
    const collections = this.getStoredCollections();
    const id = `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newCol: CollectionData = {
      id,
      filePath: `_todo-calendar/collections/${id}.md`,
      title: title.trim() || 'New Collection',
      description: description.trim(),
      color: 'purple',
      createdAt: new Date().toISOString(),
      itemCount: 0,
    };
    collections.push(newCol);
    this.saveStoredCollections(collections);
    return newCol;
  }

  async deleteCollection(collectionId: string): Promise<void> {
    let collections = this.getStoredCollections();
    collections = collections.filter((c) => c.id !== collectionId);
    this.saveStoredCollections(collections);

    let items = this.getStoredItems();
    items = items.filter((i) => i.collectionId !== collectionId);
    this.saveStoredItems(items);
  }

  async getItems(collectionId: string): Promise<ItemData[]> {
    const items = this.getStoredItems();
    return items
      .filter((i) => i.collectionId === collectionId)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  async createItem(
    collectionId: string,
    title: string,
    description = '',
    type?: string,
    template?: string,
    initialTodos: TodoItem[] = []
  ): Promise<ItemData> {
    const items = this.getStoredItems();
    const id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newItem: ItemData = {
      id,
      collectionId,
      filePath: `_todo-calendar/items/${collectionId}/${id}.md`,
      title: title.trim() || '新規アイテム',
      status: 'todo',
      description: description.trim(),
      createdAt: new Date().toISOString(),
      type,
      template,
      todos: initialTodos,
    };
    items.unshift(newItem);
    this.saveStoredItems(items);
    return newItem;
  }

  async updateItem(item: ItemData): Promise<void> {
    const items = this.getStoredItems();
    const index = items.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      items[index] = item;
      this.saveStoredItems(items);
    }
  }

  async deleteItem(item: ItemData): Promise<void> {
    let items = this.getStoredItems();
    items = items.filter((i) => i.id !== item.id);
    this.saveStoredItems(items);
  }

  async getItemsByType(typeId: string): Promise<ItemData[]> {
    const items = this.getStoredItems();
    return items
      .filter((i) => i.type === typeId)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  async getAllAgendaItems(): Promise<AgendaTodoItem[]> {
    const collections = await this.getCollections();
    const items = this.getStoredItems();
    const colMap = new Map(collections.map((c) => [c.id, c]));

    const agendaItems: AgendaTodoItem[] = [];
    for (const item of items) {
      const col = colMap.get(item.collectionId);
      if (col) {
        for (const todo of item.todos) {
          agendaItems.push({
            todo,
            item,
            collection: col,
          });
        }
      }
    }
    return agendaItems;
  }

  async loadTemplates(): Promise<ItemType[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (!raw) {
      const defaults = getDefaultItemTypes();
      this.saveTemplates(defaults);
      return defaults;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return getDefaultItemTypes();
    }
  }

  async saveTemplates(types: ItemType[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(types));
  }
}
