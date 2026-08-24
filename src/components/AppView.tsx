import React, { useState, useEffect, useCallback } from 'react';
import { App } from 'obsidian';
import { StorageManager } from '../storage';
import { CollectionData, ItemData, TodoStatus, AgendaTodoItem } from '../types';
import { HeaderNav } from './HeaderNav';
import { CollectionsGrid } from './CollectionsGrid';
import { CalendarMatrixView } from './CalendarMatrixView';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { AgendaView } from './AgendaView';

interface AppViewProps {
  app: App;
}

export const AppView: React.FC<AppViewProps> = ({ app }) => {
  const [storage] = useState(() => new StorageManager(app));

  const [viewMode, setViewMode] = useState<'collections' | 'calendar' | 'agenda'>('collections');
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<CollectionData | null>(null);

  const [items, setItems] = useState<ItemData[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaTodoItem[]>([]);
  const [selectedCollectionFilterId, setSelectedCollectionFilterId] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [startDate, setStartDate] = useState<Date>(() => new Date());
  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');

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

  // Load all items for Agenda view
  const loadAgendaItems = useCallback(async () => {
    const loadedAgenda = await storage.getAllAgendaItems();
    setAgendaItems(loadedAgenda);
  }, [storage]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Handle select collection (to Calendar view)
  const handleSelectCollection = useCallback(
    async (collection: CollectionData) => {
      setSelectedCollection(collection);
      await loadItems(collection.id);
      setViewMode('calendar');
      setIsDrawerOpen(false);
      setSelectedItem(null);
    },
    [loadItems]
  );

  // Navigate collection by step (+1 or -1)
  const handleNavigateCollection = useCallback(
    async (direction: -1 | 1) => {
      if (collections.length <= 1 || !selectedCollection) return;
      const currentIndex = collections.findIndex((c) => c.id === selectedCollection.id);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex + direction;
      if (nextIndex < 0) {
        nextIndex = collections.length - 1;
      } else if (nextIndex >= collections.length) {
        nextIndex = 0;
      }

      await handleSelectCollection(collections[nextIndex]);
    },
    [collections, selectedCollection, handleSelectCollection]
  );

  // Keyboard navigation for collections (ArrowLeft / ArrowRight / [ / ])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'calendar' || collections.length <= 1) return;
      if (isCreateItemModalOpen) return;

      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isContentEditable = target?.isContentEditable;
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === '[') {
        e.preventDefault();
        handleNavigateCollection(-1);
      } else if (e.key === 'ArrowRight' || e.key === ']') {
        e.preventDefault();
        handleNavigateCollection(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewMode, collections.length, isCreateItemModalOpen, handleNavigateCollection]);

  // Switch to Agenda view
  const handleSelectAgenda = async () => {
    await loadCollections();
    await loadAgendaItems();
    setViewMode('agenda');
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
    await loadCollections();
    if (viewMode === 'calendar' && selectedCollection) {
      await loadItems(selectedCollection.id);
    } else if (viewMode === 'agenda') {
      await loadAgendaItems();
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
    if (viewMode === 'agenda') {
      await loadAgendaItems();
    }
  };

  // Create Item
  const handleCreateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollection || !newItemTitle.trim()) return;

    const newItem = await storage.createItem(selectedCollection.id, newItemTitle, newItemDescription);
    await loadItems(selectedCollection.id);
    setNewItemTitle('');
    setNewItemDescription('');
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

    if (viewMode === 'agenda') {
      await loadAgendaItems();
    }
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
    if (viewMode === 'agenda') {
      await loadAgendaItems();
    }
  };

  // Select Item or Todo
  const handleSelectItem = (item: ItemData, todoId?: string) => {
    setSelectedItem(item);
    setSelectedTodoId(todoId || null);
    setIsDrawerOpen(true);
  };

  // Quick toggle todo status
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
        onSelectAgenda={handleSelectAgenda}
        onSelectCollection={handleSelectCollection}
        onNavigateCollection={handleNavigateCollection}
        onNavigateDate={handleNavigateDate}
        onResetToToday={handleResetToToday}
        onOpenCreateItemModal={() => setIsCreateItemModalOpen(true)}
        onRefresh={handleRefresh}
      />

      <div className="app-main-layout">
        <div className="main-content-pane">
          {viewMode === 'collections' && (
            <CollectionsGrid
              collections={collections}
              onSelectCollection={handleSelectCollection}
              onCreateCollection={handleCreateCollection}
              onDeleteCollection={handleDeleteCollection}
            />
          )}

          {viewMode === 'calendar' && (
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
              onUpdateItem={handleUpdateItem}
            />
          )}

          {viewMode === 'agenda' && (
            <AgendaView
              agendaItems={agendaItems}
              collections={collections}
              selectedCollectionId={selectedCollectionFilterId}
              onSelectCollectionFilter={setSelectedCollectionFilterId}
              onQuickToggleTodoStatus={handleQuickToggleTodoStatus}
              onSelectItem={handleSelectItem}
              onJumpToCollection={handleSelectCollection}
            />
          )}
        </div>

        {/* Right Side Drawer Inspector */}
        {(viewMode === 'calendar' || viewMode === 'agenda') && isDrawerOpen && (
          <TaskDetailDrawer
            item={selectedItem}
            selectedTodoId={selectedTodoId}
            isOpen={isDrawerOpen}
            onClose={handleCloseDrawer}
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
              <div className="todo-cal-form-group">
                <label>メモ / 詳細説明 (任意)</label>
                <textarea
                  className="todo-cal-form-input"
                  placeholder="アイテムのメモを入力..."
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  rows={2}
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

