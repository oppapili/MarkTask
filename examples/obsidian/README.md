# MarkTask × Obsidian — サンプルと互換仕様

MarkTask のタスクは **1タスク = 1 Markdown ファイル**（素の frontmatter＋自由記述本文）。そのまま Obsidian の vault 内で扱えます。ここは互換性のサンプルと使い方です。

## 同梱サンプル

- `Tasks.base` — Obsidian **Bases** の定義例（活動タスクのテーブル＋繰り返しビュー）。vault に置いて Base として開く。※Bases の構文は Obsidian のバージョンで差があるため**例示**です。
- `tasks/` — サンプルタスク:
  - `20260712-書類を提出する.md`（通常タスク・本文に wikilink）
  - `20260628-月次レポート.md`（recurrence, `repeat: every 1 month`）
  - `20260701-申請対応.md` ＋ `20260702-添付書類を用意.md`（親子・`parent: "[[...]]"`）

## Obsidian での使い方

1. **一覧（Bases）**: `type` / `status` / `priority` / `due` / `project` でフィルタ・列表示。`Tasks.base` を参考に。
2. **一覧（Dataview）**: 同じ frontmatter フィールドを Dataview クエリでも参照可（例: `TABLE status, due FROM "tasks" WHERE type = "task" AND status != "done" SORT due ASC`）。
3. **相互参照（wikilink）**: 本文の `[[ノート]]` で知識ノートへリンク、backlink で往復。サブタスクは `parent: "[[親]]"`。
4. **削除の隠し扱い**: `delete` は `tasks/.trash/`（ドット始まり）へ移動するため、通常の一覧・Bases 集計から自然に除外されます。

## frontmatter スキーマ（互換の要点）

`tags / created / updated / type(task|recurrence) / status(todo|in-progress|done|waiting|cancelled) / priority(low|medium|high) / project / due / repeat / parent / last_done`。ファイル名（`<作成日>-<タイトル>.md`）が参照キー兼タイトルで、frontmatter に `id`/`title` は持ちません。
