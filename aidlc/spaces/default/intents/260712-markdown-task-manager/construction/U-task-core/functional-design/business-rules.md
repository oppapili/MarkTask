# Business Rules — U-task-core

> Construction / functional-design（unit: U-task-core）。上流参照: `../../../inception/requirements-analysis/requirements.md`（requirements）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。
> 検証ロジック・制約・不変条件。

## スキーマ検証ルール（TaskModel.validate）

- **R1** `type` は `task` | `recurrence` のいずれか必須。未指定/不正 → 検証エラー。
- **R2** `status` は `todo|in-progress|done|waiting|cancelled` のいずれか必須。既定は `todo`。
- **R3** `priority` は `low|medium|high`（任意, 既定 `medium`）。不正値はエラー。
- **R4** `due` / `last_done` は `YYYY-MM-DD` 形式（任意）。不正日付はエラー。
- **R5** `created` / `updated` は ISO 8601。`created` は生成時に自動、以後不変。`updated` は変更操作ごとに更新。
- **R6** `parent` は wikilink 文字列 `"[[<ref>]]"`（任意）。値の存在検証は U-subtasks の責務（ここでは形式のみ）。
- **R7** `repeat` は文字列（任意）。記法検証は U-recurrence の責務（task-core は素通し保持）。

## ファイル名・参照ルール

- **R8** ファイル名 stem が参照キー兼タイトル。frontmatter に `id`/`title` を持たない（DRY, FR-A1）。
- **R9** slug は OS 安全（`/ \ : * ? " < > |` と制御文字を除去/置換）。日本語はそのまま許可（UTF-8, NFR-4）。
- **R10** 同一 `<YYYYMMDD>-<slug>` の衝突は `-2`,`-3`… サフィックスで一意化（FR-A4）。ハッシュや連番 ID は使わない。

## 非破壊・安全性の不変条件

- **INV1**（原子性, NFR-1）: タスクファイルの書込は temp→rename でのみ行う。部分状態のファイルを残さない。
- **INV2**（非破壊, NFR-2）: frontmatter が無い/非準拠の Markdown を読んでも壊さない。未知の frontmatter フィールドは `raw` に温存し、encode 時に書き戻す。
- **INV3**（ハード削除禁止）: task-core は `unlink` によるタスク本体の物理削除を公開しない。除去は移動（trash）でのみ表現（FR-I）。
- **INV4**（単一 I/O 境界）: `tasks/` 配下への書込は TaskRepository のみが行う（他コンポーネントは Repository 経由）。

## エラー正規化ルール

- **R11** ファイル I/O 例外は `AppError.io` に正規化して `Result` で返す（例外を境界の外に投げない, ADR-9）。
- **R12** 参照不能は `not-found`、複数該当は `ambiguous(candidates)`（R-D5）。

## 設定ルール

- **R13** 設定は XDG `~/.config/marktask/config.yaml`。未存在時は既定値（tasksDir=`./tasks`, trashDir=`tasks/.trash`, archiveDir=`archive`）で動作し、`config` コマンドで確定できる。
- **R14** `trashDir` は既定で `tasksDir/.trash`（ドット始まりで通常 list から自然に除外・Obsidian でも隠し扱い）。
