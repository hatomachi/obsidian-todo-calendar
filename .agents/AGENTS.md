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
