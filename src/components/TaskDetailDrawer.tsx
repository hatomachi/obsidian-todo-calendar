import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, AlignLeft, Pencil, ChevronsUpDown, GripVertical, ArrowUpDown } from 'lucide-react';
import { ItemData, TodoItem } from '../types';

interface TaskDetailDrawerProps {
  item: ItemData | null;
  selectedTodoId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (item: ItemData) => void;
  onDeleteItem: (item: ItemData) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  item,
  selectedTodoId,
  isOpen,
  onClose,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [localItem, setLocalItem] = useState<ItemData | null>(item);
  const [editingDescIds, setEditingDescIds] = useState<Record<string, boolean>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalItem(item);
  }, [item]);

  useEffect(() => {
    if (selectedTodoId) {
      setEditingDescIds((prev) => ({ ...prev, [selectedTodoId]: true }));
    }
  }, [selectedTodoId]);

  if (!isOpen || !localItem) return null;

  const handleTitleChange = (newTitle: string) => {
    const updated = { ...localItem, title: newTitle };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  const handleAddTodo = () => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      title: '',
      due: new Date().toISOString().split('T')[0],
      status: 'todo',
      description: '',
    };
    const updated = {
      ...localItem,
      todos: [...localItem.todos, newTodo],
    };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  const handleUpdateTodo = (todoId: string, fields: Partial<TodoItem>) => {
    const updatedTodos = localItem.todos.map((t) => {
      if (t.id === todoId) {
        return { ...t, ...fields };
      }
      return t;
    });
    const updated = { ...localItem, todos: updatedTodos };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  const handleDeleteTodo = (todoId: string) => {
    const updatedTodos = localItem.todos.filter((t) => t.id !== todoId);
    const updated = { ...localItem, todos: updatedTodos };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  const toggleToggleEditDesc = (todoId: string) => {
    setEditingDescIds((prev) => ({
      ...prev,
      [todoId]: !prev[todoId],
    }));
  };

  const handleToggleExpandAll = () => {
    const areAllEditing =
      localItem.todos.length > 0 &&
      localItem.todos.every((t) => editingDescIds[t.id]);

    const newMap: Record<string, boolean> = {};
    localItem.todos.forEach((t) => {
      newMap[t.id] = !areAllEditing;
    });
    setEditingDescIds(newMap);
  };

  const handleSortByDueDate = () => {
    const sorted = [...localItem.todos].sort((a, b) => {
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });
    const updated = { ...localItem, todos: sorted };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updatedTodos = [...localItem.todos];
    const [moved] = updatedTodos.splice(draggedIndex, 1);
    updatedTodos.splice(targetIndex, 0, moved);

    const updated = { ...localItem, todos: updatedTodos };
    setLocalItem(updated);
    onUpdateItem(updated);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="detail-drawer">
      <div className="drawer-header">
        <div className="header-title-section">
          <FileText size={18} className="item-drawer-icon" />
          <input
            type="text"
            className="item-title-input"
            value={localItem.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="アイテム名を入力..."
          />
        </div>
        <button className="icon-btn close-drawer-btn" onClick={onClose} title="閉じる">
          <X size={18} />
        </button>
      </div>

      <div className="drawer-body">
        <div className="section-title-bar">
          <h4 className="section-title">TODO タスク一覧 ({localItem.todos.length})</h4>
          <div className="section-actions">
            {localItem.todos.length > 0 && (
              <>
                <button
                  className="nav-btn secondary-btn sm-btn"
                  onClick={handleSortByDueDate}
                  title="期日の昇順で並べ替え"
                >
                  <ArrowUpDown size={13} />
                  <span>期日順</span>
                </button>

                <button
                  className="nav-btn secondary-btn sm-btn"
                  onClick={handleToggleExpandAll}
                  title="すべての詳細説明を開閉"
                >
                  <ChevronsUpDown size={13} />
                  <span>全開閉</span>
                </button>
              </>
            )}
            <button className="nav-btn primary-btn sm-btn" onClick={handleAddTodo}>
              <Plus size={14} />
              <span>TODOを追加</span>
            </button>
          </div>
        </div>

        {localItem.todos.length === 0 ? (
          <div className="empty-todos">
            <p>このノートにはTODOがまだありません。「TODOを追加」ボタンを押して登録してください。</p>
          </div>
        ) : (
          <div className="todo-form-list">
            {localItem.todos.map((todo, index) => {
              const isFocused = todo.id === selectedTodoId;
              const isEditingDesc = !!editingDescIds[todo.id];
              const hasDesc = !!todo.description?.trim();
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={todo.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`todo-form-card ${isFocused ? 'todo-focused' : ''} ${
                    isDragging ? 'dragging' : ''
                  } ${isDragOver ? 'drag-over' : ''}`}
                >
                  <div className="todo-card-row">
                    <div className="drag-handle" title="ドラッグして並べ替え">
                      <GripVertical size={14} />
                    </div>

                    <input
                      type="checkbox"
                      checked={todo.status === 'done'}
                      onChange={(e) =>
                        handleUpdateTodo(todo.id, { status: e.target.checked ? 'done' : 'todo' })
                      }
                      className="todo-status-checkbox"
                      title={todo.status === 'done' ? '未完了に戻す' : '完了にする'}
                    />

                    <input
                      type="text"
                      className={`todo-title-input ${todo.status === 'done' ? 'done-title' : ''}`}
                      placeholder="TODOの件名..."
                      value={todo.title}
                      onChange={(e) => handleUpdateTodo(todo.id, { title: e.target.value })}
                    />

                    <input
                      type="date"
                      className="due-date-input"
                      value={todo.due}
                      onChange={(e) => handleUpdateTodo(todo.id, { due: e.target.value })}
                    />

                    <button
                      className={`icon-btn toggle-desc-btn ${isEditingDesc ? 'active' : ''} ${hasDesc ? 'has-desc' : ''}`}
                      onClick={() => toggleToggleEditDesc(todo.id)}
                      title={isEditingDesc ? '詳細編集を閉じる' : '詳細・メモを編集'}
                    >
                      <Pencil size={13} />
                    </button>

                    <button
                      className="icon-btn delete-todo-btn"
                      onClick={() => handleDeleteTodo(todo.id)}
                      title="TODO削除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Description Section */}
                  {isEditingDesc ? (
                    <div className="todo-card-desc-editor">
                      <div className="textarea-wrapper">
                        <AlignLeft size={13} className="textarea-icon" />
                        <textarea
                          className="todo-desc-textarea"
                          placeholder="詳細・メモを入力..."
                          value={todo.description || ''}
                          onChange={(e) => handleUpdateTodo(todo.id, { description: e.target.value })}
                          rows={2}
                          autoFocus
                        />
                      </div>
                    </div>
                  ) : hasDesc ? (
                    <div
                      className="todo-desc-preview"
                      onClick={() => toggleToggleEditDesc(todo.id)}
                      title="クリックして詳細を編集"
                    >
                      <AlignLeft size={12} className="desc-preview-icon" />
                      <span className="desc-preview-text">{todo.description}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="drawer-footer">
        <span className="file-path-info">Path: {localItem.filePath}</span>
      </div>
    </div>
  );
};


