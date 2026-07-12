# External Dependency Map — MarkTask

> Inception / delivery-planning 成果物。Bolt が消費する外部依存（API/データ/承認/外部チーム）。
> 上流参照: `../requirements-analysis/requirements.md`, `./bolt-plan.md`。

## D1. 既存タスクデータ（旧スキーマの Markdown 群）— Q5=B

- **内容**: 既に Task / Recurrence を表す Markdown ファイルが存在する。旧スキーマを使用:
  - Task 例: `id: 20260712T09494676` / `status: inbox` / `scheduled: ...`（本プロジェクトで**不採用**にしたフィールド）。
  - Recurrence 例: `type: recurrence` / `schedule: every 1 year` / `next: 2027-04-30`（本プロジェクトは `repeat`＋予定ベース due を採用）。
- **オーナー**: 開発者本人（＋AI による正規化）。
- **リードタイム / ブロック**: どの Bolt も**ブロックしない**（MarkTask は新スキーマを正として実装し、既存ファイルの変換は out-of-band で行う）。
- **方針（ユーザー明示）**: 非互換部分は AI がメンテして直す。むしろ既存フォーマットを**今回提言した新スキーマに寄せたい**。旧形式の恒久サポートは行わない。
- **緩和 / ワークアラウンド**:
  - NFR-2（既存 md を壊さない・既知フィールドのみ解釈）により、変換前でも破壊は起きない。
  - 一度きりの正規化（`id`/`inbox`/`scheduled` の除去、`schedule`→`repeat` 変換、`next`→予定ベース `due` 再計算）を out-of-band（ユーザー＋AI）で実施。
  - 任意: 軽量な `migrate`/`normalize` ヘルパーを scope に足す選択肢あり（gate でユーザー確認。現状は scope 外＝手動正規化を既定）。

## D2. その他

- 外部 API / クラウド / 承認 / 外部チーム依存は **なし**（完全ローカル・AI 完結、Q5）。MCP は stdio ローカル・非公開。

## サマリ

外部依存は実質「既存データの新スキーマ正規化」のみで、これはどの Bolt もブロックしない軽量事項。MarkTask 本体は新スキーマを正として実装する。
