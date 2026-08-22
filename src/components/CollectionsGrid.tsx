import React, { useState } from 'react';
import { Folder, Plus, Search, Trash2, FileText } from 'lucide-react';
import { CollectionData } from '../types';

interface CollectionsGridProps {
  collections: CollectionData[];
  onSelectCollection: (collection: CollectionData) => void;
  onCreateCollection: (title: string, description: string) => Promise<void>;
  onDeleteCollection: (collectionId: string) => Promise<void>;
}

export const CollectionsGrid: React.FC<CollectionsGridProps> = ({
  collections,
  onSelectCollection,
  onCreateCollection,
  onDeleteCollection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const filteredCollections = collections.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await onCreateCollection(newTitle, newDesc);
    setNewTitle('');
    setNewDesc('');
    setIsCreating(false);
  };

  return (
    <div className="collections-dashboard">
      <div className="dashboard-subhead">
        <div className="search-bar-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="コレクションを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="nav-btn primary-btn" onClick={() => setIsCreating(true)}>
          <Plus size={16} />
          <span>新規コレクション</span>
        </button>
      </div>

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

      {filteredCollections.length === 0 ? (
        <div className="empty-state">
          <Folder size={48} className="empty-icon" />
          <h3>コレクションがありません</h3>
          <p>「新規コレクション」ボタンから作成してタスクの管理をスタートしましょう。</p>
        </div>
      ) : (
        <div className="collections-grid">
          {filteredCollections.map((col) => (
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
              </div>

              <div className="card-footer">
                <span className="card-date">
                  {new Date(col.createdAt).toLocaleDateString('ja-JP')}
                </span>
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
          ))}
        </div>
      )}
    </div>
  );
};
