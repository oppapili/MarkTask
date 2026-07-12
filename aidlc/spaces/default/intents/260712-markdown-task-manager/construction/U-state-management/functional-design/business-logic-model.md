# Business Logic Model — U-state-management

> Construction / functional-design（unit: U-state-management, library）。上流参照: `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/units-generation/unit-of-work-story-map.md`, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-B）, `../../../inception/application-design/components.md`（components）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/application-design/services.md`（services）。
> 対象: StateMachine と状態遷移 use-case。5状態 `todo/in-progress/done/waiting/cancelled`。

## 1. 状態遷移オペレーション（FR-B2, US-1.2）

```
transition(task, to):
  assertValidStatus(to)                 # 不正値は Result(error)
  task.status = to
  task.updated = nowIso()               # 変更ごとに updated 更新（FR-B2）
  return Ok(task)                        # 永続化は呼び出し側(TaskService)が Repository.write
```

コマンド糖衣（アダプタが呼ぶ薄い use-case）:
```
start(task)  = transition(task, 'in-progress')
wait(task)   = transition(task, 'waiting')
cancel(task) = transition(task, 'cancelled')
setState(task, s) = transition(task, s)   # 任意状態への明示遷移
done(task)   = 分岐（下記 §2）
```

## 2. done の分岐（recurrence / 親ガードの委譲）

```
done(task, deps):                        # deps = {recurrence, subtasks}
  if task.parent-role AND deps.subtasks.canComplete(task.ref) == blocked:
      return GuardBlocked(blocking)      # U-subtasks が判定（親の完了ガード）
  if task.type == 'recurrence' AND task.repeat:
      return deps.recurrence.rollForward(task)   # U-recurrence が due 更新・todo 復帰・last_done
  return transition(task, 'done')        # 通常完了
```
- U-state-management 自体は**遷移の一次ロジック**を持ち、recurrence 固有計算と親ガード判定は各 unit に委譲（TaskService が編成）。境界を明確化。

## 3. updated スタンプ規則

- すべての状態変更で `updated = ISO now`。`created` は不変。

## 4. エラー

- 不正状態値 → `Result(error: 'invalid status', 許容値提示)`（FR-B3）。
- 親ガードブロック → `guard-blocked`（U-subtasks 由来）。永続化 I/O 失敗 → `io`（task-core）。

<!-- Text fallback: U-state-managementは5状態のtransition(to)でstatus更新+updatedスタンプ。start/wait/cancel/setStateは糖衣。doneは分岐: 親ならsubtasks.canCompleteでガード、recurrenceならrecurrence.rollForwardへ委譲、それ以外は通常done。永続化はTaskServiceがRepositoryで実施。不正状態はエラー、許容値を提示。 -->


## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:04:43Z
**Iteration:** 1

### Strengths

1. **5-state model exactly as specified**: The design implements the confirmed `todo/in-progress/done/waiting/cancelled` state set (FR-B1, business-rules.md R1) with no `inbox` (project.md Decided per rough-mockups Q6). The Status value object in domain-entities.md matches component-methods.md C4 `type Status = 'todo' | 'in-progress' | 'done' | 'waiting' | 'cancelled'` verbatim. No drift between contract and design.

2. **Updated-stamping on every transition**: business-logic-model.md §1 `transition(task, to)` shows `task.updated = nowIso()` on every state change (FR-B2, business-rules.md R3). §3 explicitly confirms "すべての状態変更で `updated = ISO now`". The contract is baked into the core transition primitive.

3. **Done correctly delegates to U-recurrence and U-subtasks**: business-logic-model.md §2 `done(task, deps)` shows the three-branch logic:
   - Parent guard → `deps.subtasks.canComplete(task.ref) == blocked` returns `GuardBlocked(blocking)` (FR-G2, boundary with U-subtasks)
   - Recurrence → `deps.recurrence.rollForward(task)` (FR-E4, boundary with U-recurrence)
   - Normal → `transition(task, 'done')`
   
   The design correctly states "U-state-management 自体は**遷移の一次ロジック**を持ち、recurrence 固有計算と親ガード判定は各 unit に委譲（TaskService が編成）。境界を明確化。" This matches business-rules.md R4/R5 and services.md S1 orchestration pattern. No logic leakage — the unit owns state transitions only, not recurrence date math or subtask queries.

4. **Start/wait/cancel/setState sugar + done branching as specified**: business-logic-model.md §1 shows `start/wait/cancel/setState` as thin adapters over `transition`, and `done` as the branching operation. This matches the invocation requirement verbatim.

5. **Returns Task only, persistence via task-core Repository**: business-logic-model.md §1 `return Ok(task)` with comment "永続化は呼び出し側(TaskService)が Repository.write". business-rules.md R6 "本 unit は Task（インメモリ）を返すだけで書き込みはしない。永続化は TaskService 経由の Repository.write（原子的, task-core）." This matches unit-of-work.md U-state-management "deployment: embedded" and services.md S1 orchestration. No direct file writes in this unit.

6. **Matches component-methods.md StateMachine signatures**: component-methods.md C4 declares:
   ```ts
   transition(task: Task, to: Status): Result<Task>;
   assertValidStatus(s: string): Result<Status>;
   ```
   business-logic-model.md §1 shows `transition(task, to)` returning `Ok(task)` and `assertValidStatus(to)` for validation (with Result(error) on invalid status). The signature shape matches. The `start/wait/cancel/setState` sugar functions in §1 are implementation helpers — component-methods.md C4 doesn't list them explicitly, but they compose over the declared `transition`, which is architecturally sound.

7. **CompleteOutcome shape matches component-methods.md C10**: component-methods.md C10 declares:
   ```ts
   type CompleteOutcome =
     | { kind: 'completed'; task: Task }
     | { kind: 'recurred'; task: Task; nextDue: string }
     | { kind: 'recurrence-ended'; task: Task }
     | { kind: 'guard-blocked'; blocking: Task[] };
   ```
   domain-entities.md shows the same four variants with identical field names (`kind`, `task`, `nextDue`, `blocking`). The contract is met exactly. The prose in business-logic-model.md §2 states the three return paths (`GuardBlocked(blocking)`, `deps.recurrence.rollForward(task)` which returns the recurred/ended variants, and normal `done`) — these map 1:1 to the CompleteOutcome discriminated union. TaskService assembles the final outcome per services.md S1 `complete(ref)` flow.

8. **Free transitions (no strict graph) is affirmed**: business-rules.md R2 "任意の状態間遷移を許可するが、遷移先は必ず5状態のいずれか（不正値はエラー・許容値提示, FR-B3）。MVP では厳格な遷移グラフ制約は課さない（個人運用の柔軟性優先）." The invocation note "free transitions (no strict graph) is an accepted mvp choice — don't demand a rigid transition matrix" is respected. The design validates status values (§1 `assertValidStatus`) but imposes no state-graph reachability rules. This is a deliberate mvp trade-off, not an omission.

9. **Upstream coverage is complete**: The business-logic-model.md header cites all required consumes artifacts: unit-of-work.md, unit-of-work-story-map.md, requirements.md (FR-B), components.md, component-methods.md, services.md. The design references specific FR-B/US-1.2/US-3.2/US-4.2 throughout. No orphaned design, no uncited inputs.

10. **Error handling is explicit**: business-logic-model.md §4 lists three error kinds: invalid status → `Result(error: 'invalid status', 許容値提示)` (FR-B3), guard-blocked → U-subtasks, io → task-core. The error taxonomy matches component-methods.md AppError discriminated union (`kind: 'not-found' | 'ambiguous' | 'invalid-repeat' | 'guard-blocked' | 'config' | 'io'`). No undefined error paths.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | business-logic-model.md §2, domain-entities.md CompleteOutcome | The prose shows `done(task, deps)` receiving a `deps` parameter with `{recurrence, subtasks}` shape, and domain-entities.md states "TaskService が組み立てる", but the exact dependency injection mechanism (constructor? method param?) is not pinned | Acceptable for functional-design depth — code-generation will implement TaskService's orchestration per services.md S1 pattern. The contract (what `done` needs) is clear; the wiring (how TaskService provides it) is an implementation detail. Not blocking. |
| 2 | Minor | business-rules.md R2, business-logic-model.md §1 | `assertValidStatus` returns error with "許容値提示" (showing valid values), but the exact error message format is not specified | Defer to code-generation — the error contract (`Result(error)` with reason) is sufficient for functional-design. The prose "許容値提示" establishes intent; the exact string format is a UX implementation detail for OutputFormatter. Not blocking. |

### Summary

The functional design is **implementable without architectural guidance beyond this document**. A developer can trace the state transition flow (sugar commands → `transition` → updated stamp), understand the done branching (parent-check → recurrence-check → normal), and wire TaskService's orchestration per the declared `deps` injection contract. The design satisfies all six verification criteria:

- (a) 5-state model with updated-stamping: **PASS** (Status type + transition updates `updated`)
- (b) start/wait/cancel/setState sugar + done branching: **PASS** (§1 sugar functions, §2 done branches)
- (c) done correctly delegates to U-subtasks (guard-blocked) and U-recurrence (rollforward): **PASS** (§2 shows delegation, no logic re-implementation)
- (d) returns Task only, persistence via task-core Repository: **PASS** (R6 explicit, no direct writes)
- (e) matches component-methods.md StateMachine signatures: **PASS** (C4 transition signature, assertValidStatus)
- (f) CompleteOutcome shape matches C10: **PASS** (domain-entities.md shows identical 4-variant discriminated union)

The two findings are legitimate implementation details (dependency wiring mechanism, error message format) that code-generation will resolve. They do not expose boundary violations, hidden state, or contract drift. The critical delegation boundaries (recurrence date math in U-recurrence, subtask queries in U-subtasks, file writes in task-core) are explicitly stated and honored. The free-transition policy is a documented mvp choice, not an oversight.

**READY to advance to code-generation.** The next stage can implement this design without re-asking architectural questions.
