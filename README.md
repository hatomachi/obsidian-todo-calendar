# Obsidian TODO Calendar

Obsidian用の7日間マトリクスカレンダー＆NotebookLM風コレクション管理プラグイン。
PC版のObsidianプラグインに加え、**スマホブラウザからサクサク動くモバイルWeb（PWA）＆GitHub API直接連携** に対応しています。

---

## 📱 モバイルWeb版 (PWA) の利用方法

スマホのSafariやEdgeなどのブラウザからアクセスし、「ホーム画面に追加」することで、サーバーレスで起動するネイティブライクなTODOアプリとして利用できます。

### 1. ローカル起動 / 開発
```bash
npm run dev:web
```
ブラウザで `http://localhost:3000` を開きます。

### 2. GitHub Private リポジトリ同期の設定
1. 右上の **⚙️ 設定ボタン** をタップします。
2. **「GitHub API 同期」** を選択します。
3. 以下の情報を入力します：
   - **GitHub Personal Access Token (PAT)**: 当該リポジトリの `Contents: Read and write` 権限を持つトークン（Fine-grained PAT 推奨）
   - **Owner**: GitHubのユーザー名または組織名
   - **Repo**: Vaultリポジトリ名（例: `my-obsidian-vault`）
   - **Branch**: `main`
4. **「🔌 接続テスト」** を押し、成功したら **「保存して適用」** をタップします。

### 3. Cloudflare Pages へのデプロイ（おすすめ）
- **Build command**: `npm run build:web`
- **Build output directory**: `dist`
- **Root directory**: `/`
- 完全無料・サーバーレスでどこからでもスマホからアクセス可能になります。

---

## 💻 Obsidian プラグイン（PC）のビルド

```bash
npm run build
```
ビルド成果物（`main.js`, `manifest.json`, `styles.css`）が生成され、テストVaultに自動コピーされます。

---

## 🏗️ アーキテクチャ

- **フロントエンド UI**: React 18 + TypeScript + Lucide Icons (Obsidian & Web 共通)
- **データ層**: `IStorageAdapter` インターフェースによるマルチバックエンド設計
  - `ObsidianStorageAdapter` (PC Obsidian Vault)
  - `GitHubStorageAdapter` (個人スマホ: Git Trees API + Contents API 直接操作)
  - `LocalStorageAdapter` (オフライン・初期体験用モック)
  - *(将来)* `NodeFsRestAdapter` (会社用社内ECS/ALB環境)
