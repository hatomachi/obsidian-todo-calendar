import React from 'react';
import { CheckCircle2, Circle, Clock, FileText, Plus, Trash2 } from 'lucide-react';
import { ItemData, TodoItem, TodoStatus } from '../types';
import { isJapaneseHoliday } from '../utils/holidays';

interface CalendarMatrixViewProps {
  items: ItemData[];
  startDate: Date;
  selectedItemId: string | null;
  onSelectItem: (item: ItemData, todoId?: string) => void;
  onQuickToggleTodoStatus: (item: ItemData, todoId: string) => void;
  onDeleteItem: (item: ItemData) => void;
  onOpenCreateItemModal: () => void;
}

export const CalendarMatrixView: React.FC<CalendarMatrixViewProps> = ({
  items,
  startDate,
  selectedItemId,
  onSelectItem,
  onQuickToggleTodoStatus,
  onDeleteItem,
  onOpenCreateItemModal,
}) => {
  // Generate 7 days starting from startDate
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); // 0: Sun, 6: Sat
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const isHoliday = isJapaneseHoliday(d);
    const isNonWorkingDay = isSunday || isSaturday || isHoliday;
    const dayLabel = d.toLocaleDateString('ja-JP', { weekday: 'short', month: 'numeric', day: 'numeric' });
    return { dateStr, dayLabel, isToday, isSunday, isSaturday, isHoliday, isNonWorkingDay };
  });

  return (
    <div className="calendar-matrix-container">
      <div className="table-scroll-wrapper">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="row-header-th">タスクノート (Item)</th>
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
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-matrix-td">
                  <div className="empty-matrix-state">
                    <p>このコレクションにはまだアイテムがありません。</p>
                    <button className="nav-btn primary-btn" onClick={onOpenCreateItemModal}>
                      <Plus size={16} />
                      <span>新規アイテムを作成</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isSelected = item.id === selectedItemId;

                return (
                  <tr key={item.id} className={`matrix-row ${isSelected ? 'row-selected' : ''}`}>
                    {/* Row Header: Item Title */}
                    <td className="row-header-td" onClick={() => onSelectItem(item)}>
                      <div className="item-row-header-content">
                        <FileText size={16} className="item-icon" />
                        <span className="item-title-text" title={item.title}>
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

                    {/* 7 Days Cells */}
                    {days.map((day) => {
                      // Filter TODOs for this item matching the column's date
                      const cellTodos = item.todos.filter((t) => t.due === day.dateStr);

                      let cellBgClass = day.isToday
                        ? 'today-col-cell'
                        : day.isNonWorkingDay
                        ? 'holiday-cell'
                        : 'weekday-cell';

                      return (
                        <td
                          key={day.dateStr}
                          className={`matrix-cell ${cellBgClass}`}
                          onClick={() => onSelectItem(item)}
                        >
                          <div className="cell-todo-stack">
                            {cellTodos.map((todo) => (
                              <div
                                key={todo.id}
                                className={`compact-todo-pill status-${todo.status}`}
                                title={`${todo.title}\nステータス: ${todo.status === 'done' ? '完了' : '未完了'}\n${todo.description || ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
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
                          </div>
                        </td>
                      );
                    })}
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
