<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-12T12:20:00Z — Construction functional-design はエンジン駆動の per-unit 反復（gate:false で各ユニット生成→reviewer→next、全ユニット後に gate:true 単一ゲート）。Standard depth＋設計が application-design で十分詳細なため、Construction の質問は例外的（genuine gap のみ）＝新規 Q&A は基本行わず、requirements/component-methods を正として artifact を生成。非UI(library/service)ゆえ frontend-components は produces_kinds 上も対象外。ユニット順は DAG/bolt build order（U-task-core から）。

## Deviations

## Tradeoffs

## Open questions
