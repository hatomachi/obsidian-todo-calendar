import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { CollectionData } from '../types';
import { ItemType } from '../features/item-types/types';

interface MobileBottomBarProps {
  viewMode: 'calendar' | 'type-calendar';
  collections: CollectionData[];
  selectedCollection: CollectionData | null;
  itemTypes?: ItemType[];
  selectedType?: ItemType | null;
  startDate: Date;
  daysCount?: 3 | 7;
  onNavigateCollection?: (direction: -1 | 1) => void;
  onSelectCollection?: (collection: CollectionData) => void;
  onNavigateType?: (direction: -1 | 1) => void;
  onSelectType?: (type: ItemType) => void;
  onNavigateDate: (days: number) => void;
  onResetToToday: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  viewMode,
  collections,
  selectedCollection,
  itemTypes = [],
  selectedType = null,
  startDate,
  daysCount = 3,
  onNavigateCollection,
  onSelectCollection,
  onNavigateType,
  onSelectType,
  onNavigateDate,
  onResetToToday,
}) => {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Check if start date is today
  const today = new Date();
  const isToday =
    startDate.getFullYear() === today.getFullYear() &&
    startDate.getMonth() === today.getMonth() &&
    startDate.getDate() === today.getDate();

  const currentCollectionIndex = selectedCollection
    ? collections.findIndex((c) => c.id === selectedCollection.id)
    : -1;

  const currentTypeIndex = selectedType
    ? itemTypes.findIndex((t) => t.id === selectedType.id)
    : -1;

  // Swipe handling for fast flick navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Trigger swipe if horizontal movement is greater than vertical and exceeds threshold (40px)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        // Swipe Right -> Previous
        if (viewMode === 'calendar' && onNavigateCollection) {
          onNavigateCollection(-1);
        } else if (viewMode === 'type-calendar' && onNavigateType) {
          onNavigateType(-1);
        }
      } else {
        // Swipe Left -> Next
        if (viewMode === 'calendar' && onNavigateCollection) {
          onNavigateCollection(1);
        } else if (viewMode === 'type-calendar' && onNavigateType) {
          onNavigateType(1);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const totalCount = viewMode === 'calendar' ? collections.length : itemTypes.length;
  const currentIndex = viewMode === 'calendar' ? currentCollectionIndex : currentTypeIndex;
  const canNavigate = totalCount > 1;

  return (
    <div
      className="todo-cal-mobile-bottom-bar"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Left Section: Date Controls */}
      <div className="mobile-bottom-date-group">
        <button
          type="button"
          className={`mobile-bottom-today-btn ${isToday ? 'is-today-active' : ''}`}
          onClick={onResetToToday}
          title="今日に戻る"
        >
          <Calendar size={13} />
          <span>今日</span>
        </button>

        <div className="mobile-bottom-date-steppers">
          <button
            type="button"
            className="mobile-bottom-date-step-btn"
            onClick={() => onNavigateDate(-daysCount)}
            title={daysCount === 3 ? '前の3日間' : '前週'}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="mobile-bottom-date-step-btn"
            onClick={() => onNavigateDate(daysCount)}
            title={daysCount === 3 ? '次の3日間' : '次週'}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Center Section: Current Collection / Type Indicator & Direct Selector */}
      <div className="mobile-bottom-center-group">
        {viewMode === 'calendar' && selectedCollection && (
          <div className="mobile-bottom-dropdown-wrapper" title="コレクションを選択">
            <Layers size={13} className="mobile-bottom-icon" />
            <span className="mobile-bottom-name-text">
              {selectedCollection.title}
            </span>
            {totalCount > 1 && (
              <span className="mobile-bottom-counter">
                {currentIndex + 1}/{totalCount}
              </span>
            )}
            <ChevronDown size={12} className="mobile-bottom-chevron" />
            <select
              className="mobile-bottom-hidden-select"
              value={selectedCollection.id}
              onChange={(e) => {
                const target = collections.find((c) => c.id === e.target.value);
                if (target && onSelectCollection) {
                  onSelectCollection(target);
                }
              }}
            >
              {collections.map((col, idx) => (
                <option key={col.id} value={col.id}>
                  {col.title} ({idx + 1}/{collections.length})
                </option>
              ))}
            </select>
          </div>
        )}

        {viewMode === 'type-calendar' && selectedType && (
          <div className="mobile-bottom-dropdown-wrapper" title="タイプを選択">
            <Tag size={13} className="mobile-bottom-icon" />
            <span className="mobile-bottom-name-text">
              {selectedType.icon ? `${selectedType.icon} ` : ''}
              {selectedType.name}
            </span>
            {totalCount > 1 && (
              <span className="mobile-bottom-counter">
                {currentIndex + 1}/{totalCount}
              </span>
            )}
            <ChevronDown size={12} className="mobile-bottom-chevron" />
            <select
              className="mobile-bottom-hidden-select"
              value={selectedType.id}
              onChange={(e) => {
                const target = itemTypes.find((t) => t.id === e.target.value);
                if (target && onSelectType) {
                  onSelectType(target);
                }
              }}
            >
              {itemTypes.map((t, idx) => (
                <option key={t.id} value={t.id}>
                  {t.icon ? `${t.icon} ` : ''}
                  {t.name} ({idx + 1}/{itemTypes.length})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right Section: Large Rapid-Navigation Buttons (◀ ▶) */}
      <div className="mobile-bottom-nav-group">
        <button
          type="button"
          className="mobile-bottom-rapid-btn"
          disabled={!canNavigate}
          onClick={() => {
            if (viewMode === 'calendar' && onNavigateCollection) {
              onNavigateCollection(-1);
            } else if (viewMode === 'type-calendar' && onNavigateType) {
              onNavigateType(-1);
            }
          }}
          title="前へ (←)"
          aria-label="前のコレクションへ"
        >
          <ChevronLeft size={22} />
        </button>

        <button
          type="button"
          className="mobile-bottom-rapid-btn"
          disabled={!canNavigate}
          onClick={() => {
            if (viewMode === 'calendar' && onNavigateCollection) {
              onNavigateCollection(1);
            } else if (viewMode === 'type-calendar' && onNavigateType) {
              onNavigateType(1);
            }
          }}
          title="次へ (→)"
          aria-label="次のコレクションへ"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
};
