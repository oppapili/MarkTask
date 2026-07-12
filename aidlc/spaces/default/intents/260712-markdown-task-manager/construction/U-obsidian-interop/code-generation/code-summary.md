# Code Summary — U-obsidian-interop (spec)

> Construction / code-generation（unit: U-obsidian-interop, kind: spec〔Could〕）。成果物は Obsidian 互換のサンプル/ドキュメント（ランタイムコードなし）。上流参照: `./code-generation-plan.md`, `../functional-design/*`。

## 生成ファイル（workspace root）

- `examples/obsidian/Tasks.base` — Obsidian Bases 定義サンプル（活動タスク table＋繰り返しビュー、例示と明記）。
- `examples/obsidian/tasks/20260712-書類を提出する.md` — 通常タスク（本文 wikilink）。
- `examples/obsidian/tasks/20260628-月次レポート.md` — recurrence（`repeat: every 1 month`, `last_done`）。
- `examples/obsidian/tasks/20260701-申請対応.md` ＋ `20260702-添付書類を用意.md` — 親子（`parent: "[[...]]"`）。
- `examples/obsidian/README.md` — サンプルの使い方・互換要点。
- `README.md`（更新）— `## Obsidian` 節を追加（Bases/Dataview・wikilink・ソフト削除の隠し扱い・examples 参照）。

## 主要な判断

- ランタイムコードを持たない spec（互換は task-core が素の YAML を出力し続けることで成立）。サンプルは機微情報なし（プレースホルダ, SEC-2）。
- Bases 構文はバージョン差があるため「例示」と明記。Could ゆえ最小限。
- mode:subagent だが内容がサンプル/仕様のためインライン生成（memory に deviation 記録）。

## テスト/検証

- ランタイムコード変更なし＝既存 `bun test`（63 pass）に影響なし。サンプルの妥当性は実 vault での目視検証（手動可, team-practices）。

## プランからの逸脱

- 生成方式（subagent → インライン）のみ。成果物内容はプランどおり。
