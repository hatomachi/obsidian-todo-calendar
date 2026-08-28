#!/usr/bin/env bash
# ==============================================================================
# sync-vault-staging.sh
# 本番Vault（ローカルまたは本番リモート）の最新データをステージングリポジトリへ
# 片方向ミラー（force-push）するスクリプトです。
#
# 使用方法:
#   ./scripts/sync-vault-staging.sh /path/to/your-vault <staging-git-url>
#   または
#   cd /path/to/your-vault && git push staging main --force
# ==============================================================================

set -euo pipefail

VAULT_DIR="${1:-}"
STAGING_REMOTE_URL="${2:-}"

if [ -z "$VAULT_DIR" ] || [ -z "$STAGING_REMOTE_URL" ]; then
  echo "使用方法: $0 <Vaultディレクトリの絶対パス> <ステージングリポジトリのGit URL>"
  echo "例: $0 /Users/s-ikari/work/playground/test-vault git@github.com:hatomachi/my-todo-vault-staging.git"
  exit 1
fi

if [ ! -d "$VAULT_DIR/.git" ]; then
  echo "エラー: 指定されたディレクトリ ($VAULT_DIR) は Git リポジトリではありません。"
  exit 1
fi

echo "🚀 本番 Vault ($VAULT_DIR) からステージングリポジトリへミラー同期を開始します..."

cd "$VAULT_DIR"

# 'staging' リモートが存在しない場合は追加、存在する場合はURLを更新
if git remote | grep -q "^staging$"; then
  git remote set-url staging "$STAGING_REMOTE_URL"
else
  git remote add staging "$STAGING_REMOTE_URL"
fi

echo "📦 ステージングへ force-push しています..."
git push staging main:main --force

echo "✅ ステージング環境へのデータ同期が完了しました！"
