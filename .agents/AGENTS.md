# Project Rules (Obsidian TODO Calendar)

## プラグインビルド＆検証の自動連携ルール

ユーザーがプラグイン動作を検証できるよう、コード変更後およびビルド（`npm run build`等）を行った際は、必ずビルド成果物を以下のテスト用Vaultのプラグインフォルダにコピーしてください。

### コピー先ディレクトリ
`/Users/s-ikari/work/playground/test-vault/.obsidian/plugins/obsidian-todo-calendar`

### コピー対象ファイル
- `main.js`
- `manifest.json`
- `styles.css`

### 補足
- ビルド実行時（`npm run build`）に上記のコピー作業まで完了させること。

## GitHubプッシュ＆Release自動更新ルール（重要）

ユーザーから「pushして」と指示された際やリリースを行う際は、GitHub ActionsによるGitHub Releasesの自動ビルド・配布アセット作成（`push.tags: ["*"]`）が確実に実行されるよう、以下のステップを漏れなく実行してください。

### 実行手順
1. **バージョン番号の確認・更新**:
   - `manifest.json` の `"version"`
   - `package.json` の `"version"`
   - 修正内容に応じて適切にインクリメント（例: `1.0.1` や `1.1.0`）する。
2. **ビルドの実行**:
   - `npm run build` を実行し、成果物（`main.js`, `manifest.json`, `styles.css` 等）を最新化する。
3. **コミットの作成**:
   - `git add .` -> `git commit -m "chore(release): bump version to <version>"`
4. **Gitタグの作成**:
   - `git tag <version>` （例: `git tag 1.1.0`）
5. **プッシュの実行**:
   - `git push origin main`
   - `git push origin <version>` （または `git push origin main --tags`）

※ タグがプッシュされることで、GitHub Actions (`.github/workflows/release.yml`) がトリガーされ、GitHub Releasesに必須ファイル（`main.js`, `manifest.json`, `styles.css`, zipアーカイブ）が自動公開されます。

## モバイル環境の設計思想・アーキテクチャ (Cloudflare Pages × PWA)

このプラグインにおける**モバイル（スマートフォン・タブレット）利用は、Obsidianモバイルアプリではなく、Cloudflare Pages にデプロイされた PWA (Web版) ＋ GitHub API 直接連携**を前提としています。

- **PC環境**: Obsidian デスクトッププラグイン（ローカル Vault を直接読み書き）
- **モバイル環境**: **Cloudflare Pages (PWA)**
  - `main` ブランチに push されると、Cloudflare Pages 側で `npm run build:web` が自動実行され、最新の Web アプリ（PWA）が即座にデプロイされます。
  - スマホの Safari/Chrome でホーム画面に追加（PWA化）して使用します。
  - データは `GitHubStorageAdapter` を介してプライベートリポジトリと直接通信・同期されます。
- **ドキュメント参照**:
  - [SETUP_MOBILE_WEB_GUIDE.md](file:///Users/s-ikari/work/obsidian-todo-calendar/docs/SETUP_MOBILE_WEB_GUIDE.md)
  - [SETUP_STAGING_ENVIRONMENT_GUIDE.md](file:///Users/s-ikari/work/obsidian-todo-calendar/docs/SETUP_STAGING_ENVIRONMENT_GUIDE.md)

## AIエージェント直接ファイル操作規約 (Vault Direct Markdown Edit)

AIエージェントがプラグインを介さずにVault内のTODOデータを直接編集・追加・完了するための仕様・ルールは、以下にまとめられています。

- [AGENTS_TODO_CALENDAR.md](file:///Users/s-ikari/work/obsidian-todo-calendar/AGENTS_TODO_CALENDAR.md)
- Vault側配置場所: `<Vault Root>/_todo-calendar/AGENTS.md`

