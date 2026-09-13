import { IStorageAdapter } from '../adapters/IStorageAdapter';
import { CollectionData, ItemData, AgendaTodoItem, TodoItem } from '../types';
import { ItemType } from '../features/item-types/types';
import { getDefaultItemTypes } from '../features/item-types/templateUtils';
import { ROOT_DATA_DIR, COLLECTIONS_DIR, ITEMS_DIR } from '../constants';
import { stringifyFrontmatter, normalizeTags } from '../utils/yaml';
import {
  DirtyEntry,
  SyncState,
  SyncStatus,
  SyncStateListener,
  BatchSyncItem,
} from './types';

export class SyncManager implements IStorageAdapter {
  private remoteAdapter: IStorageAdapter;
  private storageKey: string;

  // Local in-memory caches
  private collectionsCache: CollectionData[] = [];
  private itemsCache: ItemData[] = [];
  private templatesCache: ItemType[] = [];

  // Dirty queue: map of ID -> DirtyEntry (deduplicates updates to the same entity)
  private dirtyQueue: Map<string, DirtyEntry> = new Map();

  // Sync state & listeners
  private state: SyncState = {
    status: 'synced',
    pendingCount: 0,
    lastSyncedAt: null,
  };
  private listeners: Set<SyncStateListener> = new Set();

  // Timers & concurrency control
  private autoSyncTimer: number | null = null;
  private isSyncing = false;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(remoteAdapter: IStorageAdapter, storageKey: string) {
    this.remoteAdapter = remoteAdapter;
    this.storageKey = storageKey;

    this.loadFromStorage();
    this.setupLifecycleListeners();
  }

  // --- Storage Persistence Keys ---
  private get dirtyStorageKey(): string {
    return `todo_cal_sync_${this.storageKey}_dirty`;
  }
  private get collectionsStorageKey(): string {
    return `todo_cal_sync_${this.storageKey}_collections`;
  }
  private get itemsStorageKey(): string {
    return `todo_cal_sync_${this.storageKey}_items`;
  }
  private get templatesStorageKey(): string {
    return `todo_cal_sync_${this.storageKey}_templates`;
  }
  private get lastSyncStorageKey(): string {
    return `todo_cal_sync_${this.storageKey}_last_sync`;
  }

  // --- Persistence Handlers ---
  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      // 1. Load Dirty Queue
      const rawDirty = localStorage.getItem(this.dirtyStorageKey);
      if (rawDirty) {
        const parsedDirty = JSON.parse(rawDirty);
        if (Array.isArray(parsedDirty)) {
          this.dirtyQueue = new Map(parsedDirty.map((d: DirtyEntry) => [d.id, d]));
        }
      }

      // 2. Load Collections
      const rawCols = localStorage.getItem(this.collectionsStorageKey);
      if (rawCols) {
        this.collectionsCache = JSON.parse(rawCols);
      }

      // 3. Load Items
      const rawItems = localStorage.getItem(this.itemsStorageKey);
      if (rawItems) {
        this.itemsCache = JSON.parse(rawItems);
      }

      // 4. Load Templates
      const rawTemplates = localStorage.getItem(this.templatesStorageKey);
      if (rawTemplates) {
        this.templatesCache = JSON.parse(rawTemplates);
      } else {
        this.templatesCache = getDefaultItemTypes();
      }

      // 5. Load Last Sync Timestamp
      const rawLastSync = localStorage.getItem(this.lastSyncStorageKey);
      const lastSyncedAt = rawLastSync ? parseInt(rawLastSync, 10) : null;

      const pendingCount = this.dirtyQueue.size;
      this.state = {
        status: pendingCount > 0 ? 'pending' : 'synced',
        pendingCount,
        lastSyncedAt,
      };
    } catch (e) {
      console.warn('[SyncManager] Failed to load local cache from localStorage:', e);
    }
  }

  private saveDirtyToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const arr = Array.from(this.dirtyQueue.values());
      localStorage.setItem(this.dirtyStorageKey, JSON.stringify(arr));
    } catch (e) {
      console.warn('[SyncManager] Failed to save dirty queue to localStorage:', e);
    }
  }

  private saveCollectionsToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(this.collectionsStorageKey, JSON.stringify(this.collectionsCache));
    } catch (e) {
      console.warn('[SyncManager] Failed to save collections cache:', e);
    }
  }

  private saveItemsToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(this.itemsStorageKey, JSON.stringify(this.itemsCache));
    } catch (e) {
      console.warn('[SyncManager] Failed to save items cache:', e);
    }
  }

  private saveTemplatesToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(this.templatesStorageKey, JSON.stringify(this.templatesCache));
    } catch (e) {
      console.warn('[SyncManager] Failed to save templates cache:', e);
    }
  }

  // --- Lifecycle & Visibility Listeners ---
  private setupLifecycleListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('pagehide', this.handlePageHide);
  }

  private handleVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      if (this.dirtyQueue.size > 0) {
        console.log('[SyncManager] App going to background, flushing dirty queue...');
        this.syncNow();
      }
    }
  };

  private handlePageHide = (): void => {
    if (this.dirtyQueue.size > 0) {
      console.log('[SyncManager] Pagehide detected, triggering sync...');
      this.syncNow();
    }
  };

  public dispose(): void {
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('pagehide', this.handlePageHide);
    }
    this.listeners.clear();
  }

  // --- State Subscription ---
  public subscribe(listener: SyncStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): SyncState {
    return { ...this.state };
  }

  private updateState(partial: Partial<SyncState>): void {
    this.state = {
      ...this.state,
      ...partial,
      pendingCount: this.dirtyQueue.size,
    };
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (e) {
        console.error('[SyncManager] Listener error:', e);
      }
    }
  }

  // --- Debounced Auto Sync (5s idle) ---
  private scheduleAutoSync(): void {
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
    }
    this.autoSyncTimer = window.setTimeout(() => {
      this.autoSyncTimer = null;
      this.syncNow();
    }, 5000);
  }

  // --- Mark Dirty & Local 0ms Action ---
  private markDirty(entry: DirtyEntry): void {
    // If an item was created locally and now deleted before ever syncing, simply remove it
    if (entry.action === 'item_delete') {
      const existing = this.dirtyQueue.get(entry.id);
      if (existing && existing.action === 'item_upsert' && !this.isKnownOnRemote(entry.filePath)) {
        this.dirtyQueue.delete(entry.id);
        this.saveDirtyToStorage();
        this.updateState({
          status: this.dirtyQueue.size > 0 ? 'pending' : 'synced',
        });
        return;
      }
    }

    this.dirtyQueue.set(entry.id, entry);
    this.saveDirtyToStorage();
    this.updateState({ status: 'pending', errorMessage: undefined });
    this.scheduleAutoSync();
  }

  private isKnownOnRemote(filePath: string): boolean {
    // If lastSyncedAt is set, it might exist on remote unless newly generated id
    return Boolean(this.state.lastSyncedAt);
  }

  // --- Markdown Converters ---
  private itemToMarkdown(item: ItemData): string {
    const frontmatter: Record<string, any> = {
      id: item.id,
      collection_id: item.collectionId,
      title: item.title,
      status: item.status === 'done' ? 'done' : 'todo',
      description: item.description || '',
      created_at: item.createdAt,
      todos: (item.todos || []).map((t) => ({
        id: t.id,
        title: t.title,
        due: t.due,
        status: t.status,
        description: t.description || '',
        ...(t.group ? { group: t.group } : {}),
      })),
    };
    if (item.assignee) frontmatter.assignee = item.assignee;
    if (item.type) frontmatter.type = item.type;
    if (item.template) frontmatter.template = item.template;

    return stringifyFrontmatter(frontmatter, `# ${item.title}\n`);
  }

  private collectionToMarkdown(col: CollectionData): string {
    const frontmatter: Record<string, any> = {
      id: col.id,
      title: col.title.trim() || 'Untitled Collection',
      description: (col.description || '').trim(),
      created_at: col.createdAt,
    };
    const cleanTags = normalizeTags(col.tags);
    if (cleanTags.length > 0) {
      frontmatter.tags = cleanTags;
    }
    if (col.color) {
      frontmatter.color = col.color;
    }
    return stringifyFrontmatter(frontmatter, `# ${col.title}\n`);
  }

  // --- Initial Remote Pull / Refresh ---
  public async pullRemote(): Promise<void> {
    if (this.isSyncing) return;

    try {
      this.updateState({ status: 'syncing' });

      // 1. Fetch remote collections
      const remoteCols = await this.remoteAdapter.getCollections();

      // 2. Fetch remote items for all collections
      const remoteItems: ItemData[] = [];
      for (const col of remoteCols) {
        const colItems = await this.remoteAdapter.getItems(col.id);
        remoteItems.push(...colItems);
      }

      // 3. Fetch remote templates
      const remoteTemplates = await this.remoteAdapter.loadTemplates();

      // Merge policy: Local Dirty entries take absolute precedence
      const dirtyIds = new Set(this.dirtyQueue.keys());

      // Merge collections
      const mergedCols = [...remoteCols];
      for (const localCol of this.collectionsCache) {
        if (dirtyIds.has(localCol.id)) {
          const idx = mergedCols.findIndex((c) => c.id === localCol.id);
          if (idx !== -1) {
            mergedCols[idx] = localCol;
          } else {
            mergedCols.unshift(localCol);
          }
        }
      }
      this.collectionsCache = mergedCols;
      this.saveCollectionsToStorage();

      // Merge items
      const mergedItems = [...remoteItems];
      for (const localItem of this.itemsCache) {
        if (dirtyIds.has(localItem.id)) {
          const idx = mergedItems.findIndex((i) => i.id === localItem.id);
          if (idx !== -1) {
            mergedItems[idx] = localItem;
          } else {
            mergedItems.unshift(localItem);
          }
        }
      }
      this.itemsCache = mergedItems;
      this.saveItemsToStorage();

      // Merge templates
      if (dirtyIds.has('__templates__')) {
        // Keep local dirty templates
      } else {
        this.templatesCache = remoteTemplates;
        this.saveTemplatesToStorage();
      }

      const now = Date.now();
      localStorage.setItem(this.lastSyncStorageKey, String(now));
      this.isInitialized = true;

      this.updateState({
        status: this.dirtyQueue.size > 0 ? 'pending' : 'synced',
        lastSyncedAt: now,
        errorMessage: undefined,
      });
    } catch (e: any) {
      console.warn('[SyncManager] Failed to pull from remote:', e);
      this.updateState({
        status: this.dirtyQueue.size > 0 ? 'pending' : 'error',
        errorMessage: e.message || 'リモートからのデータ取得に失敗しました',
      });
    }
  }

  // --- Flush Dirty Queue to Remote (Batch Commit) ---
  public async syncNow(): Promise<void> {
    if (this.isSyncing) return;
    if (this.dirtyQueue.size === 0) {
      // Nothing to push, trigger a refresh/pull instead
      await this.pullRemote();
      return;
    }

    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }

    this.isSyncing = true;
    this.updateState({ status: 'syncing', errorMessage: undefined });

    // Snapshot of entries to sync in this batch
    const entriesToSync = Array.from(this.dirtyQueue.values());

    try {
      // Build BatchSyncItem list
      const batchItems: BatchSyncItem[] = [];

      for (const entry of entriesToSync) {
        if (entry.action === 'item_delete' || entry.action === 'collection_delete') {
          batchItems.push({
            action: 'delete',
            filePath: entry.filePath,
          });
        } else if (entry.action === 'item_upsert') {
          const item = entry.data as ItemData;
          batchItems.push({
            action: 'upsert',
            filePath: entry.filePath,
            content: this.itemToMarkdown(item),
          });
        } else if (entry.action === 'collection_upsert') {
          const col = entry.data as CollectionData;
          batchItems.push({
            action: 'upsert',
            filePath: entry.filePath,
            content: this.collectionToMarkdown(col),
          });
        } else if (entry.action === 'templates_update') {
          const types = entry.data as ItemType[];
          batchItems.push({
            action: 'upsert',
            filePath: `${ROOT_DATA_DIR}/templates.json`,
            content: JSON.stringify({ types }, null, 2),
          });
        }
      }

      // Execute batch sync on remote adapter
      if (this.remoteAdapter.batchSync) {
        await this.remoteAdapter.batchSync(batchItems);
      } else {
        // Fallback: sequential operations
        for (const entry of entriesToSync) {
          if (entry.action === 'item_upsert') {
            await this.remoteAdapter.updateItem(entry.data as ItemData);
          } else if (entry.action === 'item_delete') {
            await this.remoteAdapter.deleteItem({ filePath: entry.filePath } as ItemData);
          } else if (entry.action === 'collection_upsert') {
            await this.remoteAdapter.updateCollection(entry.data as CollectionData);
          } else if (entry.action === 'collection_delete') {
            await this.remoteAdapter.deleteCollection(entry.id);
          } else if (entry.action === 'templates_update') {
            await this.remoteAdapter.saveTemplates(entry.data as ItemType[]);
          }
        }
      }

      // Remove successfully synced entries from dirty queue
      for (const entry of entriesToSync) {
        const current = this.dirtyQueue.get(entry.id);
        // Only remove if timestamp didn't change while syncing
        if (current && current.timestamp === entry.timestamp) {
          this.dirtyQueue.delete(entry.id);
        }
      }
      this.saveDirtyToStorage();

      const now = Date.now();
      localStorage.setItem(this.lastSyncStorageKey, String(now));

      this.updateState({
        status: this.dirtyQueue.size > 0 ? 'pending' : 'synced',
        lastSyncedAt: now,
        errorMessage: undefined,
      });
    } catch (e: any) {
      console.error('[SyncManager] Sync failed:', e);
      this.updateState({
        status: 'error',
        errorMessage: e.message || '同期エラーが発生しました',
      });
    } finally {
      this.isSyncing = false;
    }
  }

  // ==========================================
  // IStorageAdapter Implementation (Local 0ms)
  // ==========================================

  async getCollections(): Promise<CollectionData[]> {
    // If not yet initialized and has no local cache, try to pull remote
    if (!this.isInitialized && this.collectionsCache.length === 0) {
      if (!this.initPromise) {
        this.initPromise = this.pullRemote();
      }
      await this.initPromise;
    }

    // Calculate itemCount dynamically from local itemsCache
    return this.collectionsCache.map((col) => ({
      ...col,
      itemCount: this.itemsCache.filter((i) => i.collectionId === col.id).length,
    }));
  }

  async createCollection(title: string, description = '', tags: string[] = []): Promise<CollectionData> {
    const id = `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const cleanTags = normalizeTags(tags);
    const createdAt = new Date().toISOString();

    const newCol: CollectionData = {
      id,
      filePath: `${COLLECTIONS_DIR}/${id}.md`,
      title: title.trim() || 'New Collection',
      description: description.trim(),
      color: 'purple',
      createdAt,
      itemCount: 0,
      tags: cleanTags,
    };

    this.collectionsCache.unshift(newCol);
    this.saveCollectionsToStorage();

    this.markDirty({
      id,
      action: 'collection_upsert',
      filePath: newCol.filePath,
      data: newCol,
      timestamp: Date.now(),
    });

    return newCol;
  }

  async updateCollection(collection: CollectionData): Promise<void> {
    const idx = this.collectionsCache.findIndex((c) => c.id === collection.id);
    const updated: CollectionData = {
      ...collection,
      title: collection.title.trim(),
      description: (collection.description || '').trim(),
      tags: normalizeTags(collection.tags),
      filePath: collection.filePath || `${COLLECTIONS_DIR}/${collection.id}.md`,
    };

    if (idx !== -1) {
      this.collectionsCache[idx] = updated;
    } else {
      this.collectionsCache.push(updated);
    }
    this.saveCollectionsToStorage();

    this.markDirty({
      id: updated.id,
      action: 'collection_upsert',
      filePath: updated.filePath,
      data: updated,
      timestamp: Date.now(),
    });
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const col = this.collectionsCache.find((c) => c.id === collectionId);
    const filePath = col?.filePath || `${COLLECTIONS_DIR}/${collectionId}.md`;

    this.collectionsCache = this.collectionsCache.filter((c) => c.id !== collectionId);
    this.saveCollectionsToStorage();

    // Also remove items belonging to this collection locally
    const itemsToDelete = this.itemsCache.filter((i) => i.collectionId === collectionId);
    this.itemsCache = this.itemsCache.filter((i) => i.collectionId !== collectionId);
    this.saveItemsToStorage();

    // Mark collection deleted
    this.markDirty({
      id: collectionId,
      action: 'collection_delete',
      filePath,
      timestamp: Date.now(),
    });

    // Mark each item deleted
    for (const item of itemsToDelete) {
      this.markDirty({
        id: item.id,
        action: 'item_delete',
        filePath: item.filePath,
        timestamp: Date.now(),
      });
    }
  }

  async getItems(collectionId: string): Promise<ItemData[]> {
    if (!this.isInitialized && this.itemsCache.length === 0) {
      if (!this.initPromise) {
        this.initPromise = this.pullRemote();
      }
      await this.initPromise;
    }

    return this.itemsCache
      .filter((i) => i.collectionId === collectionId)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  async createItem(
    collectionId: string,
    title: string,
    description = '',
    type?: string,
    template?: string,
    initialTodos: TodoItem[] = [],
    assignee?: string
  ): Promise<ItemData> {
    const id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const filePath = `${ITEMS_DIR}/${collectionId}/${id}.md`;
    const createdAt = new Date().toISOString();

    const newItem: ItemData = {
      id,
      collectionId,
      filePath,
      title: title.trim() || '新規アイテム',
      status: 'todo',
      description: description.trim(),
      createdAt,
      type,
      template,
      assignee,
      todos: initialTodos,
    };

    this.itemsCache.unshift(newItem);
    this.saveItemsToStorage();

    // Update parent collection itemCount in local cache
    const colIdx = this.collectionsCache.findIndex((c) => c.id === collectionId);
    if (colIdx !== -1) {
      this.collectionsCache[colIdx] = {
        ...this.collectionsCache[colIdx],
        itemCount: (this.collectionsCache[colIdx].itemCount || 0) + 1,
      };
      this.saveCollectionsToStorage();
    }

    this.markDirty({
      id,
      action: 'item_upsert',
      filePath,
      data: newItem,
      timestamp: Date.now(),
    });

    return newItem;
  }

  async updateItem(item: ItemData): Promise<void> {
    const idx = this.itemsCache.findIndex((i) => i.id === item.id);
    if (idx !== -1) {
      this.itemsCache[idx] = item;
    } else {
      this.itemsCache.unshift(item);
    }
    this.saveItemsToStorage();

    this.markDirty({
      id: item.id,
      action: 'item_upsert',
      filePath: item.filePath,
      data: item,
      timestamp: Date.now(),
    });
  }

  async deleteItem(item: ItemData): Promise<void> {
    this.itemsCache = this.itemsCache.filter((i) => i.id !== item.id);
    this.saveItemsToStorage();

    // Update parent collection itemCount in local cache
    const colIdx = this.collectionsCache.findIndex((c) => c.id === item.collectionId);
    if (colIdx !== -1) {
      this.collectionsCache[colIdx] = {
        ...this.collectionsCache[colIdx],
        itemCount: Math.max(0, (this.collectionsCache[colIdx].itemCount || 1) - 1),
      };
      this.saveCollectionsToStorage();
    }

    this.markDirty({
      id: item.id,
      action: 'item_delete',
      filePath: item.filePath,
      timestamp: Date.now(),
    });
  }

  async getItemsByType(typeId: string): Promise<ItemData[]> {
    if (!this.isInitialized && this.itemsCache.length === 0) {
      if (!this.initPromise) {
        this.initPromise = this.pullRemote();
      }
      await this.initPromise;
    }

    return this.itemsCache
      .filter((i) => i.type === typeId)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  async getAllAgendaItems(): Promise<AgendaTodoItem[]> {
    if (!this.isInitialized && this.itemsCache.length === 0) {
      if (!this.initPromise) {
        this.initPromise = this.pullRemote();
      }
      await this.initPromise;
    }

    const colMap = new Map(this.collectionsCache.map((c) => [c.id, c]));
    const agendaItems: AgendaTodoItem[] = [];

    for (const item of this.itemsCache) {
      const col = colMap.get(item.collectionId) || {
        id: item.collectionId,
        filePath: `${COLLECTIONS_DIR}/${item.collectionId}.md`,
        title: 'Unknown Collection',
        description: '',
        color: 'purple',
        createdAt: new Date().toISOString(),
        itemCount: 0,
      };

      for (const todo of item.todos || []) {
        agendaItems.push({
          todo,
          item,
          collection: col,
        });
      }
    }

    return agendaItems;
  }

  async loadTemplates(): Promise<ItemType[]> {
    if (this.templatesCache.length > 0) {
      return this.templatesCache;
    }
    const types = await this.remoteAdapter.loadTemplates();
    this.templatesCache = types;
    this.saveTemplatesToStorage();
    return types;
  }

  async saveTemplates(types: ItemType[]): Promise<void> {
    this.templatesCache = types;
    this.saveTemplatesToStorage();

    this.markDirty({
      id: '__templates__',
      action: 'templates_update',
      filePath: `${ROOT_DATA_DIR}/templates.json`,
      data: types,
      timestamp: Date.now(),
    });
  }
}
