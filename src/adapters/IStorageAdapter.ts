import { CollectionData, ItemData, AgendaTodoItem, TodoItem } from '../types';
import { ItemType } from '../features/item-types/types';

export interface IStorageAdapter {
  /**
   * Get all collections
   */
  getCollections(): Promise<CollectionData[]>;

  /**
   * Create a new collection
   */
  createCollection(title: string, description?: string): Promise<CollectionData>;

  /**
   * Delete a collection and its items
   */
  deleteCollection(collectionId: string): Promise<void>;

  /**
   * Get items in a specific collection
   */
  getItems(collectionId: string): Promise<ItemData[]>;

  /**
   * Create a new item in a collection
   */
  createItem(
    collectionId: string,
    title: string,
    description?: string,
    type?: string,
    template?: string,
    initialTodos?: TodoItem[]
  ): Promise<ItemData>;

  /**
   * Save / update an item
   */
  updateItem(item: ItemData): Promise<void>;

  /**
   * Delete an item
   */
  deleteItem(item: ItemData): Promise<void>;

  /**
   * Get all items of a specific type across all collections
   */
  getItemsByType(typeId: string): Promise<ItemData[]>;

  /**
   * Get all TODO items across all collections for Agenda view
   */
  getAllAgendaItems(): Promise<AgendaTodoItem[]>;

  /**
   * Load item type templates
   */
  loadTemplates(): Promise<ItemType[]>;

  /**
   * Save item type templates
   */
  saveTemplates(types: ItemType[]): Promise<void>;
}
