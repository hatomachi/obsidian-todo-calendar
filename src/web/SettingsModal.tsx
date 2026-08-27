import React, { useState } from 'react';
import { GitHubConfig } from '../adapters/GitHubStorageAdapter';
import { Octokit } from '@octokit/rest';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GitHubConfig;
  onSaveConfig: (config: GitHubConfig, mode: 'github' | 'local') => void;
  activeMode: 'github' | 'local';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  activeMode,
}) => {
  const [mode, setMode] = useState<'github' | 'local'>(activeMode);
  const [owner, setOwner] = useState(config.owner || '');
  const [repo, setRepo] = useState(config.repo || '');
  const [branch, setBranch] = useState(config.branch || 'main');
  const [token, setToken] = useState(config.token || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!token || !owner || !repo) {
      setTestResult({ success: false, message: 'Owner, Repo, Token をすべて入力してください。' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.rest.repos.get({
        owner: owner.trim(),
        repo: repo.trim(),
      });
      setTestResult({
        success: true,
        message: `接続成功: ${data.full_name} (${data.private ? 'Private' : 'Public'})`,
      });
    } catch (e: any) {
      console.error('Test connection error:', e);
      setTestResult({
        success: false,
        message: `接続失敗: ${e.message || '認証エラーまたはリポジトリが見つかりません'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig(
      {
        owner: owner.trim(),
        repo: repo.trim(),
        branch: branch.trim() || 'main',
        token: token.trim(),
      },
      mode
    );
    onClose();
  };

  return (
    <div className="todo-cal-modal-overlay" onClick={onClose}>
      <div className="todo-cal-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>⚙️ モバイル同期設定</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: 'var(--text-muted, #888)',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            ストレージモード
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setMode('github')}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--interactive-accent, #7c3aed)',
                background: mode === 'github' ? 'var(--interactive-accent, #7c3aed)' : 'transparent',
                color: mode === 'github' ? '#fff' : 'inherit',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              ☁️ GitHub API 同期 (個人Vault)
            </button>
            <button
              type="button"
              onClick={() => setMode('local')}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--background-modifier-border, #444)',
                background: mode === 'local' ? 'var(--interactive-accent, #7c3aed)' : 'transparent',
                color: mode === 'local' ? '#fff' : 'inherit',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              📱 ローカルモック (お試し)
            </button>
          </div>
        </div>

        {mode === 'github' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                GitHub Personal Access Token (PAT)
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="github_pat_... または ghp_..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--background-modifier-border, #444)',
                  background: 'var(--background-secondary, #222)',
                  color: 'inherit',
                  fontSize: '0.85rem',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #888)' }}>
                ※ Fine-grained PAT で当該Vaultリポジトリの「Contents: Read and write」権限を推奨。
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                  リポジトリ所有者 (Owner)
                </label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="ユーザー名 or 組織名"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--background-modifier-border, #444)',
                    background: 'var(--background-secondary, #222)',
                    color: 'inherit',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                  リポジトリ名 (Repo)
                </label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="obsidian-vault"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--background-modifier-border, #444)',
                    background: 'var(--background-secondary, #222)',
                    color: 'inherit',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                ブランチ名 (Branch)
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--background-modifier-border, #444)',
                  background: 'var(--background-secondary, #222)',
                  color: 'inherit',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.4rem' }}>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid var(--background-modifier-border, #444)',
                  background: 'var(--background-secondary, #333)',
                  color: 'inherit',
                  cursor: isTesting ? 'wait' : 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                {isTesting ? '接続テスト中...' : '🔌 接続テスト'}
              </button>
              {testResult && (
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: testResult.success ? '#10b981' : '#ef4444',
                  }}
                >
                  {testResult.message}
                </span>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid var(--background-modifier-border, #444)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '0.5rem 1.2rem',
              borderRadius: '6px',
              border: 'none',
              background: 'var(--interactive-accent, #7c3aed)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            保存して適用
          </button>
        </div>
      </div>
    </div>
  );
};
