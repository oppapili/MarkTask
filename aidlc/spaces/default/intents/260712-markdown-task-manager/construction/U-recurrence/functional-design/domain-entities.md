# Domain Entities — U-recurrence

> Construction / functional-design（unit: U-recurrence）。上流参照: `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-E）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。
> RecurrenceRule はパース結果の値オブジェクト（永続化されるのは frontmatter の `repeat` 文字列）。

## RecurrenceRule（パース結果・値オブジェクト）

```ts
type RecurrenceRule = {
  base:
    | { kind: 'interval'; n: number; unit: 'day'|'week'|'month'|'year' }
    | { kind: 'weekly-days'; weekdays: number[] }      // 0=Sun..6=Sat
    | { kind: 'monthly-day'; day: number | 'last' };   // 1..31 | 'last'
  end?: { until?: string /* YYYY-MM-DD */; count?: number /* xN 残回数 */ };
};
```

## 永続化表現（frontmatter, task-core スキーマ）

- `repeat: string` — 記法そのもの（例 `every 1 month`, `every mon,thu until 2026-12-31`, `every month on last x6`）。**正**はこの文字列（Dataview/Bases 可読）。
- `type: recurrence` — recurrence タスクの識別（Bases フィルタ）。
- `last_done: YYYY-MM-DD` — 最終完了日（Q3=C）。
- `due: YYYY-MM-DD` — 次回発生日（完了ごとに更新）。

## 変換関係

```
repeat(文字列) --parse--> RecurrenceRule --nextDue(prevDue)--> 次回 due(Date|null)
完了時: rollForward が due/status/last_done(必要なら repeat の xN) を更新
```

## ライフサイクル（recurrence タスク）

```
[作成: type=recurrence, repeat, due]
      | done
      v
 rollForward: due=次回, status=todo, last_done=完了日   --(until/xN 到達)--> status=done で確定
```

## 依存・境界

- 依存は **date-fns** のみ（ADR-5）。task-core の Task 型を受け取り、更新した Task を返す（永続化はしない）。
- `xN` の残回数は `repeat` 文字列内に保持（別カウンタ用フィールドを増やさない＝スキーマ最小・Dataview 可読）。

<!-- Text fallback: RecurrenceRuleはparse結果の値オブジェクト(interval|weekly-days|monthly-day + end{until,count})。永続化の正はfrontmatterのrepeat文字列(+type/last_done/due)。repeat→parse→nextDueで次回算出、rollForwardでdue/status/last_done更新。xN残回数はrepeat文字列内に保持。依存はdate-fnsのみ、I/Oなし。 -->

## Coverage

- US-3.1（記法）, US-3.2（完了・次回発生）。requirements OQ-1/OQ-2 を本設計で確定（missed スキップ・月末clamp・曜日算出）。
