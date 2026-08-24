import React from 'react';
import { ArrowLeft, Plus, Calendar, RefreshCw, Layers, ChevronDown, ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react';
import { CollectionData } from '../types';

interface HeaderNavProps {
  viewMode: 'collections' | 'calendar' | 'agenda';
  collections: CollectionData[];
  selectedCollection: CollectionData | null;
  startDate: Date;
  onBackToCollections: () => void;
  onSelectAgenda: () => void;
  onSelectCollection: (collection: CollectionData) => void;
  onNavigateCollection?: (direction: -1 | 1) => void;
  onNavigateDate: (days: number) => void;
  onResetToToday: () => void;
  onOpenCreateItemModal: () => void;
  onRefresh: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  viewMode,
  collections,
  selectedCollection,
  startDate,
  onBackToCollections,
  onSelectAgenda,
  onSelectCollection,
  onNavigateCollection,
  onNavigateDate,
  onResetToToday,
  onOpenCreateItemModal,
  onRefresh,
}) => {
  const formatDateRangeHeader = (start: Date) => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const options: Intl.DateTimeFormatOptions = { month: 'numeric', day: 'numeric' };
    return `${start.toLocaleDateString('ja-JP', options)} - ${end.toLocaleDateString('ja-JP', options)}`;
  };

  const currentCollectionIndex = selectedCollection
    ? collections.findIndex((c) => c.id === selectedCollection.id)
    : -1;

  return (
    <div className="todo-cal-header">
      <div className="header-left">
        <button
          className={`nav-btn ${viewMode === 'collections' ? 'active-tab' : 'secondary-btn'}`}
          onClick={onBackToCollections}
          title="コレクション一覧"
        >
          <Layers size={16} />
          <span>コレクション</span>
        </button>

        <button
          className={`nav-btn ${viewMode === 'agenda' ? 'active-tab' : 'secondary-btn'}`}
          onClick={onSelectAgenda}
          title="今日のアジェンダ"
        >
          <CheckSquare size={16} />
          <span>今日のアジェンダ</span>
        </button>

        {viewMode === 'calendar' && (
          <>
            <span className="breadcrumb-separator">/</span>
            <div className="collection-stepper-container">
              <button
                className="collection-stepper-btn"
                onClick={() => onNavigateCollection && onNavigateCollection(-1)}
                title="前のコレクション (← または [ )"
                disabled={collections.length <= 1}
              >
                <ChevronLeft size={16} />
              </button>

              <div className="collection-select-badge" title="コレクションを切り替え">
                <Layers size={16} className="badge-icon" />
                <select
                  className="collection-select-dropdown"
                  value={selectedCollection?.id || ''}
                  onChange={(e) => {
                    const targetCol = collections.find((c) => c.id === e.target.value);
                    if (targetCol) {
                      onSelectCollection(targetCol);
                    }
                  }}
                >
                  {collections.map((col, idx) => (
                    <option key={col.id} value={col.id}>
                      {col.title} ({idx + 1}/{collections.length})
                    </option>
                  ))}
                </select>
                {collections.length > 1 && currentCollectionIndex !== -1 && (
                  <span className="collection-index-indicator">
                    {currentCollectionIndex + 1}/{collections.length}
                  </span>
                )}
                <ChevronDown size={14} className="dropdown-arrow-icon" />
              </div>

              <button
                className="collection-stepper-btn"
                onClick={() => onNavigateCollection && onNavigateCollection(1)}
                title="次のコレクション (→ または ] )"
                disabled={collections.length <= 1}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="header-right">
        {viewMode === 'calendar' && (
          <div className="date-controls">
            <button className="nav-btn secondary-btn" onClick={() => onNavigateDate(-7)} title="前週">
              &lt; 前週
            </button>
            <button className="nav-btn secondary-btn today-btn" onClick={onResetToToday}>
              今日
            </button>
            <button className="nav-btn secondary-btn" onClick={() => onNavigateDate(7)} title="次週">
              次週 &gt;
            </button>

            <span className="date-range-label">{formatDateRangeHeader(startDate)}</span>
          </div>
        )}

        <button className="icon-btn" onClick={onRefresh} title="データ更新">
          <RefreshCw size={16} />
        </button>

        {viewMode === 'calendar' && (
          <button className="nav-btn primary-btn" onClick={onOpenCreateItemModal}>
            <Plus size={16} />
            <span>新規アイテム</span>
          </button>
        )}
      </div>
    </div>
  );
};


