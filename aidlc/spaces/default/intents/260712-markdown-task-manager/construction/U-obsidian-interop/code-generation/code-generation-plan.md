# Code Generation Plan — U-obsidian-interop (spec)

> Construction / code-generation（unit: U-obsidian-interop, kind: spec〔Could〕）。上流参照: `../functional-design/business-rules.md`, `../functional-design/domain-entities.md`, `../nfr-requirements/*`, `../../../inception/requirements-analysis/requirements.md`。
> spec ユニットのため成果物は**サンプル＋ドキュメント**（ランタイムコードなし）。mode は subagent だが、内容が code でなくサンプル/仕様のため**インライン生成**（deviation・memory に記録）。

## 実装ステップ

- [ ] **Step 1: サンプル配置**（`examples/obsidian/`）
  - `Tasks.base` — Obsidian Bases 定義サンプル（`type = task and status != done` の活動ビュー、列= title/status/priority/due/project）。
  - `tasks/` にサンプルタスク: task 1件・recurrence 1件・親子1組（機微情報なし・プレースホルダ, SEC-2）。
- [ ] **Step 2: README に Obsidian 節を追加**（vault で開く手順、Bases/Dataview サンプル、wikilink 運用、`.trash/` は隠しで一覧除外）。
- [ ] **Step 3: examples/obsidian/README.md**（サンプルの使い方）。

## Story トレーサビリティ

- US-8.1（ナレッジ相互参照）, US-T.3（README 手順の一部）。

## 備考

- 恒久ランタイムコードは持たない（互換は task-core が素の YAML を出力し続けることで成立）。Bases の `.base` 構文はバージョン差があり得るため「例示」と明記。Could ゆえ最小限。
