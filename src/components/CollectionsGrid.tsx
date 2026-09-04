import React, { useState, useMemo } from 'react';
import {
  Folder,
  Plus,
  Search,
  Trash2,
  FileText,
  Tag,
  Layers,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Pencil,
  X,
} from 'lucide-react';
import { CollectionData } from '../types';
import { normalizeTags } from '../utils/yaml';

const GROUP_STORAGE_KEY = 'todo_cal_collections_grouped';

interface CollectionsGridProps {
  collections: CollectionData[];
  selectedTagFilter?: string | null;
  onSelectTagFilter?: (tag: string | null) => void;
  onSelectCollection: (collection: CollectionData) => void;
  onCreateCollection: (title: string, description: string, tags?: string[]) => Promise<void>;
  onUpdateCollection?: (collection: CollectionData) => Promise<void>;
  onDeleteCollection: (collectionId: string) => Promise<void>;
}

export const CollectionsGrid: React.FC<CollectionsGridProps> = ({
  collections,
  selectedTagFilter: propSelectedTagFilter,
  onSelectTagFilter,
  onSelectCollection,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelectedTagFilter, setLocalSelectedTagFilter] = useState<string | null>(null);

  const activeTagFilter = propSelectedTagFilter !== undefined ? propSelectedTagFilter : localSelectedTagFilter;
  const handleTagFilterChange = (tag: string | null) => {
    if (onSelectTagFilter) {
      onSelectTagFilter(tag);
    } else {
      setLocalSelectedTagFilter(tag);
    }
  };

  // Grouped by default as requested by user
  const [isGrouped, setIsGrouped] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(GROUP_STORAGE_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return true; // Default: true (initially grouped)
  });

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Create Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTagsInput, setNewTagsInput] = useState('');

  // Edit Modal state
  const [editingCollection, setEditingCollection] = useState<CollectionData | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');

  // Toggle group view
  const handleToggleGrouped = () => {
    const nextVal = !isGrouped;
    setIsGrouped(nextVal);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(GROUP_STORAGE_KEY, String(nextVal));
    }
  };

  // Toggle group collapse
  const handleToggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Extract all unique tags and counts across all collections
  const { allTags, tagCounts, untaggedCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    let untagged = 0;

    for (const col of collections) {
      const tags = col.tags || [];
      if (tags.length === 0) {
        untagged++;
      } else {
        for (const t of tags) {
          counts[t] = (counts[t] || 0) + 1;
        }
      }
    }

    const sortedTags = Object.keys(counts).sort((a, b) => {
      // Sort by count desc, then alphabetically
      if (counts[b] !== counts[a]) return counts[b] - counts[a];
      return a.localeCompare(b, 'ja');
    });

    return {
      allTags: sortedTags,
      tagCounts: counts,
      untaggedCount: untagged,
    };
  }, [collections]);

  // Filter collections by search term and selected tag filter
  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      // Search term filter
      const matchesSearch =
        !searchTerm.trim() ||
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.tags && c.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())));

      if (!matchesSearch) return false;

      // Tag filter
      if (activeTagFilter === null) {
        return true;
      }
      if (activeTagFilter === '__untagged__') {
        return !c.tags || c.tags.length === 0;
      }
      return c.tags && c.tags.includes(activeTagFilter);
    });
  }, [collections, searchTerm, activeTagFilter]);

  // Group collections by tag
  const groupedCollections = useMemo(() => {
    if (!isGrouped) return [];

    const groups: { key: string; name: string; isUntagged: boolean; items: CollectionData[] }[] = [];

    // If a specific tag is selected in filter, show that tag's group only
    const targetTags = activeTagFilter && activeTagFilter !== '__untagged__'
      ? [activeTagFilter]
      : activeTagFilter === '__untagged__'
      ? []
      : allTags;

    // Build section for each tag
    for (const tag of targetTags) {
      const items = filteredCollections.filter((c) => c.tags && c.tags.includes(tag));
      if (items.length > 0) {
        groups.push({
          key: `tag-${tag}`,
          name: tag,
          isUntagged: false,
          items,
        });
      }
    }

    // Build section for untagged items if applicable
    if (!activeTagFilter || activeTagFilter === '__untagged__') {
      const untaggedItems = filteredCollections.filter((c) => !c.tags || c.tags.length === 0);
      if (untaggedItems.length > 0) {
        groups.push({
          key: '__untagged__',
          name: '未分類',
          isUntagged: true,
          items: untaggedItems,
        });
      }
    }

    return groups;
  }, [isGrouped, filteredCollections, allTags, activeTagFilter]);

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const tags = normalizeTags(newTagsInput);
    await onCreateCollection(newTitle, newDesc, tags);
    setNewTitle('');
    setNewDesc('');
    setNewTagsInput('');
    setIsCreating(false);
  };

  // Open Edit Modal
  const handleOpenEdit = (col: CollectionData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCollection(col);
    setEditTitle(col.title);
    setEditDesc(col.description || '');
    setEditTagsInput((col.tags || []).join(', '));
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection || !editTitle.trim() || !onUpdateCollection) return;
    const tags = normalizeTags(editTagsInput);
    const updated: CollectionData = {
      ...editingCollection,
      title: editTitle.trim(),
      description: editDesc.trim(),
      tags,
    };
    await onUpdateCollection(updated);
    setEditingCollection(null);
  };

  // Quick tag click from tag badge or card
  const handleTagBadgeClick = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTagFilter === tag) {
      handleTagFilterChange(null); // toggle off
    } else {
      handleTagFilterChange(tag);
    }
  };

  // Render Collection Card
  const renderCollectionCard = (col: CollectionData) => {
    return (
      <div
        key={col.id}
        className="collection-card"
        onClick={() => onSelectCollection(col)}
      >
        <div className="card-top">
          <div className="card-folder-icon">
            <Folder size={24} />
          </div>
          <div className="file-count-badge" title="アイテム数">
            <FileText size={12} />
            <span>{col.itemCount || 0} files</span>
          </div>
        </div>

        <div className="card-body">
          <h3 className="card-title">{col.title}</h3>
          {col.description && <p className="card-desc">{col.description}</p>}

          {/* Tags list inside card */}
          {col.tags && col.tags.length > 0 && (
            <div className="card-tags-list">
              {col.tags.map((tag) => (
                <span
                  key={tag}
                  className={`card-tag-pill ${activeTagFilter === tag ? 'active' : ''}`}
                  title={`#${tag} でフィルター`}
                  onClick={(e) => handleTagBadgeClick(tag, e)}
                >
                  <Tag size={10} className="card-tag-icon" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="card-footer">
          <span className="card-date">
            {new Date(col.createdAt).toLocaleDateString('ja-JP')}
          </span>
          <div className="card-actions">
            {onUpdateCollection && (
              <button
                className="edit-card-btn"
                title="編集（タイトル・説明・タグ）"
                onClick={(e) => handleOpenEdit(col, e)}
              >
                <Pencil size={14} />
              </button>
            )}
            <button
              className="delete-card-btn"
              title="削除"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`「${col.title}」を削除してもよろしいですか？`)) {
                  onDeleteCollection(col.id);
                }
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="collections-dashboard">
      {/* Top Search & Actions Subhead */}
      <div className="dashboard-subhead">
        <div className="search-bar-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="コレクション名・説明・タグで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchTerm('')}
              title="検索クリア"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="dashboard-head-actions">
          {/* View Mode Toggle: Grouped vs Flat Grid */}
          <button
            className={`nav-btn secondary-btn view-toggle-btn ${isGrouped ? 'active' : ''}`}
            onClick={handleToggleGrouped}
            title={isGrouped ? 'グループ表示中（クリックで全件グリッド表示）' : 'グリッド表示中（クリックでタグ別グループ表示）'}
          >
            {isGrouped ? <Layers size={16} /> : <LayoutGrid size={16} />}
            <span className="view-toggle-text">{isGrouped ? 'グループ別' : 'フラット一覧'}</span>
          </button>

          <button className="nav-btn primary-btn" onClick={() => setIsCreating(true)}>
            <Plus size={16} />
            <span>新規コレクション</span>
          </button>
        </div>
      </div>

      {/* Tag Badges Filter Bar (One-click Batch Filter) */}
      {(allTags.length > 0 || untaggedCount > 0) && (
        <div className="collection-tag-filter-bar">
          <div className="tag-filter-scroll">
            <button
              className={`tag-filter-badge ${activeTagFilter === null ? 'active' : ''}`}
              onClick={() => handleTagFilterChange(null)}
            >
              すべて <span className="badge-count">{collections.length}</span>
            </button>

            {allTags.map((tag) => {
              const count = tagCounts[tag] || 0;
              const isSelected = activeTagFilter === tag;
              return (
                <button
                  key={tag}
                  className={`tag-filter-badge ${isSelected ? 'active' : ''}`}
                  onClick={(e) => handleTagBadgeClick(tag, e)}
                >
                  <Tag size={12} className="tag-badge-icon" />
                  <span>#{tag}</span>
                  <span className="badge-count">{count}</span>
                </button>
              );
            })}

            {untaggedCount > 0 && (
              <button
                className={`tag-filter-badge untagged-badge ${activeTagFilter === '__untagged__' ? 'active' : ''}`}
                onClick={(e) => handleTagBadgeClick('__untagged__', e)}
              >
                <span>未分類</span>
                <span className="badge-count">{untaggedCount}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreating && (
        <div className="todo-cal-modal-backdrop">
          <div className="todo-cal-modal-content">
            <h3>新規コレクションの作成</h3>
            <form onSubmit={handleCreateSubmit}>
              <div className="todo-cal-form-group">
                <label>コレクション名 *</label>
                <input
                  type="text"
                  className="todo-cal-form-input"
                  placeholder="例: プロジェクト Alpha"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="todo-cal-form-group">
                <label>説明 (任意)</label>
                <textarea
                  className="todo-cal-form-textarea"
                  placeholder="プロジェクトの目的や概要"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="todo-cal-form-group">
                <label>タグ (カンマまたはスペース区切り)</label>
                <input
                  type="text"
                  className="todo-cal-form-input"
                  placeholder="例: 仕事, 開発, プロジェクト"
                  value={newTagsInput}
                  onChange={(e) => setNewTagsInput(e.target.value)}
                />
                {allTags.length > 0 && (
                  <div className="form-suggested-tags">
                    <span className="suggested-label">候補:</span>
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="suggested-tag-btn"
                        onClick={() => {
                          const currentTags = normalizeTags(newTagsInput);
                          if (!currentTags.includes(tag)) {
                            setNewTagsInput([...currentTags, tag].join(', '));
                          }
                        }}
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="todo-cal-modal-actions">
                <button
                  type="button"
                  className="nav-btn secondary-btn"
                  onClick={() => setIsCreating(false)}
                >
                  キャンセル
                </button>
                <button type="submit" className="nav-btn primary-btn">
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCollection && (
        <div className="todo-cal-modal-backdrop">
          <div className="todo-cal-modal-content">
            <h3>コレクションの編集</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="todo-cal-form-group">
                <label>コレクション名 *</label>
                <input
                  type="text"
                  className="todo-cal-form-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="todo-cal-form-group">
                <label>説明 (任意)</label>
                <textarea
                  className="todo-cal-form-textarea"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="todo-cal-form-group">
                <label>タグ (カンマまたはスペース区切り)</label>
                <input
                  type="text"
                  className="todo-cal-form-input"
                  placeholder="例: 仕事, 開発, プロジェクト"
                  value={editTagsInput}
                  onChange={(e) => setEditTagsInput(e.target.value)}
                />
                {allTags.length > 0 && (
                  <div className="form-suggested-tags">
                    <span className="suggested-label">候補:</span>
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="suggested-tag-btn"
                        onClick={() => {
                          const currentTags = normalizeTags(editTagsInput);
                          if (!currentTags.includes(tag)) {
                            setEditTagsInput([...currentTags, tag].join(', '));
                          }
                        }}
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="todo-cal-modal-actions">
                <button
                  type="button"
                  className="nav-btn secondary-btn"
                  onClick={() => setEditingCollection(null)}
                >
                  キャンセル
                </button>
                <button type="submit" className="nav-btn primary-btn">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Collections List / Empty State */}
      {filteredCollections.length === 0 ? (
        <div className="empty-state">
          <Folder size={48} className="empty-icon" />
          <h3>コレクションが見つかりません</h3>
          {searchTerm || activeTagFilter ? (
            <p>
              フィルター条件に一致するコレクションがありません。
              <button
                className="clear-filter-link"
                onClick={() => {
                  setSearchTerm('');
                  handleTagFilterChange(null);
                }}
              >
                フィルターを解除
              </button>
            </p>
          ) : (
            <p>「新規コレクション」ボタンから作成してタスクの管理をスタートしましょう。</p>
          )}
        </div>
      ) : isGrouped ? (
        /* Grouped Sections View */
        <div className="collections-grouped-container">
          {groupedCollections.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.key]);
            return (
              <section key={group.key} className="collection-group-section">
                <div
                  className="collection-group-header"
                  onClick={() => handleToggleGroupCollapse(group.key)}
                >
                  <div className="group-header-left">
                    <span className="group-toggle-icon">
                      {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    </span>
                    <span className="group-tag-icon">
                      {group.isUntagged ? <Folder size={18} /> : <Tag size={16} />}
                    </span>
                    <h2 className="group-title">
                      {group.isUntagged ? '未分類' : `#${group.name}`}
                    </h2>
                    <span className="group-count-badge">
                      {group.items.length}
                    </span>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="collections-grid">
                    {group.items.map((col) => renderCollectionCard(col))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        /* Flat Grid View */
        <div className="collections-grid">
          {filteredCollections.map((col) => renderCollectionCard(col))}
        </div>
      )}
    </div>
  );
};
