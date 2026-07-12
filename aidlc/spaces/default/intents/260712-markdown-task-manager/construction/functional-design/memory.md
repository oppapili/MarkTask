<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-12T12:20:00Z — Construction functional-design はエンジン駆動の per-unit 反復（gate:false で各ユニット生成→reviewer→next、全ユニット後に gate:true 単一ゲート）。Standard depth＋設計が application-design で十分詳細なため、Construction の質問は例外的（genuine gap のみ）＝新規 Q&A は基本行わず、requirements/component-methods を正として artifact を生成。非UI(library/service)ゆえ frontend-components は produces_kinds 上も対象外。ユニット順は DAG/bolt build order（U-task-core から）。

## Deviations

## Tradeoffs
- 2026-07-12T13:22:00Z — recurrence の未解決点を functional-design で確定: (OQ-1) 予定ベース加算の結果が今日以下なら未来の最初の発生日までスキップ（missed をまとめて消化・過去日を出し続けない）。(OQ-2) 月内日指定は月末 clamp（every month on 31→短い月は月末）、曜日指定は起点翌日以降の最近該当日。`xN` 残回数は `repeat` 文字列内で減算保持（スキーマ最小・Dataview 可読、別カウンタ field を足さない）。
- 2026-07-12T13:22:00Z — サブタスク完了ガードの「完了扱い」を確定(OQ-4): `done`＋`cancelled` は非ブロッキング（意図的中止は親を妨げない）、`todo/in-progress/waiting` はブロッキング。多階層は再帰、循環リンクは visited で保護。`done --force` でガード上書き可。

## Open questions
