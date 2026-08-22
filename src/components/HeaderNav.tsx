import React from 'react';
import { ArrowLeft, Plus, Calendar, RefreshCw, Layers } from 'lucide-react';
import { CollectionData } from '../types';

interface HeaderNavProps {
  viewMode: 'collections' | 'calendar';
  selectedCollection: CollectionData | null;
  startDate: Date;
  onBackToCollections: () => void;
  onNavigateDate: (days: number) => void;
  onResetToToday: () => void;
  onOpenCreateItemModal: () => void;
  onRefresh: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  viewMode,
  selectedCollection,
  startDate,
  onBackToCollections,
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

  return (
    <div className="todo-cal-header">
      <div className="header-left">
        {viewMode === 'calendar' ? (
          <>
            <button
              className="nav-btn secondary-btn"
              onClick={onBackToCollections}
              title="コレクション一覧へ戻る"
            >
              <ArrowLeft size={16} />
              <span>コレクション</span>
            </button>
            <span className="breadcrumb-separator">/</span>
            <div className="collection-title-badge">
              <Layers size={16} className="badge-icon" />
              <span className="title-text">{selectedCollection?.title}</span>
            </div>
          </>
        ) : (
          <div className="app-branding">
            <Calendar size={20} className="brand-icon" />
            <h2 className="brand-title">TODO カレンダーマトリクス</h2>
          </div>
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
