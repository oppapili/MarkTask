# Tech Stack Decisions — U-delete-archive

> Construction / nfr-requirements（unit: U-delete-archive, library）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements）。
> グローバルスタックは application-design（ADR）で確定済み。本ユニットの部分集合のみ記録。

## 本ユニットの技術選択

| 関心事 | 選択 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript + bun | ADR-1 |
| ファイル移動 | task-core の Repository.moveToTrash/moveToArchive | 単一 I/O 境界（components C2）。本ユニットは独自 I/O を持たない |
| パス解決 | ConfigManager.resolvePaths（task-core） | trash/archive ディレクトリの決定 |
| テスト | `bun:test` | コア重点（team-practices） |

## 依存方針

- **外部依存ゼロ**（追加）。すべて task-core の primitive に委譲（薄いドメインサービス）。不要な依存を増やさない（project.md Decided）。

## 備考

- 本ユニットは「delete≠archive の意図の分離」というドメイン判断が主で、技術的には task-core の移動プリミティブの薄いラッパ。
