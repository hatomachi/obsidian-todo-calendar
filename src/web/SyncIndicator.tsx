import React from 'react';
import { SyncState } from '../sync/types';
import { Check, RefreshCw, AlertCircle, UploadCloud } from 'lucide-react';

interface SyncIndicatorProps {
  state: SyncState;
  onSync: () => void;
  disabled?: boolean;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ state, onSync, disabled }) => {
  const { status, pendingCount, errorMessage } = state;

  if (status === 'syncing') {
    return (
      <div
        className="todo-cal-sync-indicator status-syncing"
        title="リモートと同期中..."
        role="status"
        aria-live="polite"
      >
        <RefreshCw size={14} className="todo-cal-spin-icon" />
        <span className="todo-cal-sync-label">同期中...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <button
        type="button"
        className="todo-cal-sync-indicator status-error"
        onClick={onSync}
        disabled={disabled}
        title={errorMessage ? `同期エラー: ${errorMessage}\nクリックして再試行` : '同期エラーが発生しました。クリックして再試行'}
        aria-label="同期エラー。クリックして再試行"
      >
        <AlertCircle size={14} color="#ef4444" />
        <span className="todo-cal-sync-label error-text">
          エラー {pendingCount > 0 ? `(${pendingCount})` : ''}
        </span>
        <span className="todo-cal-sync-btn-tag">再試行</span>
      </button>
    );
  }

  if (status === 'pending' || pendingCount > 0) {
    return (
      <button
        type="button"
        className="todo-cal-sync-indicator status-pending"
        onClick={onSync}
        disabled={disabled}
        title={`${pendingCount}件の未同期変更があります。\n5秒後に自動送信されますが、クリックして今すぐ同期できます。`}
        aria-label={`${pendingCount}件の未同期変更。クリックして今すぐ同期`}
      >
        <UploadCloud size={14} color="#f59e0b" />
        <span className="todo-cal-sync-label pending-text">未同期 ({pendingCount})</span>
        <span className="todo-cal-sync-btn-tag">今すぐ同期</span>
      </button>
    );
  }

  // Synced state
  return (
    <button
      type="button"
      className="todo-cal-sync-indicator status-synced"
      onClick={onSync}
      disabled={disabled}
      title="同期済みです。\nクリックすると最新のリモートデータを取得します。"
      aria-label="同期済み。クリックして最新取得"
    >
      <Check size={14} color="#10b981" />
      <span className="todo-cal-sync-label synced-text">同期済み</span>
    </button>
  );
};
