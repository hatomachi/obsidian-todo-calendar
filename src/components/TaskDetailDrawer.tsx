import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  FileText,
  AlignLeft,
  Pencil,
  ChevronsUpDown,
  GripVertical,
  ArrowUpDown,
  Check,
  Copy,
  Calendar,
  Tag,
  ChevronDown,
  ChevronRight,
  List,
  Layers,
} from 'lucide-react';
import { ItemData, TodoItem } from '../types';
import { ItemType, TemplateTodoDef } from '../features/item-types/types';
import { findItemTemplate, findItemType } from '../features/item-types/templateUtils';
import { TemplateAlertBanner } from '../features/item-types/TemplateAlertBanner';
import { TypeBadge } from '../features/item-types/TypeBadge';

const UNGROUPED_LABEL = '未分類';

const formatDueDate = (dateStr: string): string => {
  if (!dateStr) return '日付未設定';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const currentYear = new Date().getFullYear().toString();
    const [year, month, day] = parts;
    if (year === currentYear) {
      return `${month}/${day}`;
    }
    return `${year.slice(2)}/${month}/${day}`;
  }
  return dateStr;
};

interface TaskDetailDrawerProps {
  item: ItemData | null;
  selectedTodoId: string | null;
  isOpen: boolean;
  enableItemTypes?: boolean;
  itemTypes?: ItemType[];
  onClose: () => void;
  onUpdateItem: (item: ItemData) => void;
  onDeleteItem: (item: ItemData) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  item,
  selectedTodoId,
  isOpen,
  enableItemTypes = true,
  itemTypes = [],
  onClose,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [localItem, setLocalItem] = useState<ItemData | null>(item);
  const [editingDescIds, setEditingDescIds] = useState<Record<string, boolean>>({});
  const [isEditingItemDesc, setIsEditingItemDesc] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Grouping features state
  const [isGroupedView, setIsGroupedView] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLocalItem(item);
  }, [item]);

  useEffect(() => {
    if (selectedTodoId) {
      setEditingDescIds((prev) => ({ ...prev, [selectedTodoId]: true }));
    }
  }, [selectedTodoId]);

  // Extract all unique group names (excluding empty string / undefined)
  const existingGroups = useMemo(() => {
    if (!localItem) return [];
    const groups = new Set<string>();
    localItem.todos.forEach((t) => {
      if (t.group && t.group.trim()) {
        groups.add(t.group.trim());
      }
    });
    return Array.from(groups);
  }, [localItem]);

  const hasCustomGroups = existingGroups.length > 0;

  // Group items by group name
  const groupedTodos = useMemo(() => {
    if (!localItem) return [];
    const map = new Map<string, TodoItem[]>();

    // Initialize with existing groups
    existingGroups.forEach((g) => map.set(g, []));
    map.set(UNGROUPED_LABEL, []);

    localItem.todos.forEach((todo) => {
      const g = todo.group && todo.group.trim() ? todo.group.trim() : UNGROUPED_LABEL;
      if (!map.has(g)) {
        map.set(g, []);
      }
      map.get(g)!.push(todo);
    });

    // Remove empty groups EXCEPT if they were explicitly created or if it's UNGROUPED_LABEL when it has items
    const result: { groupName: string; todos: TodoItem[] }[] = [];

    // Registered non-empty groups first
    existingGroups.forEach((g) => {
      result.push({ groupName: g, todos: map.get(g) || [] });
    });

    // Add ungrouped at the end
    const ungrouped = map.get(UNGROUPED_LABEL) || [];
    if (ungrouped.length > 0 || existingGroups.length === 0) {
      result.push({ groupName: UNGROUPED_LABEL, todos: ungrouped });
    }

    return result;
  }, [localItem, existingGroups]);

  // Calculate item's selected type and template
  const currentItemType = useMemo(() => {
    if (!enableItemTypes || !localItem?.type) return undefined;
    return findItemType(itemTypes, localItem.type);
  }, [enableItemTypes, localItem?.type, itemTypes]);

  const currentItemTemplate = useMemo(() => {
    if (!currentItemType) return undefined;
    return findItemTemplate(currentItemType, localItem?.template);
  }, [currentItemType, localItem?.template]);

  if (!isOpen || !localItem) return null;

  const handleTitleChange = (newTitle: string) => {
    const updated = { ...localItem, title: newTitle };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  const handleTypeChange = (typeId: string) => {
    const nextType = findItemType(itemTypes, typeId);
    const defaultTpl = nextType?.templates[0];
    const updated: ItemData = {
      ...localItem,
      type: typeId ? typeId : undefined,
      template: defaultTpl ? defaultTpl.name : undefined,
    };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  const handleTemplateChange = (tplName: string) => {
    const updated: ItemData = {
      ...localItem,
      template: tplName ? tplName : undefined,
    };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  const handleAddMissingTodo = (missing: TemplateTodoDef) => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      title: missing.title,
      due: '', // empty date for template todos initially
      status: 'todo',
      description: '',
      group: missing.group || '',
    };
    const updated = {
      ...localItem,
      todos: [...localItem.todos, newTodo],
    };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  const handleAddAllMissingTodos = (missingList: TemplateTodoDef[]) => {
    const now = Date.now();
    const newTodos: TodoItem[] = missingList.map((missing, idx) => ({
      id: `todo-${now}-${idx}`,
      title: missing.title,
      due: '',
      status: 'todo',
      description: '',
      group: missing.group || '',
    }));

    const updated = {
      ...localItem,
      todos: [...localItem.todos, ...newTodos],
    };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  const handleItemStatusChange = (newStatus: 'todo' | 'done') => {
    const updated = { ...localItem, status: newStatus };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  const handleItemDescriptionChange = (newDesc: string) => {
    const updated = { ...localItem, description: newDesc };
    setLocalItem(updated);
    onUpdateItem(updated);
  };

  const handleAddTodo = (groupName?: string) => {
    const defaultGroup = groupName && groupName !== UNGROUPED_LABEL ? groupName : '';
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      title: '',
      due: new Date().toISOString().split('T')[0],
      status: 'todo',
      description: '',
      group: defaultGroup,
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

  const handleDuplicateTodo = (todoId: string) => {
    const index = localItem.todos.findIndex((t) => t.id === todoId);
    if (index === -1) return;
    const target = localItem.todos[index];

    const duplicated: TodoItem = {
      ...target,
      id: `todo-${Date.now()}`,
    };

    const updatedTodos = [...localItem.todos];
    updatedTodos.splice(index + 1, 0, duplicated);

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

  const handleToggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
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

  // Helper to render single todo card (2-tier layout)
  const renderTodoCard = (todo: TodoItem, originalIndex: number) => {
    const isFocused = todo.id === selectedTodoId;
    const isEditingDesc = !!editingDescIds[todo.id];
    const hasDesc = !!todo.description?.trim();
    const hasGroup = !!todo.group?.trim();
    const isDragging = draggedIndex === originalIndex;
    const isDragOver = dragOverIndex === originalIndex;

    return (
      <div
        key={todo.id}
        draggable
        onDragStart={(e) => handleDragStart(e, originalIndex)}
        onDragOver={(e) => handleDragOver(e, originalIndex)}
        onDrop={(e) => handleDrop(e, originalIndex)}
        onDragEnd={handleDragEnd}
        className={`todo-form-card ${isFocused ? 'todo-focused' : ''} ${
          isDragging ? 'dragging' : ''
        } ${isDragOver ? 'drag-over' : ''}`}
      >
        {/* Single Row (Default View: Drag handle + Checkbox + Full Width Title + Group Tag + Date Chip + Detail Toggle) */}
        <div className="todo-card-main-row">
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
            placeholder="タスク名を入力..."
            value={todo.title}
            title={todo.title}
            onChange={(e) => handleUpdateTodo(todo.id, { title: e.target.value })}
          />

          {/* Group Tag badge (only shown if assigned) */}
          {hasGroup && (
            <div
              className="todo-group-badge"
              onClick={() => toggleToggleEditDesc(todo.id)}
              title="グループを変更"
            >
              <Tag size={10} className="todo-group-icon" />
              <span className="todo-group-name">{todo.group.trim()}</span>
            </div>
          )}

          {/* Due Date Chip */}
          <div className="due-date-wrapper" title={`期日: ${todo.due || '未設定（タップして設定）'}`}>
            <input
              type="date"
              className="due-date-input-overlay"
              value={todo.due || ''}
              onChange={(e) => handleUpdateTodo(todo.id, { due: e.target.value })}
            />
            <div className={`due-date-badge ${!todo.due || todo.due.trim() === '' ? 'empty-due-badge' : ''}`}>
              <Calendar size={12} className="due-date-icon" />
              {todo.due && todo.due.trim() !== '' && <span>{formatDueDate(todo.due)}</span>}
            </div>
          </div>

          {/* Detail / Memo / Actions Toggle */}
          <button
            className={`icon-btn toggle-desc-btn ${isEditingDesc ? 'active' : ''} ${
              hasDesc || hasGroup ? 'has-desc' : ''
            }`}
            onClick={() => toggleToggleEditDesc(todo.id)}
            title={isEditingDesc ? '詳細を閉じる' : '詳細・メモ・操作を展開'}
          >
            <Pencil size={13} />
          </button>
        </div>

        {/* Optional Collapsed Memo Preview (only when not editing and memo exists) */}
        {!isEditingDesc && hasDesc && (
          <div
            className="todo-desc-preview"
            onClick={() => toggleToggleEditDesc(todo.id)}
            title="クリックして詳細メモを編集"
          >
            <AlignLeft size={11} className="desc-preview-icon" />
            <span className="desc-preview-text">{todo.description}</span>
          </div>
        )}

        {/* Expanded Description, Group & Actions Panel */}
        {isEditingDesc && (
          <div className="todo-card-desc-editor">
            <div className="editor-group-bar" title="グループを設定・変更">
              <Tag size={12} className="editor-group-icon" />
              <span className="editor-group-label">グループ:</span>
              <input
                type="text"
                list="existing-groups-list"
                className="editor-group-input"
                placeholder="グループ名（未設定時は未分類）..."
                value={todo.group || ''}
                onChange={(e) => handleUpdateTodo(todo.id, { group: e.target.value })}
              />
            </div>
            <div className="textarea-wrapper">
              <AlignLeft size={12} className="textarea-icon" />
              <textarea
                className="todo-desc-textarea"
                placeholder="詳細・メモを入力..."
                value={todo.description || ''}
                onChange={(e) => handleUpdateTodo(todo.id, { description: e.target.value })}
                rows={2}
                autoFocus
              />
            </div>
            <div className="editor-actions-bar">
              <button
                className="editor-action-btn duplicate"
                onClick={() => handleDuplicateTodo(todo.id)}
                title="TODOを複製"
              >
                <Copy size={12} />
                <span>複製</span>
              </button>
              <button
                className="editor-action-btn delete"
                onClick={() => handleDeleteTodo(todo.id)}
                title="TODOを削除"
              >
                <Trash2 size={12} />
                <span>削除</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="detail-drawer">
      {/* Datalist for Group auto-completion */}
      <datalist id="existing-groups-list">
        {existingGroups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      <div className="drawer-header">
        <div className="header-title-section">
          <input
            type="checkbox"
            checked={localItem.status === 'done'}
            onChange={(e) => handleItemStatusChange(e.target.checked ? 'done' : 'todo')}
            className="item-drawer-checkbox"
            title={localItem.status === 'done' ? '未完了に戻す' : 'アクションを完了にする'}
          />
          <input
            type="text"
            className={`item-title-input ${localItem.status === 'done' ? 'done-title' : ''}`}
            value={localItem.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="アイテム名を入力..."
          />
        </div>
        <button className="icon-btn close-drawer-btn" onClick={onClose} title="閉じる">
          <X size={18} />
        </button>
      </div>

      {/* Item Type & Template Selector Section */}
      {enableItemTypes && itemTypes.length > 0 && (
        <div className="drawer-type-selector-bar">
          <div className="type-selector-group">
            <Tag size={13} className="selector-icon" />
            <span className="selector-label">タイプ:</span>
            <select
              className="type-dropdown-select"
              value={localItem.type || ''}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              <option value="">(タイプ指定なし)</option>
              {itemTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {currentItemType && currentItemType.templates.length > 0 && (
            <div className="type-selector-group">
              <Layers size={13} className="selector-icon" />
              <span className="selector-label">テンプレ:</span>
              <select
                className="type-dropdown-select"
                value={localItem.template || currentItemType.templates[0]?.name || ''}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                {currentItemType.templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.name}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Template Validation Alert Banner */}
      {enableItemTypes && currentItemTemplate && (
        <TemplateAlertBanner
          item={localItem}
          template={currentItemTemplate}
          onAddMissingTodo={handleAddMissingTodo}
          onAddAllMissingTodos={handleAddAllMissingTodos}
        />
      )}

      <div className="drawer-body">
        {/* Item Description (Memo) Section */}
        <div className="compact-item-desc-section">
          {isEditingItemDesc ? (
            <div className="compact-item-desc-bar editing">
              <AlignLeft size={13} className="desc-icon" />
              <textarea
                className="compact-desc-textarea"
                placeholder="メモを入力..."
                value={localItem.description || ''}
                onChange={(e) => handleItemDescriptionChange(e.target.value)}
                onBlur={(e) => {
                  if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                    setIsEditingItemDesc(false);
                  }
                }}
                rows={Math.max(1, Math.min(8, (localItem.description || '').split('\n').length))}
                autoFocus
              />
              <button
                className="icon-btn save-memo-btn"
                onClick={() => setIsEditingItemDesc(false)}
                title="完了"
              >
                <Check size={13} />
              </button>
            </div>
          ) : localItem.description && localItem.description.trim() ? (
            <div
              className="compact-item-desc-bar has-content"
              onClick={() => setIsEditingItemDesc(true)}
              title="クリックしてメモを編集"
            >
              <AlignLeft size={13} className="desc-icon" />
              <span className="desc-text">{localItem.description}</span>
              <button
                className="icon-btn edit-memo-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingItemDesc(true);
                }}
                title="メモを編集"
              >
                <Pencil size={12} />
              </button>
            </div>
          ) : (
            <div className="compact-item-desc-bar empty">
              <button
                className="subtle-memo-btn"
                onClick={() => setIsEditingItemDesc(true)}
                title="メモを入力"
              >
                <Pencil size={12} />
                <span>メモを追加...</span>
              </button>
            </div>
          )}
        </div>

        <div className="section-title-bar">
          <h4 className="section-title">TODO タスク ({localItem.todos.length})</h4>
          <div className="section-actions">
            {localItem.todos.length > 0 && (
              <>
                {/* Grouping View Toggle Button (Only when custom groups exist) */}
                {hasCustomGroups && (
                  <button
                    className={`nav-btn secondary-btn sm-btn ${isGroupedView ? 'active-toggle' : ''}`}
                    onClick={() => setIsGroupedView(!isGroupedView)}
                    title={isGroupedView ? 'リスト表示に切替' : 'グループ表示に切替'}
                  >
                    {isGroupedView ? <Layers size={13} /> : <List size={13} />}
                    <span className="btn-label-responsive">{isGroupedView ? 'グループ' : 'リスト'}</span>
                  </button>
                )}

                <button
                  className="nav-btn secondary-btn sm-btn"
                  onClick={handleSortByDueDate}
                  title="期日の昇順で並べ替え"
                >
                  <ArrowUpDown size={13} />
                  <span className="btn-label-responsive">期日順</span>
                </button>

                <button
                  className="nav-btn secondary-btn sm-btn"
                  onClick={handleToggleExpandAll}
                  title="すべての詳細説明を開閉"
                >
                  <ChevronsUpDown size={13} />
                  <span className="btn-label-responsive">全開閉</span>
                </button>
              </>
            )}

            <button className="nav-btn primary-btn sm-btn add-todo-action-btn" onClick={() => handleAddTodo()}>
              <Plus size={14} />
              <span>TODOを追加</span>
            </button>
          </div>
        </div>

        {localItem.todos.length === 0 ? (
          <div className="empty-todos">
            <p>このノートにはTODOがまだありません。「TODOを追加」ボタンを押して登録してください。</p>
          </div>
        ) : hasCustomGroups && isGroupedView ? (
          /* Grouped View Mode (Only when custom groups exist) */
          <div className="grouped-todo-container">
            {groupedTodos.map(({ groupName, todos: groupTodos }) => {
              const isCollapsed = !!collapsedGroups[groupName];
              const isUngrouped = groupName === UNGROUPED_LABEL;

              return (
                <div key={groupName} className="todo-group-section">
                  <div
                    className={`group-section-header ${isUngrouped ? 'ungrouped-header' : ''}`}
                    onClick={() => handleToggleGroupCollapse(groupName)}
                  >
                    <div className="group-header-left">
                      <button className="icon-btn collapse-toggle-btn">
                        {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <Tag size={12} className="group-header-tag-icon" />
                      <span className="group-header-title">{groupName}</span>
                      <span className="group-count-badge">{groupTodos.length}</span>
                    </div>

                    <div className="group-header-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="subtle-icon-btn group-add-btn"
                        onClick={() => handleAddTodo(isUngrouped ? '' : groupName)}
                        title={`"${groupName}" にTODOを追加`}
                      >
                        <Plus size={12} />
                        <span>追加</span>
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="group-section-body">
                      {groupTodos.length === 0 ? (
                        <div className="empty-group-hint">
                          <span>タスクはありません。「追加」ボタンでこのグループに登録できます。</span>
                        </div>
                      ) : (
                        <div className="todo-form-list">
                          {groupTodos.map((todo) => {
                            const originalIndex = localItem.todos.findIndex((t) => t.id === todo.id);
                            return renderTodoCard(todo, originalIndex);
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat View Mode (Default when no groups or grouped view off) */
          <div className="todo-form-list">
            {localItem.todos.map((todo, index) => renderTodoCard(todo, index))}
          </div>
        )}
      </div>

      <div className="drawer-footer">
        <span className="file-path-info" title={localItem.filePath}>
          {localItem.filePath}
        </span>
        <button
          className="drawer-delete-item-btn"
          onClick={() => {
            if (confirm(`ノート「${localItem.title}」を削除しますか？`)) {
              onDeleteItem(localItem);
            }
          }}
          title="ノートを削除"
        >
          <Trash2 size={13} />
          <span>アイテムを削除</span>
        </button>
      </div>
    </div>
  );
};
