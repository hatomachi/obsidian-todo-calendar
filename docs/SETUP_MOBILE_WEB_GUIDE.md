# Cloudflare Pages × GitHub API モバイル Web (PWA) 連携・デプロイ完全ガイド

Obsidian 等のローカルデータを、**完全無料・サーバーレス・セキュア** にスマホ（iOS / Android）から閲覧・編集できるようにするためのアーキテクチャおよび再現手順書です。
今後の別アプリ開発や、再セットアップ時にこの手順をそのまま辿ることで再現できます。

---

## 🏗️ 全体アーキテクチャ

```mermaid
flowchart LR
    subgraph Client["📱 スマホ / PC ブラウザ"]
        PWA["PWA / Web App<br>(React + Vite)"]
        LocalStore["端末内 localStorage<br>(GitHub PAT & 設定)"]
        PWA <--> LocalStore
    end

    subgraph Hosting["☁️ Cloudflare Pages / Workers"]
        StaticAsset["静的アセット配信<br>(HTML / JS / CSS)"]
    end

    subgraph GitHub["🐙 GitHub (Backend)"]
        AppRepo["アプリコード リポジトリ<br>(公開 / プライベート)"]
        DataRepo["データ管理 リポジトリ<br>(Private Vault)"]
    end

    Hosting -->|1. アプリ本体を配信| PWA
    AppRepo -->|Git 連携 自動ビルド| Hosting
    PWA -->|2. HTTPS 直接通信 (Octokit)<br>Contents API / Git Trees API| DataRepo
```

### ✨ このアーキテクチャのメリット
1. **完全無料**: Cloudflare Pages / Workers Assets も GitHub API も無料枠内で余裕で収まる。
2. **バックエンドサーバー不要**: バックエンド API サーバーの構築・保守・監視が一切不要。
3. **高セキュリティ**:
   - Cloudflare 側にはデータやトークンが一切保存されない（静的配信のみ）。
   - GitHub Token はユーザー端末の `localStorage` にのみ保存され、スマホ ⇄ GitHub 間で直接暗号化通信。
4. **PC ⇄ モバイル双方向同期**: PC（Obsidian）側も Git プラグイン等で同一リポジトリを push/pull するだけで完全に同期。

---

## 📋 事前準備・必要なもの

- **GitHub アカウント**
- **Cloudflare アカウント**（無料プラン）
- **ローカルのデータ**（Obsidian Vault や JSON/Markdown 等の管理対象フォルダ）

---

## 🚀 ステップ 1: アプリ本体リポジトリ側の設定

### 1.1 Vite ビルドスクリプトの用意 (`package.json`)
```json
{
  "scripts": {
    "dev:web": "vite",
    "build:web": "vite build",
    "preview:web": "vite preview"
  }
}
```

### 1.2 Cloudflare Workers/Pages 共通設定ファイル (`wrangler.json`)
プロジェクトルートに `wrangler.json` を配置します。
これがあると Cloudflare の Workers CI / Pages CI のどちらの画面からでも確実にデプロイできます。

```json
{
  "name": "<アプリ名>",
  "compatibility_date": "2024-09-23",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

### 1.3 モバイル PWA 用のメタタグ設定 (`index.html`)
iOS のノッチや下部ホームバーに対応し、全画面アプリとして起動できるようにします。

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#1e1e2e" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="アプリ表示名" />
    <title>アプリタイトル</title>
    <link rel="manifest" href="/manifest.webmanifest" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/web/index.tsx"></script>
  </body>
</html>
```

### 1.4 Web App Manifest (`manifest.webmanifest`)
```json
{
  "name": "TODO Calendar",
  "short_name": "TODO Cal",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1e1e2e",
  "theme_color": "#1e1e2e",
  "icons": [
    {
      "src": "data:image/svg+xml,...",
      "sizes": "192x192 512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

---

## 🗄️ ステップ 2: データリポジトリ (Private Vault) の作成 & プッシュ

### 2.1 ローカルの Vault に `.gitignore` を配置
Obsidian の一時ファイルやキャッシュを除外します。

```gitignore
# Obsidian workspace & caches
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/cache/
.trash/

# OS metadata
.DS_Store
Thumbs.db
```

### 2.2 GitHub で Private リポジトリを作成
1. [GitHub - Create a new repository](https://github.com/new) を開く。
2. **Repository name**: 例 `my-todo-repo` や `my-vault`。
3. **Private** を選択（README 追加チェックは外す）。
4. 「Create repository」をクリック。

### 2.3 ローカルデータを初回コミット＆プッシュ
```bash
cd /path/to/your-vault
git init
git branch -M main
git add .
git commit -m "initial commit: vault data"
git remote add origin https://github.com/<GitHubユーザー名>/<リポジトリ名>.git
git push -u origin main
```

---

## 🔑 ステップ 3: GitHub トークン (Fine-grained PAT) の発行

スマホの Web アプリが Private リポジトリを読み書きするためのアクセスキーを作成します。

1. GitHub の [Personal Access Tokens (Fine-grained Tokens)](https://github.com/settings/tokens?type=beta) を開く。
2. **「Generate new token」** をクリック。
3. 設定項目：
   - **Token name**: `todo-calendar-mobile`（任意・わかりやすい名前）
   - **Expiration**: 90日〜1年（必要に応じて設定）
   - **Repository access**: **「Only select repositories」** を選び、ステップ 2 で作成した **Private リポジトリのみを選択**
   - **Permissions** → **「Repository permissions」**:
     - `Contents`: **Access: Read and write** を選択
4. **「Generate token」** をクリックし、表示されたトークン（`github_pat_...`）をコピー。

---

## ☁️ ステップ 4: Cloudflare Pages / Workers へのデプロイ

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com/) にログイン。
2. 左メニューの **「Workers & Pages」** → **「Create application」** をクリック。
3. **「Pages」**（または Workers）タブ → **「Connect to Git」** を選択。
4. アプリ本体の GitHub リポジトリ（例: `obsidian-todo-calendar`）を選択。
5. ビルド設定を入力：
   - **Project name**: `obsidian-todo-calendar`（任意）
   - **Production branch**: `main`
   - **Framework preset**: `Vite` (または None)
   - **Build command**: `npm run build:web`
   - **Deploy command**: `npx wrangler deploy`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
6. **「Save and Deploy」** (または **「Deploy」**) をクリック。

> 💡 **ポイント**:
> 一度設定すれば、以降はアプリ本体リポジトリの `main` ブランチに `git push` するたびに Cloudflare が自動ビルド・デプロイしてくれます。

---

## 📱 ステップ 5: スマホでの初期接続 & PWA 化

1. Cloudflare で発行された URL（`https://<project-name>.pages.dev`）をスマホブラウザ（iOS Safari / Android Chrome）で開く。
2. 右上の **⚙️（設定）** アイコンをタップ。
3. **「GitHub API 同期」** を選択し、以下を入力：
   - **GitHub Personal Access Token**: ステップ 3 で発行したトークン（`github_pat_...`）
   - **Owner**: ご自身の GitHub ユーザー名（例: `hatomachi`）
   - **Repo**: ステップ 2 で作成した Private リポジトリ名（例: `my-todo-repo`）
   - **Branch**: `main`
4. **「🔌 接続テスト」** を押し、「接続に成功しました」と出たら **「保存して適用」** をタップ。
5. **ホーム画面に追加 (PWA 化)**:
   - **iOS Safari**: 画面下部の「共有（四角に上矢印）」ボタン → **「ホーム画面に追加」**
   - **Android Chrome**: 右上メニュー「︙」 → **「アプリをインストール」** または **「ホーム画面に追加」**

> ⚠️ **iOS Safari の重要ポイント**:
> iOS では、Safari ブラウザと「ホーム画面に追加した PWA アプリ」で `localStorage` の保存領域が独立しています。
> ホーム画面に追加したアイコンから初回起動した際、再度 ⚙️ 設定画面で「保存して適用」を行っておくと、以降はその PWA 内でずっと永続保存されます。

---

## 🔒 ステップ 6: (オプション) Cloudflare Access で URL 自体を保護

「URL を知っている第三者にも Web 画面すら開かせたくない」場合、Cloudflare の無料機能（最大50ユーザー無料）で二重ロックが可能です。

1. Cloudflare ダッシュボードで対象プロジェクトを開く。
2. **「Settings」** → **「Cloudflare Access」**（または左メニューの Zero Trust）を開く。
3. ログイン認証ポリシーを作成：
   - 認証方式: **One-time PIN**（メールに届く6桁認証コード）
   - 許可ルール: 自分のメールアドレス（例: `your-email@example.com`）のみ許可
4. これにより、ページを開く際にメールでのワンタイム認証が必須になります。

---

## 🔄 他アプリ開発時のクイックチェックリスト

- [ ] `wrangler.json` をプロジェクト直下に置いたか？（`assets.directory = "./dist"`）
- [ ] `index.html` に `viewport-fit=cover` と `apple-mobile-web-app-capable` を入れたか？
- [ ] `package.json` に `"build:web": "vite build"` があるか？
- [ ] データ用 Private リポジトリに `.gitignore` を設定したか？
- [ ] GitHub PAT の権限は `Contents: Read and write` か？
- [ ] Cloudflare のビルドコマンドは `npm run build:web`、出力先は `dist` か？
