<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-12T10:27:00Z — Ideation で確定済みの事項（frontmatter スキーマ Q6、5状態、CLI サブコマンド＋mt エイリアス Q1、list 既定テーブル Q3=D、MCP フル操作面の方針、walking-skeleton-first、保存先既定 tasks/）は再質問しない。requirements-analysis は「未解決ギャップ」に集中: recurrence 記法/挙動（中核かつ既知の弱点）、サブタスク親子の意味論、タスク参照解決、一覧/検索の対象とソート、MCP 操作面の確定、データ安全性・規模(NFR)、設定の保存場所。Depth=Standard。

## Deviations

## Tradeoffs
- 2026-07-12T10:42:00Z — delete と archive を別 operation に分離（ユーザー明示）。delete=ソフト削除→`.trash/`、archive=退避→archive場所。ソフト削除が AI 誤削除リスク(Q7でMCP delete公開)の緩和になり、MCP側の confirm 必須(Q9-C)は不要と整合。ハード削除は提供せず（git がセーフティネット）。
- 2026-07-12T10:42:00Z — recurrence 記法を Q1 でフル採用（間隔/曜日/月日/キーワード/終了条件）。U5(recurrence) は最大・最リスクの Unit になる見込み。次回 due は予定ベース(Q2=A)。overdue で加算後もまだ過去日になる場合の「未来までロールフォワードするか単純加算か」は functional-design で確定（Open）。

## Open questions
- 2026-07-12T10:42:00Z — 新規 frontmatter フィールド `last_done`（Q3=C, recurrence の最終完了日, 任意）。rough-mockups で確定したスキーマへの追加。schema を requirements で明記し、application-design で最終化。
- 2026-07-12T10:42:00Z — recurrence の予定ベース加算で次回 due が依然過去になるケースの挙動（単純 +interval か、未来の最初の発生日までスキップか）は functional-design で決定。
- 2026-07-12T10:42:00Z — 親の done ガード(Q4=B)には子の列挙（`parent: [[..]]` の逆引き）が必要。`list --parent` は内部機能として要るため CLI にも出す想定。ネスト階層上限は未指定 → 多階層許可・ガードは再帰適用と仮定。
