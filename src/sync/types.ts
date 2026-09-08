import { CollectionData, ItemData } from '../types';
import { ItemType } from '../features/item-types/types';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

export type DirtyActionType =
  | 'item_upsert'
  | 'item_delete'
  | 'collection_upsert'
  | 'collection_delete'
  | 'templates_update';

export interface DirtyEntry {
  id: string;
  action: DirtyActionType;
  filePath: string;
  data?: ItemData | CollectionData | ItemType[];
  timestamp: number;
}

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: number | null;
  errorMessage?: string;
}

export type SyncStateListener = (state: SyncState) => void;

export interface BatchSyncItem {
  action: 'upsert' | 'delete';
  filePath: string;
  content?: string;
}
