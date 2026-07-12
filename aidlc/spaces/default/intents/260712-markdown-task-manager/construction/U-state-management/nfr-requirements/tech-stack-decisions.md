# Tech Stack Decisions — U-state-management

> Construction / nfr-requirements（unit: U-state-management, library）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements）。

## 本ユニットの技術選択

| 関心事 | 選択 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript + bun | ADR-1 |
| 状態モデル | TS の union 型（Status）＋純粋関数 transition | 依存不要・型で不正値を抑止 |
| updated 生成 | 標準 Date / ISO 文字列 | 依存追加なし |
| テスト | `bun:test` | コア重点（team-practices） |

## 依存方針

- **外部依存の追加ゼロ**。純粋関数のみ。永続化は task-core、recurrence/subtasks 連携は各ユニットに委譲。

## 備考

- 遷移は原則自由（厳格な遷移グラフを課さない, functional-design R2）ため実装は薄い。テストは不正値拒否と done 分岐に集中。
