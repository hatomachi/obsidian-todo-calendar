import React, { useState } from 'react';
import { GitHubConfig } from '../adapters/GitHubStorageAdapter';
import { GitLabConfig, testGitLabConnection } from '../adapters/GitLabStorageAdapter';
import { Octokit } from '@octokit/rest';

export type WebStorageMode = 'github' | 'gitlab' | 'local';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  githubConfig: GitHubConfig;
  gitlabConfig: GitLabConfig;
  username?: string;
  onSaveConfig: (
    githubConfig: GitHubConfig,
    gitlabConfig: GitLabConfig,
    mode: WebStorageMode,
    username: string
  ) => void;
  activeMode: WebStorageMode;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  githubConfig,
  gitlabConfig,
  username = '',
  onSaveConfig,
  activeMode,
}) => {
  const [mode, setMode] = useState<WebStorageMode>(activeMode);
  const [userName, setUserName] = useState(username);

  // GitHub state
  const [ghOwner, setGhOwner] = useState(githubConfig.owner || '');
  const [ghRepo, setGhRepo] = useState(githubConfig.repo || '');
  const [ghBranch, setGhBranch] = useState(githubConfig.branch || 'main');
  const [ghToken, setGhToken] = useState(githubConfig.token || '');

  // GitLab state
  const [glBaseUrl, setGlBaseUrl] = useState(gitlabConfig.baseUrl || '');
  const [glProjectId, setGlProjectId] = useState(gitlabConfig.projectId || '');
  const [glBranch, setGlBranch] = useState(gitlabConfig.branch || 'main');
  const [glToken, setGlToken] = useState(gitlabConfig.token || '');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestGitHub = async () => {
    if (!ghToken || !ghOwner || !ghRepo) {
      setTestResult({ success: false, message: 'Owner, Repo, Token をすべて入力してください。' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const octokit = new Octokit({ auth: ghToken });
      const { data } = await octokit.rest.repos.get({
        owner: ghOwner.trim(),
        repo: ghRepo.trim(),
      });
      setTestResult({
        success: true,
        message: `接続成功: ${data.full_name} (${data.private ? 'Private' : 'Public'})`,
      });
    } catch (e: any) {
      console.error('Test GitHub connection error:', e);
      setTestResult({
        success: false,
        message: `接続失敗: ${e.message || '認証エラーまたはリポジトリが見つかりません'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestGitLab = async () => {
    if (!glBaseUrl || !glProjectId || !glToken) {
      setTestResult({ success: false, message: 'GitLab URL, Project ID, Token をすべて入力してください。' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testGitLabConnection({
        baseUrl: glBaseUrl.trim(),
        projectId: glProjectId.trim(),
        branch: glBranch.trim() || 'main',
        token: glToken.trim(),
      });
      setTestResult(res);
    } catch (e: any) {
      console.error('Test GitLab connection error:', e);
      setTestResult({
        success: false,
        message: `接続失敗: ${e.message || '通信エラーが発生しました'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig(
      {
        owner: ghOwner.trim(),
        repo: ghRepo.trim(),
        branch: ghBranch.trim() || 'main',
        token: ghToken.trim(),
      },
      {
        baseUrl: glBaseUrl.trim(),
        projectId: glProjectId.trim(),
        branch: glBranch.trim() || 'main',
        token: glToken.trim(),
      },
      mode,
      userName.trim()
    );
    onClose();
  };

  return (
    <div className="todo-cal-modal-overlay" onClick={onClose}>
      <div className="todo-cal-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
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

        {/* Username input */}
        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
            👤 ユーザー名 / 担当者名
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="例: s-ikari"
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
            チーム共有時にアイテムの担当者として割り当てる識別子です（新規アイテム作成時に自動セット）。
          </span>
        </div>

        {/* Mode selection buttons */}
        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            ストレージモード
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => {
                setMode('github');
                setTestResult(null);
              }}
              style={{
                padding: '0.5rem 0.3rem',
                borderRadius: '6px',
                border: '1px solid ' + (mode === 'github' ? 'var(--interactive-accent, #7c3aed)' : 'var(--background-modifier-border, #444)'),
                background: mode === 'github' ? 'var(--interactive-accent, #7c3aed)' : 'transparent',
                color: mode === 'github' ? '#fff' : 'inherit',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
                textAlign: 'center',
              }}
            >
              ☁️ GitHub
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('gitlab');
                setTestResult(null);
              }}
              style={{
                padding: '0.5rem 0.3rem',
                borderRadius: '6px',
                border: '1px solid ' + (mode === 'gitlab' ? '#fc6d26' : 'var(--background-modifier-border, #444)'),
                background: mode === 'gitlab' ? '#fc6d26' : 'transparent',
                color: mode === 'gitlab' ? '#fff' : 'inherit',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
                textAlign: 'center',
              }}
            >
              🦊 GitLab (社内)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('local');
                setTestResult(null);
              }}
              style={{
                padding: '0.5rem 0.3rem',
                borderRadius: '6px',
                border: '1px solid ' + (mode === 'local' ? 'var(--interactive-accent, #7c3aed)' : 'var(--background-modifier-border, #444)'),
                background: mode === 'local' ? 'var(--interactive-accent, #7c3aed)' : 'transparent',
                color: mode === 'local' ? '#fff' : 'inherit',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
                textAlign: 'center',
              }}
            >
              📱 Local モック
            </button>
          </div>
        </div>

        {/* GitLab Mode Config */}
        {mode === 'gitlab' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                GitLab API URL (自由入力)
              </label>
              <input
                type="text"
                value={glBaseUrl}
                onChange={(e) => setGlBaseUrl(e.target.value)}
                placeholder="https://<alb>/todo-calendar/api または https://gitlab.internal.corp"
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
                ※ ALB等のプロキシパス、またはGitLab直接URL。末尾の <code>/api/v4</code> の有無は自動判別されます。
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                  Project ID または Path
                </label>
                <input
                  type="text"
                  value={glProjectId}
                  onChange={(e) => setGlProjectId(e.target.value)}
                  placeholder="123 または group/my-todo-vault"
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
                  ブランチ名 (Branch)
                </label>
                <input
                  type="text"
                  value={glBranch}
                  onChange={(e) => setGlBranch(e.target.value)}
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
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                GitLab Personal Access Token (PAT)
              </label>
              <input
                type="password"
                value={glToken}
                onChange={(e) => setGlToken(e.target.value)}
                placeholder="glpat-..."
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
                ※ スコープ <code>api</code> または <code>read_repository</code> / <code>write_repository</code> を推奨。
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.4rem' }}>
              <button
                type="button"
                onClick={handleTestGitLab}
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

        {/* GitHub Mode Config */}
        {mode === 'github' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                GitHub Personal Access Token (PAT)
              </label>
              <input
                type="password"
                value={ghToken}
                onChange={(e) => setGhToken(e.target.value)}
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
                  value={ghOwner}
                  onChange={(e) => setGhOwner(e.target.value)}
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
                  value={ghRepo}
                  onChange={(e) => setGhRepo(e.target.value)}
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
                value={ghBranch}
                onChange={(e) => setGhBranch(e.target.value)}
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
                onClick={handleTestGitHub}
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

        {/* Local Mock Mode Note */}
        {mode === 'local' && (
          <div style={{ padding: '0.8rem', background: 'var(--background-secondary, #222)', borderRadius: '6px', fontSize: '0.85rem' }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              端末の <code>localStorage</code> にのみデータを保存するモックモードです。
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted, #888)', fontSize: '0.8rem' }}>
              外部サーバーとの通信は一切行わず、オフラインでお試し操作が可能です。
            </p>
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
              background: mode === 'gitlab' ? '#fc6d26' : 'var(--interactive-accent, #7c3aed)',
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
