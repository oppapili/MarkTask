<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-12T12:02:00Z — team-formation は SKIP(mvp) のため全 Bolt は aidlc-developer-agent(AI) が実行。walking-skeleton-first は team-practices で確定。Bolt 列は unit-of-work-dependency の DAG＋intent-backlog 想定順から導出: Bolt1=歩く骨格(add/list/done の薄い縦切り), recurrence(最リスク)を早期。並行は solo/AI ゆえ逐次を既定。外部依存なし(完全ローカル)。Construction Iteration は stage-major 既定のまま（小規模・Bolt が unit を束ねるため unit-major は不要）。

## Deviations

## Tradeoffs
- 2026-07-12T12:14:00Z — Bolt 列を skeleton-first + risk-first hybrid で確定（Q1=A）: Bolt1 歩く骨格 / Bolt2 メタ+状態 / Bolt3 recurrence(最リスク早期) / Bolt4 検索+サブタスク / Bolt5 削除退避+MCP / Bolt6 Obsidian(Could)。逐次(Q3=A, solo/AI)。DAG のトポロジ順を尊重（recurrence を Bolt3 に前倒しするのは risk-first の正当な経済判断で、依存 state-management は Bolt2 までに完成するため DAG 違反なし）。

## Open questions
- 2026-07-12T12:14:00Z — 既存データ(外部依存, Q5=B): 旧スキーマの Task/Recurrence Markdown が存在（`id`/`status:inbox`/`scheduled`/recurrence は `schedule:every 1 year`＋`next:`）。ユーザー方針＝新スキーマに寄せる・非互換は AI が正規化。MarkTask は新スキーマを正とし旧形式の恒久サポートはしない（NFR-2 で非準拠ファイルは壊さない）。任意の「migration/normalize ヘルパー」を scope に足すかは gate でユーザー確認（現状は out-of-band 正規化で記録）。
