<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-12T14:00:00Z — code-generation は mode:subagent・per-unit（gate:false で各ユニット実装→reviewer→next、全ユニット後に gate:true 単一ゲート）。per-unit のプラン承認・完了ゲートは orchestrator が抑制（stage-level ゲート1回で全ユニットを承認）。実コードはワークスペース root（TS+bun, src/core|cli|mcp）。最初の unit(U-task-core) でプロジェクト雛形（package.json/tsconfig/lint/test 設定）も作る。Test Strategy=Standard（コア重点, team-practices）。

## Deviations
- 2026-07-12T14:20:00Z — U-obsidian-interop（spec, Could）の code-generation は mode:subagent だが、成果物がランタイムコードでなく Obsidian 互換のサンプル/ドキュメント（Tasks.base・サンプルタスク・README 節）のため、開発エージェントへの委譲ではなくインラインで生成した。code の専門性を要さず、繰り返しの空戻り(subagent)を避け効率化するための意図的逸脱。他ユニット（実コード）は従来どおり subagent 委譲。

## Tradeoffs

## Open questions
