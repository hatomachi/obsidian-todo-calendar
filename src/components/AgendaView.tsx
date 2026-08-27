import React, { useState } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Circle, Clock, ChevronDown, ChevronRight, ExternalLink, Filter } from 'lucide-react';
import { AgendaTodoItem, CollectionData, ItemData } from '../types';

interface AgendaViewProps {
  agendaItems: AgendaTodoItem[];
  collections: CollectionData[];
  selectedCollectionId: string | null;
  onSelectCollectionFilter: (colId: string | null) => void;
  onQuickToggleTodoStatus: (item: ItemData, todoId: string) => void;
  onSelectItem: (item: ItemData, todoId?: string) => void;
  onJumpToCollection: (collection: CollectionData) => void;
}

const formatDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getRelativeDateLabel = (dateStr: string, todayStr: string): string => {
  if (!dateStr) return '期日なし';
  if (dateStr === todayStr) return '今日';
  
  const today = new Date(todayStr);
  const target = new Date(dateStr);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 1) return '明日';
  if (diffDays === 2) return '明後日';
  if (diffDays < 0) return `${Math.abs(diffDays)}日前`;
  return `${diffDays}日後`;
};

export const AgendaView: React.FC<AgendaViewProps> = ({
  agendaItems,
  collections,
  selectedCollectionId,
  onSelectCollectionFilter,
  onQuickToggleTodoStatus,
  onSelectItem,
  onJumpToCollection,
}) => {
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showNoDue, setShowNoDue] = useState(false);

  const todayStr = formatDateStr(new Date());

  // Filter items if a specific collection filter is applied
  const filteredItems = selectedCollectionId
    ? agendaItems.filter((item) => item.collection.id === selectedCollectionId)
    : agendaItems;

  // Categorize
  const overdue: AgendaTodoItem[] = [];
  const todayList: AgendaTodoItem[] = [];
  const upcoming: AgendaTodoItem[] = [];
  const noDueList: AgendaTodoItem[] = [];

  // 3日後までの日付文字列
  const next3Days = new Date();
  next3Days.setDate(next3Days.getDate() + 3);
  const next3DaysStr = formatDateStr(next3Days);

  filteredItems.forEach((entry) => {
    const { due, status } = entry.todo;
    if (!due) {
      noDueList.push(entry);
    } else if (due < todayStr && status === 'todo') {
      overdue.push(entry);
    } else if (due === todayStr) {
      todayList.push(entry);
    } else if (due > todayStr && due <= next3DaysStr && status === 'todo') {
      upcoming.push(entry);
    }
  });

  // Sort lists
  overdue.sort((a, b) => (a.todo.due > b.todo.due ? 1 : -1));
  todayList.sort((a, b) => {
    if (a.todo.status !== b.todo.status) return a.todo.status === 'done' ? 1 : -1;
    return a.collection.title.localeCompare(b.collection.title);
  });
  upcoming.sort((a, b) => (a.todo.due > b.todo.due ? 1 : -1));

  return (
    <div className="todo-cal-agenda-container">
      {/* Header Bar */}
      <div className="todo-cal-agenda-header">
        <div className="todo-cal-agenda-title-group">
          <h2>📅 今日のアジェンダ</h2>
          <span className="todo-cal-agenda-date">{todayStr}</span>
        </div>

        <div className="todo-cal-agenda-filter-group">
          <Filter size={16} />
          <select
            value={selectedCollectionId || ''}
            onChange={(e) => onSelectCollectionFilter(e.target.value || null)}
            className="todo-cal-agenda-filter-select"
          >
            <option value="">すべてのコレクション (全 {collections.length} 件)</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Agenda Content */}
      <div className="todo-cal-agenda-content">
        {/* Overdue Section */}
        {overdue.length > 0 && (
          <div className="todo-cal-agenda-section overdue-section">
            <div className="todo-cal-agenda-section-header">
              <AlertCircle className="icon overdue-icon" size={18} />
              <h3>期限切れ (Overdue)</h3>
              <span className="count-badge overdue-badge">{overdue.length}</span>
            </div>
            <div className="todo-cal-agenda-list">
              {overdue.map((entry) => (
                <AgendaCard
                  key={entry.todo.id}
                  entry={entry}
                  todayStr={todayStr}
                  onQuickToggleTodoStatus={onQuickToggleTodoStatus}
                  onSelectItem={onSelectItem}
                  onJumpToCollection={onJumpToCollection}
                />
              ))}
            </div>
          </div>
        )}

        {/* Today Section */}
        <div className="todo-cal-agenda-section today-section">
          <div className="todo-cal-agenda-section-header">
            <Calendar className="icon today-icon" size={18} />
            <h3>今日 (Today)</h3>
            <span className="count-badge today-badge">{todayList.length}</span>
          </div>
          {todayList.length === 0 ? (
            <div className="todo-cal-agenda-empty">🎉 本日のタスクはありません！素晴らしい1日を。</div>
          ) : (
            <div className="todo-cal-agenda-list">
              {todayList.map((entry) => (
                <AgendaCard
                  key={entry.todo.id}
                  entry={entry}
                  todayStr={todayStr}
                  onQuickToggleTodoStatus={onQuickToggleTodoStatus}
                  onSelectItem={onSelectItem}
                  onJumpToCollection={onJumpToCollection}
                />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Section */}
        {upcoming.length > 0 && (
          <div className="todo-cal-agenda-section upcoming-section">
            <div
              className="todo-cal-agenda-section-header collapsible"
              onClick={() => setShowUpcoming(!showUpcoming)}
            >
              {showUpcoming ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <Clock className="icon upcoming-icon" size={18} />
              <h3>近日中 (Upcoming)</h3>
              <span className="count-badge upcoming-badge">{upcoming.length}</span>
            </div>
            {showUpcoming && (
              <div className="todo-cal-agenda-list">
                {upcoming.map((entry) => (
                  <AgendaCard
                    key={entry.todo.id}
                    entry={entry}
                    todayStr={todayStr}
                    onQuickToggleTodoStatus={onQuickToggleTodoStatus}
                    onSelectItem={onSelectItem}
                    onJumpToCollection={onJumpToCollection}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* No Due Date Section */}
        {noDueList.length > 0 && (
          <div className="todo-cal-agenda-section nodue-section">
            <div
              className="todo-cal-agenda-section-header collapsible"
              onClick={() => setShowNoDue(!showNoDue)}
            >
              {showNoDue ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <h3>期日未設定</h3>
              <span className="count-badge nodue-badge">{noDueList.length}</span>
            </div>
            {showNoDue && (
              <div className="todo-cal-agenda-list">
                {noDueList.map((entry) => (
                  <AgendaCard
                    key={entry.todo.id}
                    entry={entry}
                    todayStr={todayStr}
                    onQuickToggleTodoStatus={onQuickToggleTodoStatus}
                    onSelectItem={onSelectItem}
                    onJumpToCollection={onJumpToCollection}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface AgendaCardProps {
  entry: AgendaTodoItem;
  todayStr: string;
  onQuickToggleTodoStatus: (item: ItemData, todoId: string) => void;
  onSelectItem: (item: ItemData, todoId?: string) => void;
  onJumpToCollection: (collection: CollectionData) => void;
}

const AgendaCard: React.FC<AgendaCardProps> = ({
  entry,
  todayStr,
  onQuickToggleTodoStatus,
  onSelectItem,
  onJumpToCollection,
}) => {
  const { todo, item, collection } = entry;
  const isDone = todo.status === 'done';
  const relativeDate = getRelativeDateLabel(todo.due, todayStr);

  return (
    <div className={`todo-cal-agenda-card ${isDone ? 'is-done' : ''}`}>
      <button
        className="todo-cal-agenda-checkbox"
        onClick={(e) => {
          e.stopPropagation();
          onQuickToggleTodoStatus(item, todo.id);
        }}
        title={isDone ? '未完了に戻す' : '完了にする'}
      >
        {isDone ? <CheckCircle2 className="icon-done" size={18} /> : <Circle className="icon-todo" size={18} />}
      </button>

      <div
        className="todo-cal-agenda-card-body"
        onClick={() => onSelectItem(item, todo.id)}
      >
        <div className="todo-cal-agenda-card-title">{todo.title}</div>
        <div className="todo-cal-agenda-card-sub">
          <span className="item-title">{item.title}</span>
          {todo.due && <span className="due-tag">{todo.due} ({relativeDate})</span>}
        </div>
      </div>

      <div className="todo-cal-agenda-card-actions">
        <button
          className="todo-cal-collection-badge"
          style={{
            borderColor: collection.color || 'var(--interactive-accent)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onJumpToCollection(collection);
          }}
          title={`${collection.title} カレンダーへ移動`}
        >
          <span>{collection.title}</span>
          <ExternalLink size={12} className="badge-icon" />
        </button>
      </div>
    </div>
  );
};
