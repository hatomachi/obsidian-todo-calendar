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

## AIエージェント直接ファイル操作規約 (Vault Direct Markdown Edit)

AIエージェントがプラグインを介さずにVault内のTODOデータを直接編集・追加・完了するための仕様・ルールは、以下にまとめられています。

- [AGENTS_TODO_CALENDAR.md](file:///Users/s-ikari/work/obsidian-todo-calendar/AGENTS_TODO_CALENDAR.md)
- Vault側配置場所: `<Vault Root>/_todo-calendar/AGENTS.md`

