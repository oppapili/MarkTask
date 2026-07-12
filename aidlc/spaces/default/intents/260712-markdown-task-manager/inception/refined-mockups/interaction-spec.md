# Interaction Specification (CLI/MCP) — MarkTask

> Inception / refined-mockups 成果物。コマンドの入力→効果→可視状態遷移・エラー・確認パターンを規定。
> 上流: `../user-stories/stories.md`（stories）, `../requirements-analysis/requirements.md`（requirements）, `wireframes`/`user-flow`（rough-mockups）。component-spec-template に倣った項目立て。

## 1. 共通インタラクション原則

- **非対話で完結（FR-D4）**: すべての非破壊操作はプロンプト無しで実行。パイプ/スクリプト/MCP で使える。
- **確認パターン（Q4=A）**: delete=ソフト削除・archive=退避はいずれも非破壊なので**即実行**し、結果に復旧/参照方法を1行添える。ハード削除は提供しない。`--force` はガード（親完了ガード等）の上書き用途に限る。
- **エラーは可読＋候補提示（FR-D5）**: 曖昧参照はエラーにせず候補一覧。不正 recurrence 記法は記法ガイドを案内。
- **Exit code**: `0`=成功, `1`=業務エラー(ガード/未検出/曖昧), `2`=設定/使用法エラー。
- **状態遷移の可視化**: 状態を変えた操作は `<ref>  status: X -> Y` を出力。
- **出力モード**: 既定=人間向け（色＋記号, `--no-color`/非TTYで色オフ）／`--json`=機械可読。

## 2. コマンド別スペック

### add
- 入力: `title`（必須, 位置引数）, `--due --priority --tags --project --repeat --parent`
- 効果: `tasks/<YYYYMMDD>-<slug>.md` を生成（`status:todo`, `type:task|recurrence`, `created/updated`）。衝突時サフィックス。
- 状態: 成功=Created 行 / エラー=保存先未設定(exit2)・不正 repeat(exit1)。

### list
- 入力: `--status --due --priority --tag --project`（AND フィルタ）, `--format table|compact`, `--relative`, `--archived`, `--json`, `--limit`(任意, 既定は全件/Q5=I)
- 効果: 活動タスクを due 昇順で表示（`.trash/`・archive 除外）。列= status/due/priority/title（Q5）。長文は端末幅で切り詰め。
- 状態: 成功=表 / 空=案内文 / （`--archived` で退避分）。

### show
- 入力: `<ref>`（`--json` 可）
- 効果: frontmatter＋本文を表示。
- 状態: 成功 / 未検出(exit1) / 曖昧→候補提示(exit1)。

### update
- 入力: `<ref> --due --priority --tags --project --repeat`
- 効果: 指定フィールドを更新し `updated` を更新。既存の本文・未知フィールドは保持（NFR-2）。

### start / done / wait / cancel / state
- 入力: `<ref>`（`state` は `<ref> <value>`）
- 効果: `status` 遷移＋`updated`。`done` は分岐:
  - 非 recurrence → `status:done`。
  - recurrence → `due` を予定ベースで次回へ、`status:todo`、`last_done` 記録（終了条件到達なら `done` 確定）(FR-E4/E5)。
  - 親タスク → **完了ガード**: 未完了の子があれば拒否し一覧提示(exit1)、`--force` で上書き可(FR-G2)。

### search
- 入力: `<query>`（本文＋タイトル, `--json` 可）
- 効果: 一致タスクを list 形式で提示 / 空案内。

### delete（ソフト）
- 入力: `<ref>`
- 効果: ファイルを `tasks/.trash/` へ移動（非破壊, 即実行）。結果に復旧方法。既定 list から除外。

### archive
- 入力: `<ref>`
- 効果: ファイルを archive 場所へ移動（退避, 即実行）。`list --archived` で参照。delete と別 operation。

### config
- 入力: `--set <key> <value>` / `--get <key>` / `--list`
- 効果: XDG `~/.config/marktask/config.toml` に vault/tasks パス等を保存（FR-A3）。

### MCP tools（US-6.1）
- `create/list/get/update/complete/state/search/delete/archive/recurrence_set` を公開。CLI と同一コア。戻り値は構造化（ref, status, 主要フィールド）。曖昧参照は候補を含むエラー結果。delete はソフト削除ゆえ追加 confirm 不要（FR-H4）。

## 3. 状態網羅（各コマンド）

| コマンド | 成功 | 空/該当なし | エラー |
|---|---|---|---|
| add | Created | - | 設定なし(2)/不正repeat(1) |
| list/search | 表/一致 | 案内文 | - |
| show/update/state | 反映 | - | 未検出/曖昧(1) |
| done(recurring) | 次回更新 | - | 不正repeat(1) |
| done(parent) | 完了 | - | 子未完ガード(1) |
| delete/archive | 移動＋ヒント | - | 未検出/曖昧(1) |
