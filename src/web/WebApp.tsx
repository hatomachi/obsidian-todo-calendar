import React, { useState, useMemo, useCallback } from 'react';
import { AppView } from '../components/AppView';
import { IStorageAdapter } from '../adapters/IStorageAdapter';
import { LocalStorageAdapter } from '../adapters/LocalStorageAdapter';
import { GitHubStorageAdapter, GitHubConfig } from '../adapters/GitHubStorageAdapter';
import { SettingsModal } from './SettingsModal';
import { Settings, RefreshCw, Smartphone, Cloud } from 'lucide-react';
import '../styles.css';
import './web.css';

const CONFIG_STORAGE_KEY = 'todo_cal_github_config';
const MODE_STORAGE_KEY = 'todo_cal_active_mode';

const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  owner: '',
  repo: '',
  branch: 'main',
  token: '',
};

export const WebApp: React.FC = () => {
  const [githubConfig, setGithubConfig] = useState<GitHubConfig>(() => {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return DEFAULT_GITHUB_CONFIG;
      }
    }
    return DEFAULT_GITHUB_CONFIG;
  });

  const [activeMode, setActiveMode] = useState<'github' | 'local'>(() => {
    const mode = localStorage.getItem(MODE_STORAGE_KEY);
    return mode === 'github' ? 'github' : 'local';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [key, setKey] = useState(0); // For forcing re-render/reload of AppView

  // Initialize storage adapter
  const storageAdapter = useMemo<IStorageAdapter>(() => {
    if (activeMode === 'github' && githubConfig.token && githubConfig.owner && githubConfig.repo) {
      return new GitHubStorageAdapter(githubConfig);
    }
    return new LocalStorageAdapter();
  }, [activeMode, githubConfig, key]);

  const handleSaveConfig = useCallback((newConfig: GitHubConfig, newMode: 'github' | 'local') => {
    setGithubConfig(newConfig);
    setActiveMode(newMode);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
    setKey((prev) => prev + 1);
  }, []);

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  const isConfigured = activeMode === 'github' ? Boolean(githubConfig.token && githubConfig.owner && githubConfig.repo) : true;

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
          >
            {activeMode === 'github' && isConfigured ? (
              <>
                <Cloud size={14} color="#10b981" />
                <span>GitHub ({githubConfig.repo})</span>
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
          <button
            className="todo-cal-web-icon-btn"
            onClick={handleRefresh}
            title="リフレッシュ"
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
          storageAdapter={storageAdapter}
          initialViewMode="agenda"
        />
      </main>

      {/* Sync / Token Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={githubConfig}
        onSaveConfig={handleSaveConfig}
        activeMode={activeMode}
      />
    </div>
  );
};
