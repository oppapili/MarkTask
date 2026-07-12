# Business Logic Model — U-query-search

> Construction / functional-design（unit: U-query-search, library）。上流参照: `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/units-generation/unit-of-work-story-map.md`, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-F）, `../../../inception/application-design/components.md`（components）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/application-design/services.md`（services）。
> 対象: QueryService（filter / sort / search）。列挙は task-core.Repository に委譲。

## 1. list フロー（US-1.3, US-5.1 / FR-F1,F3,F4）

```
list(filter, sort=defaultSort):
  tasks = repo.list()                 # tasksDir 直下のみ（.trash/・archive は除外, task-core）
  if filter.includeArchived: tasks += repo.listArchived()   # --archived 時のみ
  out = tasks.filter(t => matches(t, filter))
  return Ok(sortTasks(out, sort))
```

### matches（AND 合成）
```
matches(t, f):
  (f.status?   ⇒ t.status ∈ f.status)   AND
  (f.dueBefore?⇒ t.due != null AND t.due <= f.dueBefore) AND
  (f.priority? ⇒ t.priority ∈ f.priority) AND
  (f.tags?     ⇒ f.tags ⊆ t.tags)        AND
  (f.project?  ⇒ t.project == f.project)
```
- 未指定の条件は無視（AND の恒真）。全条件 AND。

### sortTasks（既定 due 昇順, FR-F3）
```
defaultSort = {key: 'due', dir: 'asc', nullsLast: true}
sortTasks(list, sort):
  compare by sort.key; due 未設定は末尾（nullsLast）; 安定ソート（同値は created 昇順を副キー）
```
- 対応キー: due / priority(high>med>low の意味順) / created / status。

## 2. search フロー（US-5.1 / FR-F2）

```
search(query):
  tasks = repo.list()
  q = normalize(query)                # 小文字化・trim
  hits = tasks.filter(t => contains(normalize(t.title), q) OR contains(normalize(t.body), q))
  return Ok(sortTasks(hits, defaultSort))
```
- 既定は大文字小文字を無視した部分一致。タイトル（＝ファイル名）と本文を対象。

## 3. 出力

- QueryService は Task[] を返すだけ（整形は OutputFormatter / アダプタ）。`--json` 時も同じ Task[] を JSON 化。

## 4. 性能（NFR-3, 数千件）

- `repo.list()` は tasksDir の1階層走査＋逐次 decode。数千件で実用速度を満たすため、フィルタ/検索はインメモリの単純走査で十分（インデックス DB は持たない, ADR-4）。必要なら将来キャッシュ（可逆）。

## 5. エラー

- `io`（列挙/decode 失敗, task-core 正規化）を `Result` で返す。検索 0 件はエラーでなく空配列。

<!-- Text fallback: U-query-searchはrepo.list()(トラッシュ/アーカイブ除外)を母集合に、AND合成のmatchesでフィルタ、既定due昇順(未設定末尾)でソート。searchはタイトル+本文の大小無視部分一致。Task[]を返し整形はアダプタ側。数千件はインメモリ走査で対応、DB非依存。 -->

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:01:23Z
**Iteration:** 1

### Strengths

1. **Clean separation of concerns with zero side effects**: QueryService is a pure filter/sort/search layer that reads from Repository and returns Task[] only. No file I/O, no formatting, no state mutation. This design is maximally testable — every function can be unit-tested with mock Task[] inputs without filesystem setup. The explicit delegation to Repository (for enumeration) and OutputFormatter (for rendering) satisfies the single-responsibility principle and matches the approved component boundaries from application-design.

2. **Complete FR coverage with explicit traceability**: Every verification criterion passes:
   - FR-F1 (filters): AND-composition over status/due/priority/tags/project in `matches()` with clear nullability semantics (unspecified = ignore)
   - FR-F2 (search): case-insensitive substring match on title+body via `normalize()`
   - FR-F3 (default sort): due ascending with nullsLast, stable sort via created secondary key
   - FR-F4 (trash/archive exclusion): `repo.list()` excludes by default, `includeArchived` opt-in for `listArchived()`
   
   The business-logic-model.md flows directly implement the requirements with no gaps.

3. **Signatures match component-methods contract exactly**: The component-methods.md C6 contract declares `list(filter: TaskFilter, sort?: Sort): Result<Task[]>` and `search(query: string): Result<Task[]>`. The domain-entities.md interfaces (TaskFilter with status/dueBefore/priority/tags/project/includeArchived, Sort with key/dir/nullsLast) match the method signatures. No shape mismatches, no undeclared parameters.

4. **Performance strategy aligns with NFR-3 and ADR-4**: The in-memory scan approach (no index DB) is explicitly documented in §4 with ADR-4 reference. For mvp at Standard depth with "thousands of tasks" scale target, this is the correct pragmatic choice — adding a search index would introduce complexity and dependencies (SQLite FTS, Lunr.js) without proven need. The reversibility note ("必要なら将来キャッシュ（可逆）") acknowledges the escape hatch if scale exceeds assumptions. The constraint is honest and testable.

5. **Business rules are complete and testable**: business-rules.md R1-R8 cover all decision points with clear trigger/logic/violation semantics:
   - R1 (target set): active tasks by default, trash/archive excluded unless opt-in
   - R2 (AND composition): multiple filters intersect
   - R3 (tags subset): `f.tags ⊆ t.tags` for inclusion match
   - R4 (due filter): only applies to tasks with due set, `<=` comparison
   - R5 (default sort): due asc, nullsLast, stable via created
   - R6 (search): 0 results = empty array, not error
   - R7 (output separation): Task[] only, formatting is adapter responsibility
   - R8 (DB independence): file-scan only, NFR-3 scale
   
   Every rule maps to a testable assertion. A developer can implement and write unit tests directly from these rules without guessing.

6. **Error handling is consistent with shared Result<T> pattern**: business-logic-model.md §5 states `Result` return for I/O errors (propagated from Repository) and empty array for 0 search results (not an error). This matches ADR-9 error-handling strategy and component-methods.md C6 signatures. No silent failures, no uncaught exceptions at the service boundary.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | business-logic-model.md §1 `matches` | The `dueBefore` filter applies `t.due != null AND t.due <= f.dueBefore` but the boundary case (tasks with `due` exactly equal to `dueBefore`) is included (`<=`). This is consistent with "due before or on" interpretation, but requirements FR-F1 doesn't specify inclusive vs exclusive semantics | Acceptable for mvp — the `<=` choice is reasonable (include tasks due today when filtering "due before tomorrow"). If user feedback reveals confusion, functional-design iteration 2 can clarify or add `dueAfter` complement. Not blocking implementation. |
| 2 | Minor | business-logic-model.md §1 `sortTasks` | The stable sort fallback ("同値は created 昇順を副キー") is documented in prose but the pseudocode doesn't show the secondary key application | Clarify in pseudocode or accept as implementation note. The intent is clear (deterministic ordering for equal due values), and any TypeScript sort implementation can trivially add `|| a.created - b.created` as a tiebreaker. Not a design flaw, just a presentation detail. |

### Summary

The functional design for U-query-search is **implementable without further clarification**. A developer can read the three artifacts (business-logic-model.md, business-rules.md, domain-entities.md), understand the data flow (Repository.list → filter via matches → sort via sortTasks → return Task[]), implement the pure functions, and write comprehensive unit tests. The design respects all boundaries: no file I/O in QueryService (delegated to Repository), no formatting (delegated to OutputFormatter), no state mutation (pure filtering). Error handling is explicit (Result<T> for I/O, empty array for 0 hits). Performance strategy (in-memory scan) is appropriate for mvp scale and reversible if needed.

The two findings are edge-case clarifications (inclusive `<=` semantics for dueBefore, stable-sort tiebreaker details) that do not expose architectural unsoundness or block code generation. The core algorithms — AND-composition filter, case-insensitive substring search, nullsLast sort — are unambiguous and ready to implement.

**READY to advance to code-generation.** QueryService can be implemented and tested independently of other units (depends only on task-core Repository for enumeration, which is the walking skeleton dependency already satisfied).
