# AI Agent Rules for Obsidian TODO Calendar

このドキュメントは、AIエージェントがObsidianプラグイン（Obsidian TODO Calendar）を介さず、Obsidian Vault 内の Markdown ファイルを直接読み書きしてTODOの検索・作成・更新・完了・削除を行うためのデータ構造仕様および操作ルールです。

---

## 1. ディレクトリ構造 (Directory Structure)

Vault のルート直下にある `_todo-calendar/` ディレクトリ配下でデータを管理します。

```text
<Vault Root>/
└── _todo-calendar/
    ├── collections/
    │   ├── 1724300000000_a1b2c.md
    │   └── 1724300005000_d3e4f.md
    └── items/
        ├── 1724300000000_a1b2c/        # <collection_id> 毎のサブフォルダ
        │   ├── 1724300010000_x1y2z.md  # <item_id>.md
        │   └── 1724300015000_m5n6p.md
        └── 1724300005000_d3e4f/
            └── 1724300020000_q7r8s.md
```

- **`collections/`**: プロジェクトやカテゴリの単位（コレクション）を定義する Markdown ファイルを格納。
- **`items/<collection_id>/`**: 各コレクションに所属するアイテム（タスクのグループ/行）を定義する Markdown ファイルを格納。

---

## 2. ID 生成ルール (ID Generation Rule)

- **Collection ID / Item ID**: `Date.now()` (ミリ秒タイムスタンプ) + `_` + 5文字のランダム英数字
  - 例: `1724300000000_a1b2c`
- **TODO ID**: `todo-` + インデックス + `-` + `Date.now()`
  - 例: `todo-0-1724300010000`

---

## 3. ファイルレイアウト & データ構造 (File Format & Data Schema)

すべてのファイルは **YAML Frontmatter (`---` で囲まれた領域)** と **Markdown Body (本文)** で構成されます。

### ① コレクションファイル (`collections/<collection_id>.md`)

```markdown
---
id: "1724300000000_a1b2c"
title: "プロジェクト名またはカテゴリ名"
description: "コレクションの概要・説明文"
color: "purple" # （オプション）
created_at: "2026-08-22T06:00:00.000Z"
---
# プロジェクト名またはカテゴリ名

（コレクションに関する自由なメモ書き）
```

### ② アイテム & TODO ファイル (`items/<collection_id>/<item_id>.md`)

1つのアイテムファイル内に、アイテム自体のステータスと、そのアイテムに所属するTODOリストが Frontmatter の `todos` 配列として含まれます。

```markdown
---
id: "1724300010000_x1y2z"
collection_id: "1724300000000_a1b2c"
title: "アイテム名（例: タスクグループ / 機能単位 / 担当者など）"
status: "todo"                  # "todo" または "done"（アイテム/アクション自体の完了状態）
description: "アイテムの説明や追加メモ"
created_at: "2026-08-22T06:00:00.000Z"
todos:
  - id: "todo-0-1724300010000"
    title: "タスクタイトル1"
    due: "2026-08-22"           # YYYY-MM-DD 形式（未設定の場合は空文字 ""）
    status: "todo"              # "todo" または "done"
    description: "タスクの具体的な詳細メモ"
    group: "ジブリパーク"       # （オプション）グループ名・カテゴリ名
  - id: "todo-1-1724300010000"
    title: "タスクタイトル2"
    due: "2026-08-25"
    status: "done"              # 完了済みタスク
    description: ""
    group: ""
---
# アイテム名

（このアイテムに関する詳細仕様や関連リンク等の記述）
```

---

## 4. ユーザーの画面表示 & 動線パターン (User View & UX Mental Model)

ユーザーが Obsidian 上でプラグイン UI を開いているとき、ファイル内のデータは以下のように視覚化・操作されます。AIエージェントが更新した内容は、ユーザーの画面に即座に反映されます。

```text
+-----------------------------------------------------------------------------------+
|  [コレクション選択]  ▼ メインプロジェクト                                           |
+-----------------------------------------------------------------------------------+
|  アイテム / 日付 | 2026-08-22 (今日) | 2026-08-23       | 2026-08-24       | ...   |
+------------------+-------------------+------------------+------------------+-------+
|  機能Aの実装     | [ ] タスクタイトル1 |                  | [x] タスクタイトル2|       |
|  (item_id: x1y2z)|                   |                  |                  |       |
+------------------+-------------------+------------------+------------------+-------+
|  ドキュメント作成|                   | [ ] 仕様書作成   |                  |       |
|  (item_id: m5n6p)|                   |                  |                  |       |
+-----------------------------------------------------------------------------------+
```

1. **コレクション切り替え (Collections Grid)**:
   - ユーザーは `collections/` 配下のファイル（コレクション）を選択して表示を切り替えます。
   - エージェントがTODOを追加・操作する際は、ユーザーがどのコレクションを見ているか・どのコレクションに属すべきかを意識してください。

2. **カレンダーマトリックス (Calendar Matrix View)**:
   - **縦軸（行）**: アイテム (`items/<collection_id>/<item_id>.md`)
   - **横軸（列）**: 日付 (`due` の `YYYY-MM-DD`)
   - TODOオブジェクトの `due` フィールドの日付列 × 所属するアイテム行の交差セルに、TODOカードが表示されます。
   - `due` が空文字 `""` のTODOは、カレンダーマトリックス上には表示されません（ドロワーやアイテム詳細等で確認可能）。

3. **タスク詳細ドロワー (Task Detail Drawer)**:
   - ユーザーが TODO カードをクリックすると、画面右側に詳細ドロワーが開き、`title`, `due`, `status`, `description` やアイテムの `description` / Markdown Body を確認・編集できます。

4. **ドラッグ＆ドロップ (Drag & Drop)**:
   - ユーザーがUI上で TODO カードを別の日付列へドラッグすると、ファイル内の該当 TODO の `due` (`YYYY-MM-DD`) が更新されます。
   - 別のアイテム行へドラッグすると、該当 TODO が旧アイテムファイルの `todos` から削除され、新アイテムファイルの `todos` へ移動します。

---

## 5. AIエージェントの操作ガイドライン (Agent Operational Rules)

AIエージェントがTODOやアイテムの閲覧・更新・追加を行う場合、以下の手順を守ってください。

### ① アイテム（アクション行）のステータス更新・完了化 (Update / Complete Item)
1. `_todo-calendar/items/<collection_id>/<item_id>.md` を開きます。
2. Frontmatter 内の `status` フィールドを `"done"` または `"todo"` に変更します。
3. アクション全体が完了した場合は、必要に応じて配下の `todos` の `status` も `"done"` に更新します。
4. 保存します。

### ② TODOの更新・完了化 (Update / Complete TODO)
1. `_todo-calendar/items/<collection_id>/` 配下の `.md` ファイルを検索・読み込みます。
2. 対象の `todos` 配列内から、該当する TODO（`id` や `title` で特定）を見つけます。
3. `status` を `"done"` または `"todo"` に変更します。
4. 期日を変更する場合は `due` を `"YYYY-MM-DD"` 形式で更新します。
5. YAML Frontmatter の他フィールドおよび Markdown Body を保持したまま保存します。

### ③ TODOの新規追加 (Add New TODO)
1. 挿入先の `collection_id` および `item_id` を特定します（アイテムが存在しない場合は、新規アイテムファイルを作成）。
2. 対象の `items/<collection_id>/<item_id>.md` の Frontmatter `todos` 配列末尾に、新しい TODO オブジェクトを追加します：
   ```yaml
   - id: "todo-<index>-<timestamp>"
     title: "新規タスク名"
     due: "2026-08-23"
     status: "todo"
     description: "メモや詳細"
   ```
3. 保存します。

### ④ TODOの移動 (Move TODO)
- **期日変更**: 該当 TODO の `due` の値を変更。
- **アイテム変更**: 旧アイテムファイルの `todos` から該当オブジェクトを削除し、新アイテムファイルの `todos` に追加。

---

## 6. 編集時の注意事項 & 禁止事項 (Important Constraints)

1. **YAML 構文の厳守**:
   - `todos` 配列や各フィールドのインデント（スペース2つ）とデータ型を守ってください。
   - `due` は必ず `"YYYY-MM-DD"` 形式の文字列（例: `"2026-08-22"`）または空文字列 `""` にしてください。
   - `status` は `"todo"` または `"done"` のみ使用してください。
2. **Markdown Body（本文）の保護**:
   - `---` 終了以降の Markdown 本文（`# アイテム名` やノート本文）を誤って上書き消去しないでください。
3. **文字コード & 改行コード**:
   - UTF-8 で書き出してください。
