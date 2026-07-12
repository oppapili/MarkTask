# Tech Stack Decisions — U-obsidian-interop (spec)

> Construction / nfr-requirements（unit: U-obsidian-interop, spec〔Could〕）。上流参照: `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements）。

## 本ユニットの技術選択

| 関心事 | 選択 | 根拠 |
|---|---|---|
| 実装言語/ランタイム | （原則なし） | spec ユニットは恒久コードを持たない。互換仕様＋サンプル＋README が成果物 |
| Obsidian 表示 | Obsidian **Bases** / Dataview（外部ツール） | ユーザーの vault 側機能を利用。MarkTask は互換 frontmatter を出力するのみ |
| 同梱物 | `Tasks.base`（Bases 定義）＋サンプルタスク＋README 節 | 検証・利用手順の提供 |
| 依存追加 | なし | 追加ランタイム依存ゼロ（不要な依存を増やさない, project.md Decided） |

## 依存方針

- 外部ライブラリ依存を追加しない。Obsidian（Bases/Dataview）はユーザー環境のツールで、MarkTask 本体の依存ではない。
- 万一検証用の軽いスクリプトが要る場合も bun 標準で完結させ、新規依存を足さない。

## 備考

- 本ユニットは Could（Bolt6）。予算次第で後回し/スタブ可。互換の大半は task-core が素の YAML を出力し続けることで既に成立している。
