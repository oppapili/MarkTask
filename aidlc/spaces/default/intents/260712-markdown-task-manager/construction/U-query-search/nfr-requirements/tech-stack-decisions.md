# Tech Stack Decisions — U-query-search

> Construction / nfr-requirements（unit: U-query-search, library）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements）。

## 本ユニットの技術選択

| 関心事 | 選択 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript + bun | ADR-1 |
| 列挙 | task-core.Repository.list | 単一 I/O 境界（C2）。独自 I/O なし |
| フィルタ/ソート/検索 | 標準 Array 操作（filter/sort/includes） | 依存追加なし・O(n) で数千件に十分（NFR-3, ADR-4 DB非依存） |
| 日付比較（dueBefore） | 文字列 ISO 比較 or date-fns（軽量利用） | 既存 date-fns で足りる。新規依存を足さない |
| テスト | `bun:test` | コア重点（team-practices） |

## 依存方針

- **外部依存の追加ゼロ**。標準ライブラリ＋既存 date-fns（recurrence で既に採用）で完結。インデックス DB は導入しない（ADR-4・不要な依存を増やさない）。

## 備考

- 性能は将来ボトルネック化したらキャッシュ/インデックスを足せる（可逆, ADR-4）。MVP は単純走査で十分。
