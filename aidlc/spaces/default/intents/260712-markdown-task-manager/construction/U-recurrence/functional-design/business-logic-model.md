# Business Logic Model — U-recurrence（中核）

> Construction / functional-design（unit: U-recurrence, library）。上流参照: `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/units-generation/unit-of-work-story-map.md`, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-E）, `../../../inception/application-design/components.md`（components）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/application-design/services.md`（services）。
> 対象: RecurrenceEngine（記法パース＋次回 due 算出＋完了ロールフォワード）。日付演算は date-fns。純粋関数中心・厚くテスト（team-practices）。

## 1. 記法パース parse(repeat) → RecurrenceRule（FR-E1, E2）

サポート記法（Q1=A,B,C,D,E）:
```
every N days|weeks|months|years        -> {kind:'interval', n:N, unit}
every <weekday>[,<weekday>...]         -> {kind:'weekly-days', weekdays:[0..6]}   # mon,tue,...,sun
every month on <1..31|last>            -> {kind:'monthly-day', day:1..31|'last'}
daily|weekly|monthly|yearly            -> interval 糖衣 (every 1 day|week|month|year)
```
終了条件（任意・末尾に付与）:
```
... until <YYYY-MM-DD>                  -> end.until = date
... x<N>                                -> end.count = N   （残り発生回数）
```
- 大文字小文字・余分な空白は正規化。未知/不正記法 → `Result(error: invalid-repeat, reason, ヒント=README 記法)`。
- weekday 語彙: `mon,tue,wed,thu,fri,sat,sun`（3文字）。

## 2. 次回 due 算出 nextDue(rule, prevDue) → Date | null（FR-E3, E6）

**方針（OQ-1 確定）**: 予定ベース（前回 due 起点）だが、算出結果が「今日以下」なら**未来の最初の該当発生日までスキップ**する（大幅遅延で過去日が延々と出続けるのを防ぐ）。

```
nextDue(rule, prevDue, today=today()):
  next = stepOnce(rule, prevDue)
  while next <= today:                    # missed をまとめて消化して未来へ
    next = stepOnce(rule, next)
  if rule.end.until and next > rule.end.until: return null   # 終了
  return next

stepOnce(rule, from):
  interval:     return add(from, n, unit)                 # date-fns addDays/Weeks/Months/Years
  weekly-days:  return 次に来る weekdays の最小の日 (from の翌日以降)
  monthly-day:  base = add(from, 1, 'month')
                return day=='last' ? lastDayOfMonth(base)
                                   : min(day, daysInMonth(base)) の日   # 月末 clamp（OQ-2）
```
- **月末 clamp（OQ-2）**: `every month on 31` で 2月なら 28/29 に丸める。`last` は各月末。
- **曜日（OQ-2）**: `every mon,thu` は from の翌日以降で最も近い mon か thu。週跨ぎは自然に処理（date-fns）。

## 3. 完了ロールフォワード rollForward(task) → CompleteOutcome（FR-E4, E5, US-3.2）

```
rollForward(task):
  rule = parse(task.repeat); if err: return err
  # 終了条件 xN の判定（残回数）
  if rule.end.count != null:
    if rule.end.count <= 1:                         # 今回が最後
      task.status='done'; task.last_done=today(); task.repeat = stripCount(task.repeat)
      return { kind:'recurrence-ended', task }
    else:
      task.repeat = decrementCount(task.repeat)     # xN -> x(N-1) を repeat 文字列に反映
  next = nextDue(rule, dateOf(task.due ?? today()))
  if next == null:                                   # until 到達
    task.status='done'; task.last_done=today()
    return { kind:'recurrence-ended', task }
  task.due = fmt(next); task.status='todo'; task.last_done=today(); task.updated=nowIso()
  return { kind:'recurred', task, nextDue: fmt(next) }
```
- **単一ファイル方式**: 新ファイルを作らず同一ファイルの `due`/`status`/`last_done`/(必要なら `repeat`) を更新（FR-E4, 命名衝突・履歴分断の回避）。
- `due` 未設定の recurrence を done した場合は today を起点に算出（フォールバック）。

## 4. describe(rule)（README/エラー案内・list 表示補助）

- ルールを人間可読文へ（例: "毎月 / 次回 2026-09-01 / 残り2回"）。CLI の recurrence 表示に利用。

## 5. 境界・依存

- 本 unit は**純粋計算**（parse/nextDue/rollForward はファイル I/O を持たない）。永続化は TaskService→task-core.Repository。状態遷移の一次処理は U-state-management（done 分岐から rollForward を呼ぶ）。
- date-fns のみに依存（ADR-5）。

<!-- Text fallback: RecurrenceEngineはrepeat記法(every N unit / every weekday(s) / every month on n|last / daily..yearly / until / xN)をparseし、nextDueで前回due起点に加算しつつ結果が今日以下なら未来までstepOnceを繰り返す。月末はclamp、曜日は翌日以降の最近日。rollForwardは単一ファイルのdue/status/last_done(必要ならrepeatのxN減算)を更新しrecurred/recurrence-endedを返す。until/xN到達でdone確定。純粋計算でI/Oなし、date-fns使用。 -->


## Review

**Reviewer:** aidlc-architecture-reviewer-agent
**Verdict:** READY
**Date:** 2026-07-12T13:08:04Z
**Iteration:** 1

### Strengths

1. **Complete grammar coverage with explicit parsing rules**: The design implements the full FR-E1 grammar (every N days/weeks/months/years; every <weekday(s)> with comma-separated lists; every month on <1-31|last>; daily/weekly/monthly/yearly keywords; until <YYYY-MM-DD> and xN termination). The parse() algorithm handles normalization (case, whitespace), vocabulary mapping (mon..sun 3-letter codes), and returns structured `Result(error: invalid-repeat)` with user-facing hints on malformed input. Every parse path is deterministic and testable. **FR-E1/E2 satisfied completely.**

2. **OQ-1 (heavily-overdue rollforward) resolved coherently**: The nextDue() algorithm implements **schedule-based calculation with missed-occurrence skip** via the `while next <= today` loop that advances stepOnce() until a future date emerges. This prevents past-due tasks from generating a backlog of stale dates (the "延々と出続けるのを防ぐ" objective). The fallback for `due` unset (use today as base) is documented. The design explicitly states that this is a deterministic fast-forward, not a "single step then clamp" behavior. **OQ-1 resolution is sound and implementable.**

3. **OQ-2 (month-end clamp + weekday next-occurrence) resolved with date-math rigor**: The design specifies month-end clamping explicitly: `every month on 31` in February produces `min(31, daysInMonth(base)) = 28/29` (leap-aware via date-fns). `last` keyword produces `lastDayOfMonth(base)`. Weekday next-occurrence is defined as "起点の翌日以降で最も近い該当曜日", with multiple weekdays selecting the nearest match. Week-crossing is handled naturally by date-fns. **OQ-2 resolution is complete and algorithmically precise.**

4. **Single-file rollForward with sound xN persistence**: rollForward() updates `due`, `status` (→todo), `last_done` (→today) in-place per FR-E4, avoiding file proliferation and naming collisions (the DECIDED constraint). The xN counter is persisted **in the repeat string itself** (e.g., `x3` → `x2`), eliminating the need for a separate frontmatter field and maintaining Dataview readability (the Decided principle). When count reaches 1, the design produces `{ kind: 'recurrence-ended', task }` with `status:done` and `repeat` stripped of `xN`. When `until` is exceeded, `next == null` triggers the same terminal state. **FR-E4/E5 logic is architecturally sound with minimal schema footprint.**

5. **Pure boundary respected — no I/O leakage**: The design explicitly states that parse/nextDue/rollForward are pure functions with no file I/O. Persistence is delegated to TaskService→task-core.Repository. State transitions are delegated to U-state-management. The only external dependency is date-fns for date arithmetic (ADR-5). This satisfies the library-unit purity constraint and enables deep unit testing without mocking. **Boundary discipline is exemplary.**

6. **Component-methods signature alignment verified**: The business-logic-model § 1-4 methods (parse → RecurrenceRule; nextDue → Date|null; rollForward → CompleteOutcome; describe → string) match the component-methods.md C5 RecurrenceEngine signatures exactly. The shared `RecurrenceRule` type structure (base: interval|weekly-days|monthly-day; end: until|count) aligns with domain-entities.md. **Cross-reference soundness confirmed.**

7. **Appropriate depth for Standard mvp with thorough test mandate**: The design defers low-level implementation details (exact date-fns functions, regex patterns for parse) to code-generation while nailing down all edge-case semantics (leap years, week crossing, heavy delay, terminal conditions). The team-practices Testing Posture mandate ("厚くテスト — 日付境界・月末・うるう年・週跨ぎ・大幅遅延・until/xN 境界") is explicitly cited in business-rules R13. **A developer can implement from this without guessing critical logic.**

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | business-logic-model § 2, business-rules R9 | The xN decrement approach ("完了ごとに repeat 文字列内の N を減算") is architecturally sound but the text mechanics (string manipulation vs parse→decrement→re-serialize) are not pinned | Acceptable deferral to code-generation — the design states *what* happens (xN → x(N-1) in repeat field) without prescribing *how* the string is rewritten. A developer can choose between regex substitution or full parse-modify-reserialize cycles. Either implementation satisfies the contract. Not blocking. |
| 2 | Minor | business-logic-model § 3, business-rules R10/R11 | rollForward references `type: recurrence` assertion (R11: "repeat 解除時は type:task に戻す") but the design does not specify *where* type is toggled — in rollForward itself or in the calling TaskService layer | This is a boundary ambiguity: if rollForward is truly pure (no side effects beyond returning the updated task object), then the `type` toggle belongs in TaskService.complete() or TaskService.setRecurrence(), not in rollForward. The business-rules R11 correctly flags the invariant ("repeat を持つタスクは type:recurrence") but the enforcement point is not pinned. Recommend: clarify in code-generation that rollForward returns the task with `repeat` possibly stripped (on recurrence-ended), and the caller (TaskService or U-state-management's done handler) is responsible for syncing `type` with `repeat` presence. Not architecturally unsound — just a layer-responsibility ambiguity. |
| 3 | Minor | business-logic-model § 2 stepOnce pseudocode | `weekly-days` branch reads "次に来る weekdays の最小の日 (from の翌日以降)" but does not specify behavior when `from` itself is a weekday in the list (e.g., `repeat: every mon,thu` and from=Monday) — does it return "next Monday" (7 days later) or "today"? | The prose "翌日以降" implies "strictly after from", so Monday→Thursday→Monday is the intended cycle. This is the sane interpretation (completing a recurrence on Monday shouldn't immediately re-schedule it for the same Monday). Recommend: confirm in code-generation tests that `nextDay(from, weekday)` always returns a future date, never `from` itself. date-fns `nextDay` semantics should handle this, but edge-case test coverage is critical given the team-practices test mandate. Not blocking — the interpretation is sound, just not explicitly guarded in the design text. |

### Summary

The functional design for U-recurrence is **complete, coherent, and implementable without architectural guidance beyond this document**. Every requirement (FR-E1..E6), every open question (OQ-1 rollforward, OQ-2 month-end/weekday), and every shared contract (components.md C5, component-methods.md signatures, requirements.md stories US-3.1/3.2) is addressed with algorithmic precision. The grammar is exhaustively specified. The date-math edge cases (leap years, month-end clamp, week crossing, missed-occurrence skip) are pinned with deterministic rules. The single-file rollForward with in-string xN persistence is architecturally elegant and schema-minimal. The pure-function boundary is respected. The test mandate is explicit.

The three findings are legitimate layer-responsibility clarifications (xN string mechanics, type-field ownership, weekday "翌日" strictness) that code-generation will resolve — none expose circular dependencies, broken cross-references, or unachievable designs. A developer implementing this can trace a request end-to-end: user completes a recurrence task → U-state-management done handler calls U-recurrence rollForward(task) → rollForward parses repeat, computes nextDue via schedule-based stepOnce with missed-skip loop, updates due/status/last_done, decrements xN or strips it on terminal → returns the updated task object → calling layer persists via task-core Repository. The flow is deterministic, testable, and production-ready.

**READY for code-generation.** This is the project's highest-risk unit (最重要/最リスク per unit-of-work) and the design meets that bar — the date-math complexity is nailed down, the grammar is exhaustive, and the test surface is clearly scoped.
