# Tech Stack Decisions — U-subtasks

> Construction / nfr-requirements（unit: U-subtasks, library）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements）。

## 本ユニットの技術選択

| 関心事 | 選択 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript + bun | ADR-1 |
| 子の列挙 | task-core.Repository.list ＋ 標準 Array filter | 単一 I/O 境界。依存追加なし |
| wikilink パース | 自前の軽量文字列処理（`[[...]]` 抽出） | 依存不要 |
| 再帰・循環保護 | Set による visited | 標準機能。停止性を保証（SEC-1） |
| テスト | `bun:test` | コア重点（team-practices） |

## 依存方針

- **外部依存の追加ゼロ**。task-core の列挙＋標準ライブラリで完結。

## 備考

- 逆引き（親→子）は list 走査で算出（親側は子を保持しない＝単一情報源, functional-design）。数百〜数千件で実用速度（NFR-3）。
