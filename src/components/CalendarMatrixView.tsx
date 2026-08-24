import React from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Circle, Clock, FileText, Layers, Plus, Trash2 } from 'lucide-react';
import { ItemData, TodoItem, TodoStatus } from '../types';
import { isJapaneseHoliday } from '../utils/holidays';

interface CalendarMatrixViewProps {
  items: ItemData[];
  startDate: Date;
  selectedItemId: string | null;
  showCompletedItems?: boolean;
  onToggleShowCompleted?: () => void;
  onToggleItemStatus: (item: ItemData) => void;
  isDrawerOpen?: boolean;
  onCloseDrawer?: () => void;
  onSelectItem: (item: ItemData, todoId?: string) => void;
  onQuickToggleTodoStatus: (item: ItemData, todoId: string) => void;
  onDeleteItem: (item: ItemData) => void;
  onOpenCreateItemModal: () => void;
  onUpdateItem: (item: ItemData) => void;
}

const formatDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatShortDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}/${day}`;
  }
  return dateStr;
};

export const CalendarMatrixView: React.FC<CalendarMatrixViewProps> = ({
  items,
  startDate,
  selectedItemId,
  showCompletedItems = false,
  onToggleShowCompleted,
  onToggleItemStatus,
  isDrawerOpen,
  onCloseDrawer,
  onSelectItem,
  onQuickToggleTodoStatus,
  onDeleteItem,
  onOpenCreateItemModal,
  onUpdateItem,
}) => {
  const todayStr = formatDateStr(new Date());

  // D&D State
  const [draggedTodo, setDraggedTodo] = React.useState<{ itemId: string; todoId: string } | null>(null);
  const [dragOverCell, setDragOverCell] = React.useState<{ itemId: string; dateStr: string } | null>(null);
  const isDraggingRef = React.useRef(false);

  // Cell Inline Creation State
  const [addingTodoCell, setAddingTodoCell] = React.useState<{ itemId: string; dateStr: string } | null>(null);
  const [inlineTodoTitle, setInlineTodoTitle] = React.useState('');

  // Row Expand/Collapse State for Past & Future cells
  const [expandedFutureRows, setExpandedFutureRows] = React.useState<Record<string, boolean>>({});
  const [expandedPastRows, setExpandedPastRows] = React.useState<Record<string, boolean>>({});

  const toggleFutureExpand = (itemId: string) => {
    setExpandedFutureRows((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const togglePastExpand = (itemId: string) => {
    setExpandedPastRows((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleContainerClick = () => {
    if (isDrawerOpen && onCloseDrawer) {
      onCloseDrawer();
    }
  };

  // Generate 7 days starting from startDate
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = formatDateStr(d);
    const isToday = dateStr === todayStr;
    const dayOfWeek = d.getDay(); // 0: Sun, 6: Sat
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const isHoliday = isJapaneseHoliday(d);
    const isNonWorkingDay = isSunday || isSaturday || isHoliday;
    const dayLabel = d.toLocaleDateString('ja-JP', { weekday: 'short', month: 'numeric', day: 'numeric' });
    return { dateStr, dayLabel, isToday, isSunday, isSaturday, isHoliday, isNonWorkingDay };
  });

  const minDateStr = days[0].dateStr;
  const maxDateStr = days[6].dateStr;

  // Global cleanup to guarantee isDraggingRef never gets stuck true on component updates
  React.useEffect(() => {
    const resetDrag = () => {
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 50);
      setDraggedTodo(null);
      setDragOverCell(null);
    };
    window.addEventListener('dragend', resetDrag);
    window.addEventListener('mouseup', resetDrag);
    return () => {
      window.removeEventListener('dragend', resetDrag);
      window.removeEventListener('mouseup', resetDrag);
    };
  }, []);

  // D&D Handlers
  const handleDragStart = (e: React.DragEvent, itemId: string, todoId: string) => {
    isDraggingRef.current = true;
    setDraggedTodo({ itemId, todoId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ itemId, todoId }));
  };

  const handleDragEnd = () => {
    setDraggedTodo(null);
    setDragOverCell(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handleDragOver = (e: React.DragEvent, itemId: string, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragOverCell || dragOverCell.itemId !== itemId || dragOverCell.dateStr !== dateStr) {
      setDragOverCell({ itemId, dateStr });
    }
  };

  const handleDragLeave = (e: React.DragEvent, itemId: string, dateStr: string) => {
    e.preventDefault();
    if (dragOverCell?.itemId === itemId && dragOverCell?.dateStr === dateStr) {
      setDragOverCell(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetItem: ItemData, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCell(null);

    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);

    let dragData = draggedTodo;
    if (!dragData) {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) dragData = JSON.parse(raw);
      } catch (err) {
        // ignore
      }
    }

    if (!dragData) return;

    const sourceItem = items.find((it) => it.id === dragData!.itemId);
    if (!sourceItem) return;

    const targetTodo = sourceItem.todos.find((t) => t.id === dragData!.todoId);
    if (!targetTodo || targetTodo.due === dateStr) return;

    if (sourceItem.id === targetItem.id) {
      const updatedTodos = targetItem.todos.map((t) =>
        t.id === targetTodo.id ? { ...t, due: dateStr } : t
      );
      onUpdateItem({ ...targetItem, todos: updatedTodos });
    } else {
      const sourceUpdatedTodos = sourceItem.todos.filter((t) => t.id !== targetTodo.id);
      const updatedTargetTodo = { ...targetTodo, due: dateStr };
      const targetUpdatedTodos = [...targetItem.todos, updatedTargetTodo];

      onUpdateItem({ ...sourceItem, todos: sourceUpdatedTodos });
      onUpdateItem({ ...targetItem, todos: targetUpdatedTodos });
    }
  };

  // Cell Inline Add Handlers
  const handleStartInlineAdd = (itemId: string, dateStr: string) => {
    setAddingTodoCell({ itemId, dateStr });
    setInlineTodoTitle('');
  };

  const handleSaveInlineTodo = (item: ItemData, dateStr: string) => {
    const title = inlineTodoTitle.trim();
    if (title) {
      const newTodo: TodoItem = {
        id: `todo-${Date.now()}`,
        title,
        due: dateStr,
        status: 'todo',
        description: '',
      };
      onUpdateItem({ ...item, todos: [...item.todos, newTodo] });
    }
    setAddingTodoCell(null);
    setInlineTodoTitle('');
  };

  const handleInlineKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    item: ItemData,
    dateStr: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveInlineTodo(item, dateStr);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAddingTodoCell(null);
      setInlineTodoTitle('');
    }
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    if (isDrawerOpen && onCloseDrawer) {
      onCloseDrawer();
    }
  };

  const completedCount = items.filter((it) => it.status === 'done').length;
  const visibleItems = showCompletedItems ? items : items.filter((it) => it.status !== 'done');

  return (
    <div className="calendar-matrix-container" onClick={handleContainerClick}>
      <div className="table-scroll-wrapper" onClick={handleContainerClick}>
        <table className="matrix-table">
          <thead onClick={handleHeaderClick}>
            <tr>
              <th className="row-header-th">タスクノート (Item)</th>
              <th className="past-header-th">過去の未完了</th>
              {days.map((day) => {
                let colClass = 'weekday-col';
                if (day.isToday) {
                  colClass = 'today-col';
                } else if (day.isNonWorkingDay) {
                  colClass = 'holiday-col';
                }

                let dayTypeClass = '';
                if (day.isSunday || day.isHoliday) dayTypeClass = 'text-sun-holiday';
                else if (day.isSaturday) dayTypeClass = 'text-sat';

                return (
                  <th
                    key={day.dateStr}
                    className={`day-header-th ${colClass}`}
                  >
                    <div className={`day-title ${dayTypeClass}`}>{day.dayLabel}</div>
                    {day.isToday && <span className="today-badge">Today</span>}
                  </th>
                );
              })}
              <th className="future-header-th">未来</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-matrix-td">
                  <div className="empty-matrix-state">
                    <p>このコレクションにはまだアイテムがありません。</p>
                    <button className="nav-btn primary-btn" onClick={onOpenCreateItemModal}>
                      <Plus size={16} />
                      <span>新規アイテムを作成</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : visibleItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty-matrix-td">
                  <div className="empty-matrix-state">
                    <p>すべてのタスクが完了しています（{completedCount}件の完了タスクが非表示中）</p>
                    {onToggleShowCompleted && (
                      <button className="nav-btn secondary-btn" onClick={onToggleShowCompleted}>
                        <span>完了したタスクを表示する</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              visibleItems.map((item) => {
                const isSelected = item.id === selectedItemId;
                const isItemDone = item.status === 'done';

                // Past incomplete todos (due < minDateStr and status === 'todo')
                const pastTodos = item.todos
                  .filter((t) => t.due && t.due < minDateStr && t.status === 'todo')
                  .sort((a, b) => a.due.localeCompare(b.due));

                const isPastExpanded = !!expandedPastRows[item.id];
                const hasPastMore = pastTodos.length > 2;
                const visiblePastTodos = hasPastMore && !isPastExpanded ? pastTodos.slice(0, 2) : pastTodos;
                const hiddenPastCount = pastTodos.length - 2;

                // Future todos (due > maxDateStr)
                const futureTodos = item.todos
                  .filter((t) => t.due && t.due > maxDateStr)
                  .sort((a, b) => a.due.localeCompare(b.due));

                const isFutureExpanded = !!expandedFutureRows[item.id];
                const hasFutureMore = futureTodos.length > 2;
                const visibleFutureTodos = hasFutureMore && !isFutureExpanded ? futureTodos.slice(0, 2) : futureTodos;
                const hiddenFutureCount = futureTodos.length - 2;

                return (
                  <tr
                    key={item.id}
                    className={`matrix-row ${isSelected ? 'row-selected' : ''} ${
                      isItemDone ? 'item-row-done' : ''
                    }`}
                  >
                    {/* Row Header: Item Title */}
                    <td className="row-header-td" onClick={() => onSelectItem(item)}>
                      <div className={`item-row-header-content ${isItemDone ? 'item-status-done' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isItemDone}
                          onChange={(e) => {
                            e.stopPropagation();
                            onToggleItemStatus(item);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="item-row-checkbox"
                          title={isItemDone ? '未完了に戻す' : 'アクションを完了にする'}
                        />
                        <span
                          className={`item-title-text ${isItemDone ? 'line-through' : ''}`}
                          title={item.title}
                        >
                          {item.title}
                        </span>
                        <button
                          className="delete-item-btn"
                          title="ノート削除"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`ノート「${item.title}」を削除しますか？`)) {
                              onDeleteItem(item);
                            }
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Past Incomplete Cell */}
                    <td className="matrix-cell past-col-cell" onClick={() => onSelectItem(item)}>
                      <div className="cell-todo-stack">
                        {visiblePastTodos.map((todo) => (
                          <div
                            key={todo.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.id, todo.id)}
                            onDragEnd={handleDragEnd}
                            className="compact-todo-pill todo-pill-past-todo"
                            title={`${todo.title}\n期日: ${todo.due}\nステータス: 未完了\n${todo.description || ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isDraggingRef.current) return;
                              onSelectItem(item, todo.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={(e) => {
                                e.stopPropagation();
                                onQuickToggleTodoStatus(item, todo.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="todo-pill-checkbox"
                              title="完了にする"
                            />
                            <span className="todo-pill-title">{todo.title}</span>
                            <span className="todo-pill-date">{formatShortDate(todo.due)}</span>
                          </div>
                        ))}

                        {hasPastMore && !isPastExpanded && (
                          <button
                            className="stacked-more-pill past-stacked"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePastExpand(item.id);
                            }}
                            title="クリックして全件表示"
                          >
                            <div className="stacked-content">
                              <Layers size={12} className="stacked-icon" />
                              <span>+{hiddenPastCount}件の過去タスク</span>
                              <ChevronDown size={12} className="stacked-arrow" />
                            </div>
                          </button>
                        )}

                        {hasPastMore && isPastExpanded && (
                          <button
                            className="collapse-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePastExpand(item.id);
                            }}
                            title="折りたたむ"
                          >
                            <ChevronUp size={12} />
                            <span>たたむ</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 7 Days Cells */}
                    {days.map((day) => {
                      const cellTodos = item.todos.filter((t) => t.due === day.dateStr);

                      let cellBgClass = day.isToday
                        ? 'today-col-cell'
                        : day.isNonWorkingDay
                        ? 'holiday-cell'
                        : 'weekday-cell';

                      const isDragOverThisCell =
                        dragOverCell?.itemId === item.id && dragOverCell?.dateStr === day.dateStr;

                      const isAddingHere =
                        addingTodoCell?.itemId === item.id && addingTodoCell?.dateStr === day.dateStr;

                      return (
                        <td
                          key={day.dateStr}
                          className={`matrix-cell ${cellBgClass} ${isDragOverThisCell ? 'drag-over-cell' : ''}`}
                          onDragOver={(e) => handleDragOver(e, item.id, day.dateStr)}
                          onDragLeave={(e) => handleDragLeave(e, item.id, day.dateStr)}
                          onDrop={(e) => handleDrop(e, item, day.dateStr)}
                          onClick={() => {
                            if (isDraggingRef.current) return;
                            onSelectItem(item);
                          }}
                        >
                          <div className="cell-todo-stack">
                            {cellTodos.map((todo) => (
                              <div
                                key={todo.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item.id, todo.id)}
                                onDragEnd={handleDragEnd}
                                className={`compact-todo-pill status-${todo.status}`}
                                title={`${todo.title}\nステータス: ${todo.status === 'done' ? '完了' : '未完了'}\n${todo.description || ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isDraggingRef.current) return;
                                  onSelectItem(item, todo.id);
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={todo.status === 'done'}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    onQuickToggleTodoStatus(item, todo.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="todo-pill-checkbox"
                                  title={todo.status === 'done' ? '未完了に戻す' : '完了にする'}
                                />
                                <span className={`todo-pill-title ${todo.status === 'done' ? 'line-through' : ''}`}>
                                  {todo.title}
                                </span>
                              </div>
                            ))}

                            {isAddingHere ? (
                              <div className="inline-todo-input-wrapper" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  className="inline-todo-input"
                                  placeholder="TODOを入力..."
                                  value={inlineTodoTitle}
                                  onChange={(e) => setInlineTodoTitle(e.target.value)}
                                  onKeyDown={(e) => handleInlineKeyDown(e, item, day.dateStr)}
                                  onBlur={() => handleSaveInlineTodo(item, day.dateStr)}
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <div
                                className="cell-add-prompt"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartInlineAdd(item.id, day.dateStr);
                                }}
                                title="TODOを追加"
                              >
                                <Plus size={11} />
                                <span>TODOを追加</span>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Future Cell */}
                    <td className="matrix-cell future-col-cell" onClick={() => onSelectItem(item)}>
                      <div className="cell-todo-stack">
                        {visibleFutureTodos.map((todo) => (
                          <div
                            key={todo.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.id, todo.id)}
                            onDragEnd={handleDragEnd}
                            className={`compact-todo-pill status-${todo.status}`}
                            title={`${todo.title}\n期日: ${todo.due}\nステータス: ${todo.status === 'done' ? '完了' : '未完了'}\n${todo.description || ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isDraggingRef.current) return;
                              onSelectItem(item, todo.id);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={todo.status === 'done'}
                              onChange={(e) => {
                                e.stopPropagation();
                                onQuickToggleTodoStatus(item, todo.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="todo-pill-checkbox"
                              title={todo.status === 'done' ? '未完了に戻す' : '完了にする'}
                            />
                            <span className={`todo-pill-title ${todo.status === 'done' ? 'line-through' : ''}`}>
                              {todo.title}
                            </span>
                            <span className="todo-pill-date">{formatShortDate(todo.due)}</span>
                          </div>
                        ))}

                        {hasFutureMore && !isFutureExpanded && (
                          <button
                            className="stacked-more-pill future-stacked"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFutureExpand(item.id);
                            }}
                            title="クリックして全件表示"
                          >
                            <div className="stacked-content">
                              <Layers size={12} className="stacked-icon" />
                              <span>+{hiddenFutureCount}件の未来タスク</span>
                              <ChevronDown size={12} className="stacked-arrow" />
                            </div>
                          </button>
                        )}

                        {hasFutureMore && isFutureExpanded && (
                          <button
                            className="collapse-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFutureExpand(item.id);
                            }}
                            title="折りたたむ"
                          >
                            <ChevronUp size={12} />
                            <span>たたむ</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


