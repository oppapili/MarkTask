# Design System Mapping (Text-UI / CLI) — MarkTask

> Inception / refined-mockups 成果物。非UIのため「デザインシステム」＝**CLI 出力フォーマット規約**。一貫した記号・色・整形ルールを定義し、全コマンドで再利用する。
> 上流: `../requirements-analysis/requirements.md`（requirements）, `wireframes`（rough-mockups）, `../practices-discovery/team-practices.md`（team-practices）。

## 1. ステータス表現（記号＋色, 色のみ非依存 / Q1）

| status | 記号 | 色（TTY時） | 意味 |
|---|---|---|---|
| todo | `●` | default/白 | 未着手 |
| in-progress | `◐` | 黄/シアン | 進行中 |
| done | `✓` | 緑 | 完了 |
| waiting | `◷` | マゼンタ | 待ち |
| cancelled | `⊘` | 灰(dim) | 中止 |

- **色のみに依存しない**: 記号と status 文字列を必ず併記（アクセシビリティ）。
- `--no-color` 指定時・非TTY（パイプ/リダイレクト）時は色を自動オフ。記号＋文字は維持。

## 2. テーブル規約（list / search / Q5）

- 既定列（順序固定）: `STATUS`  `DUE`  `PRI`  `TITLE`。`--wide` で `PROJECT`/`TAGS` を追加可（任意拡張）。
- 整列: ASCII 空白パディングで左揃え（Unicode 罫線は使わない＝移植性）。
- 長い TITLE: 端末幅に合わせ末尾 `…` で切り詰め（Q5=G）。折り返さない。
- 件数フッタ: `N tasks (内訳)`。ページングなし＝全件出力（`less` 等に委ねる, Q5=I）。`--limit` で上限可。

## 3. 日付表記（Q3）

- 既定: 絶対 `YYYY-MM-DD`。期限が設定済みなら相対を括弧併記 `2026-08-07 (26d)` / 過去は `(-3d)`。
- `--relative`: 相対のみ（`in 26 days` / `3 days ago`）。
- 未設定: `-`。

## 4. メッセージ規約

- 成功接頭辞 `✓ `（緑）、エラー接頭辞 `✗ `（赤）。`--no-color` で色のみ落ちる。
- 状態遷移: `<ref>  status: <from> -> <to>`。
- 生成/移動: `Created <ref> (...)` / `Deleted (soft) moved to <path>` / `Archived moved to <path>`。
- 復旧ヒント（delete/archive）: 実行結果直下に復旧/参照コマンドを1行。

## 5. 出力モード

- 人間向け（既定）: 上記整形。
- `--json`: 1行 JSON（`{ "tasks": [...], "count": N }` 等）。色・記号なし。スクリプト/AI/デバッグ用（Q2）。安定したキー名を維持。

## 6. Exit Code 規約

- `0` 成功 / `1` 業務エラー（未検出・曖昧参照・完了ガード・不正 repeat） / `2` 設定・使用法エラー。

## 7. 一貫性ノート

- これらは CLI と MCP（構造化出力）双方で共有するコア整形/コード規約に基づく（`team-practices.md`: CLI と MCP はコア共有）。記号/色/日付/exit code は単一の定義から参照し、コマンド間でズレないようにする。
