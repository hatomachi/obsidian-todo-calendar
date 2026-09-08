import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppView } from '../components/AppView';
import { IStorageAdapter } from '../adapters/IStorageAdapter';
import { LocalStorageAdapter } from '../adapters/LocalStorageAdapter';
import { GitHubStorageAdapter, GitHubConfig } from '../adapters/GitHubStorageAdapter';
import { GitLabStorageAdapter, GitLabConfig } from '../adapters/GitLabStorageAdapter';
import { SyncManager } from '../sync/SyncManager';
import { SyncState } from '../sync/types';
import { SyncIndicator } from './SyncIndicator';
import { SettingsModal, WebStorageMode } from './SettingsModal';
import { Settings, RefreshCw, Smartphone, Cloud } from 'lucide-react';
import '../styles.css';
import './web.css';

const GITHUB_CONFIG_STORAGE_KEY = 'todo_cal_github_config';
const GITLAB_CONFIG_STORAGE_KEY = 'todo_cal_gitlab_config';
const MODE_STORAGE_KEY = 'todo_cal_active_mode';

const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  owner: '',
  repo: '',
  branch: 'main',
  token: '',
};

const DEFAULT_GITLAB_CONFIG: GitLabConfig = {
  baseUrl: '',
  projectId: '',
  branch: 'main',
  token: '',
};

export const WebApp: React.FC = () => {
  const [githubConfig, setGithubConfig] = useState<GitHubConfig>(() => {
    const raw = localStorage.getItem(GITHUB_CONFIG_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return DEFAULT_GITHUB_CONFIG;
      }
    }
    return DEFAULT_GITHUB_CONFIG;
  });

  const [gitlabConfig, setGitlabConfig] = useState<GitLabConfig>(() => {
    const raw = localStorage.getItem(GITLAB_CONFIG_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return DEFAULT_GITLAB_CONFIG;
      }
    }
    return DEFAULT_GITLAB_CONFIG;
  });

  const [activeMode, setActiveMode] = useState<WebStorageMode>(() => {
    const mode = localStorage.getItem(MODE_STORAGE_KEY);
    if (mode === 'gitlab') return 'gitlab';
    if (mode === 'github') return 'github';
    return 'local';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [key, setKey] = useState(0); // For forcing re-render/reload of AppView

  // Sync state managed by SyncManager
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'synced',
    pendingCount: 0,
    lastSyncedAt: null,
  });

  // Initialize local-first sync manager
  const syncManager = useMemo<SyncManager>(() => {
    let rawRemote: IStorageAdapter;
    let storageKey = 'local_mock';

    if (activeMode === 'gitlab' && gitlabConfig.baseUrl && gitlabConfig.projectId && gitlabConfig.token) {
      rawRemote = new GitLabStorageAdapter(gitlabConfig);
      storageKey = `gitlab_${gitlabConfig.projectId}_${gitlabConfig.branch || 'main'}`;
    } else if (activeMode === 'github' && githubConfig.token && githubConfig.owner && githubConfig.repo) {
      rawRemote = new GitHubStorageAdapter(githubConfig);
      storageKey = `github_${githubConfig.owner}_${githubConfig.repo}_${githubConfig.branch || 'main'}`;
    } else {
      rawRemote = new LocalStorageAdapter();
    }

    return new SyncManager(rawRemote, storageKey);
  }, [activeMode, githubConfig, gitlabConfig, key]);

  // Subscribe to sync state changes & lifecycle
  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state) => {
      setSyncState(state);
    });
    return () => {
      unsubscribe();
      syncManager.dispose();
    };
  }, [syncManager]);

  const handleManualSync = useCallback(() => {
    syncManager.syncNow();
  }, [syncManager]);

  const handleSaveConfig = useCallback(
    (newGithubConfig: GitHubConfig, newGitlabConfig: GitLabConfig, newMode: WebStorageMode) => {
      setGithubConfig(newGithubConfig);
      setGitlabConfig(newGitlabConfig);
      setActiveMode(newMode);
      localStorage.setItem(GITHUB_CONFIG_STORAGE_KEY, JSON.stringify(newGithubConfig));
      localStorage.setItem(GITLAB_CONFIG_STORAGE_KEY, JSON.stringify(newGitlabConfig));
      localStorage.setItem(MODE_STORAGE_KEY, newMode);
      setKey((prev) => prev + 1);
    },
    []
  );

  const handleRefresh = useCallback(() => {
    syncManager.pullRemote().then(() => {
      setKey((prev) => prev + 1);
    });
  }, [syncManager]);

  const isConfigured =
    activeMode === 'gitlab'
      ? Boolean(gitlabConfig.baseUrl && gitlabConfig.projectId && gitlabConfig.token)
      : activeMode === 'github'
      ? Boolean(githubConfig.token && githubConfig.owner && githubConfig.repo)
      : true;

  const isStaging =
    (activeMode === 'github' &&
      (githubConfig.repo.toLowerCase().includes('staging') || githubConfig.repo.toLowerCase().includes('stg'))) ||
    (activeMode === 'gitlab' &&
      (gitlabConfig.projectId.toLowerCase().includes('staging') || gitlabConfig.projectId.toLowerCase().includes('stg'))) ||
    (typeof window !== 'undefined' &&
      (window.location.hostname.includes('staging') || window.location.hostname.includes('stg')));

  return (
    <div className="todo-calendar-web-root">
      {/* Mobile-friendly Top Navigation */}
      <header className="todo-cal-web-header">
        <div className="todo-cal-web-header-left">
          <h1 className="todo-cal-web-title">TODO Calendar</h1>
          <button
            className="todo-cal-web-mode-badge"
            onClick={() => setIsSettingsOpen(true)}
            title="クリックして設定を開く"
            style={
              isStaging
                ? {
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid #f59e0b',
                    color: '#f59e0b',
                  }
                : activeMode === 'gitlab' && isConfigured
                ? {
                    background: 'rgba(252, 109, 38, 0.15)',
                    border: '1px solid #fc6d26',
                    color: '#fc6d26',
                  }
                : undefined
            }
          >
            {activeMode === 'gitlab' && isConfigured ? (
              <>
                <span style={{ fontSize: '12px' }}>🦊</span>
                <span>{isStaging ? '🧪 Staging' : 'GitLab'} ({gitlabConfig.projectId})</span>
              </>
            ) : activeMode === 'github' && isConfigured ? (
              <>
                <Cloud size={14} color={isStaging ? '#f59e0b' : '#10b981'} />
                <span>{isStaging ? '🧪 Staging' : 'GitHub'} ({githubConfig.repo})</span>
              </>
            ) : (
              <>
                <Smartphone size={14} color="#a855f7" />
                <span>Local モック</span>
              </>
            )}
          </button>
        </div>

        <div className="todo-cal-web-header-actions">
          <SyncIndicator
            state={syncState}
            onSync={handleManualSync}
            disabled={syncState.status === 'syncing'}
          />
          <button
            className="todo-cal-web-icon-btn"
            onClick={handleRefresh}
            title="最新データを取得（リフレッシュ）"
          >
            <RefreshCw size={18} />
          </button>
          <button
            className="todo-cal-web-icon-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="同期設定"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="todo-cal-web-content">
        <AppView
          key={key}
          storageAdapter={syncManager}
          initialViewMode="agenda"
        />
      </main>

      {/* Sync / Token Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        githubConfig={githubConfig}
        gitlabConfig={gitlabConfig}
        onSaveConfig={handleSaveConfig}
        activeMode={activeMode}
      />
    </div>
  );
};
