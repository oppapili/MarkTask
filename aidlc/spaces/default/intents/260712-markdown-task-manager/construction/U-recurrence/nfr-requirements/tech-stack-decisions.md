# Tech Stack Decisions — U-recurrence

> Construction / nfr-requirements（unit: U-recurrence, library）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements）。

## 本ユニットの技術選択

| 関心事 | 選択 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript + bun | ADR-1 |
| 日付計算 | `date-fns`（addDays/Weeks/Months/Years, lastDayOfMonth, nextDay 等） | ADR-5。月末 clamp・曜日・うるう年を正確に扱える |
| 記法パース | 手続き的パーサ（自前・軽量） | 依存を増やさず、eval/ReDoS を避けた制御（SEC-1/2） |
| テスト | `bun:test`（境界を厚く） | 最重要ユニット・team-practices コア重点 |

## 依存方針

- 外部依存は **date-fns のみ**（ADR-5）。記法パーサは自前（パーサジェネレータ等の重い依存を入れない＝不要な依存を増やさない, project.md Decided）。

## 備考

- date-fns を RecurrenceEngine 内に閉じ込め、差し替え可能に保つ（可逆, ADR-5）。`xN` 残回数は `repeat` 文字列内に保持（スキーマ最小・Dataview 可読）。
