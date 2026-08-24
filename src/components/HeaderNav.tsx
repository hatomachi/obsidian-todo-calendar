import React from 'react';
import {
  ArrowLeft,
  Plus,
  Calendar,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Eye,
  EyeOff,
  Settings,
  Tag,
} from 'lucide-react';
import { CollectionData } from '../types';
import { ItemType } from '../features/item-types/types';

interface HeaderNavProps {
  viewMode: 'collections' | 'calendar' | 'agenda' | 'type-calendar';
  collections: CollectionData[];
  selectedCollection: CollectionData | null;
  startDate: Date;
  showCompletedItems?: boolean;
  completedItemsCount?: number;
  enableItemTypes?: boolean;
  itemTypes?: ItemType[];
  selectedType?: ItemType | null;
  onToggleShowCompleted?: () => void;
  onBackToCollections: () => void;
  onSelectAgenda: () => void;
  onSelectCollection: (collection: CollectionData) => void;
  onNavigateCollection?: (direction: -1 | 1) => void;
  onSelectType?: (type: ItemType) => void;
  onNavigateType?: (direction: -1 | 1) => void;
  onNavigateDate: (days: number) => void;
  onResetToToday: () => void;
  onOpenCreateItemModal: () => void;
  onOpenTemplateSettings?: () => void;
  onRefresh: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  viewMode,
  collections,
  selectedCollection,
  startDate,
  showCompletedItems = false,
  completedItemsCount = 0,
  enableItemTypes = true,
  itemTypes = [],
  selectedType = null,
  onToggleShowCompleted,
  onBackToCollections,
  onSelectAgenda,
  onSelectCollection,
  onNavigateCollection,
  onSelectType,
  onNavigateType,
  onNavigateDate,
  onResetToToday,
  onOpenCreateItemModal,
  onOpenTemplateSettings,
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

  const currentTypeIndex = selectedType
    ? itemTypes.findIndex((t) => t.id === selectedType.id)
    : -1;

  const isMatrixView = viewMode === 'calendar' || viewMode === 'type-calendar';

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

        {enableItemTypes && itemTypes.length > 0 && (
          <div className={`nav-type-dropdown-btn ${viewMode === 'type-calendar' ? 'active-tab' : 'secondary-btn'}`}>
            <Tag size={16} className="badge-icon" />
            <select
              className="nav-type-dropdown-select"
              value={viewMode === 'type-calendar' && selectedType ? selectedType.id : ''}
              onChange={(e) => {
                const targetType = itemTypes.find((t) => t.id === e.target.value);
                if (targetType && onSelectType) {
                  onSelectType(targetType);
                }
              }}
            >
              <option value="" disabled={viewMode === 'type-calendar'}>
                タイプ別...
              </option>
              {itemTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon ? `${t.icon} ` : ''}{t.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="dropdown-arrow-icon" />
          </div>
        )}

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

        {viewMode === 'type-calendar' && selectedType && (
          <>
            <span className="breadcrumb-separator">/</span>
            <div className="collection-stepper-container type-stepper-container">
              <button
                className="collection-stepper-btn"
                onClick={() => onNavigateType && onNavigateType(-1)}
                title="前のタイプ (← または [ )"
                disabled={itemTypes.length <= 1}
              >
                <ChevronLeft size={16} />
              </button>

              <div className="collection-select-badge type-select-badge" title="タイプを切り替え">
                <Tag size={16} className="badge-icon" />
                <select
                  className="collection-select-dropdown"
                  value={selectedType.id}
                  onChange={(e) => {
                    const targetType = itemTypes.find((t) => t.id === e.target.value);
                    if (targetType && onSelectType) {
                      onSelectType(targetType);
                    }
                  }}
                >
                  {itemTypes.map((t, idx) => (
                    <option key={t.id} value={t.id}>
                      {t.icon ? `${t.icon} ` : ''}{t.name} ({idx + 1}/{itemTypes.length})
                    </option>
                  ))}
                </select>
                {itemTypes.length > 1 && currentTypeIndex !== -1 && (
                  <span className="collection-index-indicator">
                    {currentTypeIndex + 1}/{itemTypes.length}
                  </span>
                )}
                <ChevronDown size={14} className="dropdown-arrow-icon" />
              </div>

              <button
                className="collection-stepper-btn"
                onClick={() => onNavigateType && onNavigateType(1)}
                title="次のタイプ (→ または ] )"
                disabled={itemTypes.length <= 1}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="header-right">
        {isMatrixView && (
          <>
            {onToggleShowCompleted && (
              <button
                className={`nav-btn toggle-completed-btn ${showCompletedItems ? 'active-toggle' : 'secondary-btn'}`}
                onClick={onToggleShowCompleted}
                title={showCompletedItems ? '完了行を隠す' : '完了行を表示する'}
              >
                {showCompletedItems ? <EyeOff size={15} /> : <Eye size={15} />}
                <span>
                  {showCompletedItems
                    ? '完了行を非表示'
                    : `完了行を表示${completedItemsCount > 0 ? ` (${completedItemsCount})` : ''}`}
                </span>
              </button>
            )}

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
          </>
        )}

        <button className="icon-btn" onClick={onRefresh} title="データ更新">
          <RefreshCw size={16} />
        </button>

        {enableItemTypes && onOpenTemplateSettings && (
          <button
            className="icon-btn"
            onClick={onOpenTemplateSettings}
            title="タイプ & テンプレート設定"
          >
            <Settings size={16} />
          </button>
        )}

        {isMatrixView && (
          <button className="nav-btn primary-btn" onClick={onOpenCreateItemModal}>
            <Plus size={16} />
            <span>新規アイテム</span>
          </button>
        )}
      </div>
    </div>
  );
};


