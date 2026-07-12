# Tech Stack Decisions — U-cli

> Construction / nfr-requirements（unit: U-cli, service）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements）。

## 本ユニットの技術選択

| 関心事 | 選択 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript + bun | ADR-1（`marktask`/`mt` 実行可能） |
| 引数パーサ | `commander` | ADR-2（Q2=A）。サブコマンド＋エイリアスが素直 |
| 出力整形 | 自前 OutputFormatter（記号/色/table/json） | design-system-mapping 準拠。色は `bun` の TTY 判定＋`--no-color` |
| 色付け | 軽量（ANSI 直書き or 小さなユーティリティ） | 重いカラーライブラリを避ける（不要な依存を増やさない） |
| コア呼び出し | TaskService（共有） | project.md Mandated |
| テスト | `bun:test`（CLI と core の結合含む） | team-practices |

## 依存方針

- 追加依存は **commander のみ**（＋必要最小の色ユーティリティ）。ビジネスロジックは持たず TaskService に委譲。
- MCP と同一 core を共有し挙動一致（結合テストで担保）。
