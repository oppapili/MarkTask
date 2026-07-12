# Tech Stack Decisions — U-task-core

> Construction / nfr-requirements（unit: U-task-core, library）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements）。
> グローバルなスタックは application-design（ADR-1〜9）で確定済み。ここでは本ユニットで使う技術のみを再掲・具体化。

## 本ユニットの技術選択

| 関心事 | 選択 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript + bun | ADR-1（プロジェクト共通） |
| frontmatter 分離 | `gray-matter` | ADR（frontmatter 定番）。本文/未知フィールド保持に適合（SEC-4） |
| YAML 読み書き | `yaml` | ADR-6（config も YAML で統一）。安全ロードで SEC-6 |
| ファイル I/O・原子的書込 | bun 標準 fs（temp→rename） | NFR-1。追加依存なし |
| ファイル名 slug 化 | 自前の軽量関数 | 依存を増やさない方針（project.md）。SEC-1 のサニタイズを内包 |
| テスト | `bun:test` | ADR（コア重点・厚めに, team-practices） |

## 依存方針

- 本ユニットの外部依存は `gray-matter` / `yaml` のみ（日付は不要＝recurrence 側）。不要な依存を増やさない（project.md Decided）。
- date-fns は U-recurrence 側の依存で、本ユニットは持たない。

## 備考

- tech-stack はプロジェクト共通で確定済みのため、per-unit の本ファイルは「このユニットが実際に使う部分集合」の記録に留める（重複記述を避ける）。
