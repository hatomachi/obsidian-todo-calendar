import React, { useState, useEffect, useCallback } from 'react';
import { App } from 'obsidian';
import { StorageManager } from '../storage';
import { CollectionData, ItemData, TodoStatus } from '../types';
import { HeaderNav } from './HeaderNav';
import { CollectionsGrid } from './CollectionsGrid';
import { CalendarMatrixView } from './CalendarMatrixView';
import { TaskDetailDrawer } from './TaskDetailDrawer';

interface AppViewProps {
  app: App;
}

export const AppView: React.FC<AppViewProps> = ({ app }) => {
  const [storage] = useState(() => new StorageManager(app));

  const [viewMode, setViewMode] = useState<'collections' | 'calendar'>('collections');
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<CollectionData | null>(null);

  const [items, setItems] = useState<ItemData[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [startDate, setStartDate] = useState<Date>(() => new Date());
  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');

  // Load collections
  const loadCollections = useCallback(async () => {
    const cols = await storage.getCollections();
    setCollections(cols);
  }, [storage]);

  // Load items for selected collection
  const loadItems = useCallback(async (colId: string) => {
    const loadedItems = await storage.getItems(colId);
    setItems(loadedItems);
  }, [storage]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Handle select collection
  const handleSelectCollection = async (collection: CollectionData) => {
    setSelectedCollection(collection);
    await loadItems(collection.id);
    setViewMode('calendar');
    setIsDrawerOpen(false);
    setSelectedItem(null);
  };

  // Back to collections
  const handleBackToCollections = async () => {
    setViewMode('collections');
    setSelectedCollection(null);
    setSelectedItem(null);
    setIsDrawerOpen(false);
    await loadCollections();
  };

  // Refresh
  const handleRefresh = async () => {
    if (viewMode === 'collections') {
      await loadCollections();
    } else if (selectedCollection) {
      await loadItems(selectedCollection.id);
    }
  };

  // Create Collection
  const handleCreateCollection = async (title: string, description: string) => {
    await storage.createCollection(title, description);
    await loadCollections();
  };

  // Delete Collection
  const handleDeleteCollection = async (collectionId: string) => {
    await storage.deleteCollection(collectionId);
    await loadCollections();
  };

  // Create Item
  const handleCreateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollection || !newItemTitle.trim()) return;

    const newItem = await storage.createItem(selectedCollection.id, newItemTitle);
    await loadItems(selectedCollection.id);
    setNewItemTitle('');
    setIsCreateItemModalOpen(false);

    // Open detail drawer for newly created item
    setSelectedItem(newItem);
    setIsDrawerOpen(true);
  };

  // Update Item
  const handleUpdateItem = async (updatedItem: ItemData) => {
    // Update state immediately
    setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
    if (selectedItem?.id === updatedItem.id) {
      setSelectedItem(updatedItem);
    }
    // Save to Vault
    await storage.updateItem(updatedItem);
  };

  // Delete Item
  const handleDeleteItem = async (item: ItemData) => {
    await storage.deleteItem(item);
    if (selectedCollection) {
      await loadItems(selectedCollection.id);
    }
    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
      setIsDrawerOpen(false);
    }
  };

  // Select Item or Todo
  const handleSelectItem = (item: ItemData, todoId?: string) => {
    setSelectedItem(item);
    setSelectedTodoId(todoId || null);
    setIsDrawerOpen(true);
  };

  // Quick toggle todo status from cell click
  const handleQuickToggleTodoStatus = async (item: ItemData, todoId: string) => {
    const updatedTodos = item.todos.map((t) => {
      if (t.id === todoId) {
        const nextStatus: TodoStatus = t.status === 'done' ? 'todo' : 'done';
        return { ...t, status: nextStatus };
      }
      return t;
    });

    const updatedItem = { ...item, todos: updatedTodos };
    await handleUpdateItem(updatedItem);
  };

  // Date Navigation
  const handleNavigateDate = (days: number) => {
    const nextDate = new Date(startDate);
    nextDate.setDate(startDate.getDate() + days);
    setStartDate(nextDate);
  };

  const handleResetToToday = () => {
    setStartDate(new Date());
  };

  // Close detail drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedItem(null);
    setSelectedTodoId(null);
  };

  return (
    <div className="todo-calendar-app">
      <HeaderNav
        viewMode={viewMode}
        collections={collections}
        selectedCollection={selectedCollection}
        startDate={startDate}
        onBackToCollections={handleBackToCollections}
        onSelectCollection={handleSelectCollection}
        onNavigateDate={handleNavigateDate}
        onResetToToday={handleResetToToday}
        onOpenCreateItemModal={() => setIsCreateItemModalOpen(true)}
        onRefresh={handleRefresh}
      />

      <div className="app-main-layout">
        <div className="main-content-pane">
          {viewMode === 'collections' ? (
            <CollectionsGrid
              collections={collections}
              onSelectCollection={handleSelectCollection}
              onCreateCollection={handleCreateCollection}
              onDeleteCollection={handleDeleteCollection}
            />
          ) : (
            <CalendarMatrixView
              items={items}
              startDate={startDate}
              selectedItemId={selectedItem?.id || null}
              isDrawerOpen={isDrawerOpen}
              onCloseDrawer={handleCloseDrawer}
              onSelectItem={handleSelectItem}
              onQuickToggleTodoStatus={handleQuickToggleTodoStatus}
              onDeleteItem={handleDeleteItem}
              onOpenCreateItemModal={() => setIsCreateItemModalOpen(true)}
            />
          )}
        </div>

        {/* Right Side Drawer Inspector */}
        {viewMode === 'calendar' && isDrawerOpen && (
          <TaskDetailDrawer
            item={selectedItem}
            selectedTodoId={selectedTodoId}
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
          />
        )}
      </div>

      {/* Modal for creating a new Item */}
      {isCreateItemModalOpen && (
        <div className="todo-cal-modal-backdrop">
          <div className="todo-cal-modal-content">
            <h3>新規タスクノート (Item) の作成</h3>
            <form onSubmit={handleCreateItemSubmit}>
              <div className="todo-cal-form-group">
                <label>ノートタイトル *</label>
                <input
                  type="text"
                  className="todo-cal-form-input"
                  placeholder="例: UIデザイン ＆ 仕様策定"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="todo-cal-modal-actions">
                <button
                  type="button"
                  className="nav-btn secondary-btn"
                  onClick={() => setIsCreateItemModalOpen(false)}
                >
                  キャンセル
                </button>
                <button type="submit" className="nav-btn primary-btn">
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
