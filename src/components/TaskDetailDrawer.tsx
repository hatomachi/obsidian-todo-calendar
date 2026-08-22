import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, Circle, Clock, FileText, Calendar, AlignLeft } from 'lucide-react';
import { ItemData, TodoItem, TodoStatus } from '../types';

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

  useEffect(() => {
    setLocalItem(item);
  }, [item]);

  if (!isOpen || !localItem) return null;

  const handleTitleChange = (newTitle: string) => {
    const updated = { ...localItem, title: newTitle };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  const handleAddTodo = () => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      title: '新しいTODO',
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

  const getStatusIcon = (status: TodoStatus) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 size={16} className="status-icon done" />;
      case 'in_progress':
        return <Clock size={16} className="status-icon in-progress" />;
      default:
        return <Circle size={16} className="status-icon todo" />;
    }
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
        <button className="icon-btn close-drawer-btn" onClick={onClose} title="閉じろ">
          <X size={18} />
        </button>
      </div>

      <div className="drawer-body">
        <div className="section-title-bar">
          <h4 className="section-title">TODO タスク一覧 ({localItem.todos.length})</h4>
          <button className="nav-btn primary-btn sm-btn" onClick={handleAddTodo}>
            <Plus size={14} />
            <span>TODOを追加</span>
          </button>
        </div>

        {localItem.todos.length === 0 ? (
          <div className="empty-todos">
            <p>このノートにはTODOがまだありません。「TODOを追加」ボタンを押して登録してください。</p>
          </div>
        ) : (
          <div className="todo-form-list">
            {localItem.todos.map((todo) => {
              const isFocused = todo.id === selectedTodoId;

              return (
                <div
                  key={todo.id}
                  className={`todo-form-card ${isFocused ? 'todo-focused' : ''}`}
                >
                  <div className="todo-card-header">
                    <label className="todo-status-checkbox-label" title={todo.status === 'done' ? '未完了に戻す' : '完了にする'}>
                      <input
                        type="checkbox"
                        checked={todo.status === 'done'}
                        onChange={(e) =>
                          handleUpdateTodo(todo.id, { status: e.target.checked ? 'done' : 'todo' })
                        }
                        className="todo-status-checkbox"
                      />
                      <span className={`status-label-badge status-${todo.status}`}>
                        {todo.status === 'done' ? '完了' : '未完了'}
                      </span>
                    </label>

                    <input
                      type="date"
                      className="due-date-input"
                      value={todo.due}
                      onChange={(e) => handleUpdateTodo(todo.id, { due: e.target.value })}
                    />

                    <button
                      className="icon-btn delete-todo-btn"
                      onClick={() => handleDeleteTodo(todo.id)}
                      title="TODO削除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="todo-card-body">
                    <input
                      type="text"
                      className="todo-title-input"
                      placeholder="TODOの件名..."
                      value={todo.title}
                      onChange={(e) => handleUpdateTodo(todo.id, { title: e.target.value })}
                    />

                    <div className="textarea-wrapper">
                      <AlignLeft size={14} className="textarea-icon" />
                      <textarea
                        className="todo-desc-textarea"
                        placeholder="詳細・メモを入力..."
                        value={todo.description || ''}
                        onChange={(e) => handleUpdateTodo(todo.id, { description: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
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
