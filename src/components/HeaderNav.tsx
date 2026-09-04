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
  X,
} from 'lucide-react';
import { CollectionData } from '../types';
import { ItemType } from '../features/item-types/types';

interface HeaderNavProps {
  viewMode: 'collections' | 'calendar' | 'agenda' | 'type-calendar';
  collections: CollectionData[];
  selectedCollection: CollectionData | null;
  activeTagFilter?: string | null;
  onClearTagFilter?: () => void;
  startDate: Date;
  daysCount?: 3 | 7;
  showCompletedItems?: boolean;
  completedItemsCount?: number;
  enableItemTypes?: boolean;
  itemTypes?: ItemType[];
  selectedType?: ItemType | null;
  onToggleDaysCount?: (count: 3 | 7) => void;
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
  activeTagFilter,
  onClearTagFilter,
  startDate,
  daysCount = 7,
  showCompletedItems = false,
  completedItemsCount = 0,
  enableItemTypes = true,
  itemTypes = [],
  selectedType = null,
  onToggleDaysCount,
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
  const formatDateRangeHeader = (start: Date, count: number) => {
    const end = new Date(start);
    end.setDate(start.getDate() + (count - 1));
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
    <div className={`todo-cal-header ${isMatrixView ? 'header-matrix-mode' : 'header-overview-mode'}`}>
      <div className="header-left">
        <button
          className={`nav-btn ${viewMode === 'collections' ? 'active-tab' : 'secondary-btn'} ${isMatrixView ? 'matrix-back-btn' : ''}`}
          onClick={onBackToCollections}
          title="コレクション一覧"
        >
          {isMatrixView ? (
            <>
              <ArrowLeft size={16} className="mobile-only-icon" />
              <Layers size={16} className="desktop-only-icon" />
              <span className="desktop-btn-label">コレクション</span>
              <span className="mobile-btn-label">一覧</span>
            </>
          ) : (
            <>
              <Layers size={16} />
              <span>コレクション</span>
            </>
          )}
        </button>

        <button
          className={`nav-btn ${viewMode === 'agenda' ? 'active-tab' : 'secondary-btn'} ${isMatrixView ? 'desktop-only' : ''}`}
          onClick={onSelectAgenda}
          title="今日のアジェンダ"
        >
          <CheckSquare size={16} />
          <span>今日のアジェンダ</span>
        </button>

        {enableItemTypes && itemTypes.length > 0 && (
          <div className={`nav-type-dropdown-btn ${viewMode === 'type-calendar' ? 'active-tab' : 'secondary-btn'} ${isMatrixView ? 'desktop-only' : ''}`}>
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
            <span className="breadcrumb-separator desktop-only">/</span>
            <div className="collection-stepper-container desktop-only">
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

            {/* Active Tag Filter Pill */}
            {activeTagFilter && (
              <div
                className="header-active-tag-badge desktop-only"
                title="タグフィルター中（クリックで解除）"
                onClick={onClearTagFilter}
              >
                <Tag size={12} className="header-tag-icon" />
                <span className="header-tag-name">
                  {activeTagFilter === '__untagged__' ? '未分類' : `#${activeTagFilter}`}
                </span>
                <span className="header-tag-clear-btn" title="フィルター解除">
                  <X size={12} />
                </span>
              </div>
            )}
          </>
        )}

        {viewMode === 'type-calendar' && selectedType && (
          <>
            <span className="breadcrumb-separator desktop-only">/</span>
            <div className="collection-stepper-container type-stepper-container desktop-only">
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
                className={`nav-btn toggle-completed-btn header-toggle-completed-btn ${showCompletedItems ? 'active-toggle' : 'secondary-btn'}`}
                onClick={onToggleShowCompleted}
                title={showCompletedItems ? '完了行を隠す' : '完了行を表示する'}
              >
                {showCompletedItems ? <EyeOff size={15} /> : <Eye size={15} />}
                <span className="desktop-btn-label">
                  {showCompletedItems
                    ? '完了行を非表示'
                    : `完了行を表示${completedItemsCount > 0 ? ` (${completedItemsCount})` : ''}`}
                </span>
              </button>
            )}

            <div className="date-controls">
              {onToggleDaysCount && (
                <div className="days-count-toggle-group">
                  <button
                    type="button"
                    className={`days-count-btn ${daysCount === 3 ? 'active' : ''}`}
                    onClick={() => onToggleDaysCount(3)}
                    title="3日間表示 (未完了 + 当日含め3日)"
                  >
                    3日
                  </button>
                  <button
                    type="button"
                    className={`days-count-btn ${daysCount === 7 ? 'active' : ''}`}
                    onClick={() => onToggleDaysCount(7)}
                    title="7日間表示 (1週間)"
                  >
                    7日
                  </button>
                </div>
              )}
              <button
                className="nav-btn secondary-btn desktop-only"
                onClick={() => onNavigateDate(-daysCount)}
                title={daysCount === 3 ? '前の3日間' : '前週'}
              >
                &lt; {daysCount === 3 ? '前' : '前週'}
              </button>
              <button className="nav-btn secondary-btn today-btn desktop-only" onClick={onResetToToday}>
                今日
              </button>
              <button
                className="nav-btn secondary-btn desktop-only"
                onClick={() => onNavigateDate(daysCount)}
                title={daysCount === 3 ? '次の3日間' : '次週'}
              >
                {daysCount === 3 ? '次' : '次週'} &gt;
              </button>

              <span className="date-range-label">{formatDateRangeHeader(startDate, daysCount)}</span>
            </div>
          </>
        )}

        <button className={`icon-btn ${isMatrixView ? 'desktop-only' : ''}`} onClick={onRefresh} title="データ更新">
          <RefreshCw size={16} />
        </button>

        {enableItemTypes && onOpenTemplateSettings && (
          <button
            className={`icon-btn ${isMatrixView ? 'desktop-only' : ''}`}
            onClick={onOpenTemplateSettings}
            title="タイプ & テンプレート設定"
          >
            <Settings size={16} />
          </button>
        )}

        {isMatrixView && (
          <button
            className="nav-btn primary-btn create-item-btn header-create-item-btn"
            onClick={onOpenCreateItemModal}
            title="新規アイテム (タスクノート) を作成"
          >
            <Plus size={16} />
            <span className="desktop-btn-label">新規アイテム</span>
          </button>
        )}
      </div>
    </div>
  );
};


