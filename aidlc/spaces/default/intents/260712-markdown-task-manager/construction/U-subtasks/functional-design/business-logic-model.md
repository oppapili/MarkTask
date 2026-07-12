# Business Logic Model — U-subtasks

> Construction / functional-design（unit: U-subtasks, library）。上流参照: `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/units-generation/unit-of-work-story-map.md`, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-G）, `../../../inception/application-design/components.md`（components）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/application-design/services.md`（services）。
> 対象: SubtaskService（親子逆引き＋完了ガード・再帰）。列挙は task-core.Repository に委譲。

## 1. 子の列挙 children(parentRef)（FR-G3, US-4.2）

```
children(parentRef):
  all = repo.list()                         # task-core
  return Ok(all.filter(t => parseParentRef(t.parent) == parentRef))

parseParentRef(parent):                      # parent = "[[<ref>]]" | undefined
  return parent ? stripWikilink(parent) : null   # "[[20260701-申請対応]]" -> "20260701-申請対応"
```
- 逆引き：全タスクを走査し `parent` が対象を指すものを集める（数百〜数千件でインメモリ走査, NFR-3）。

## 2. 完了ガード canComplete(parentRef)（FR-G2, G4 / OQ-4 確定）

```
canComplete(parentRef, visited={}):
  kids = children(parentRef)
  blocking = []
  for c in kids:
    if isBlocking(c.status): blocking.push(c)
    else if c is 親 (has its own children):        # 再帰（多階層, FR-G4）
       sub = canComplete(c.ref, visited)
       blocking += sub.blocking
  return { ok: blocking.length == 0, blocking }

isBlocking(status):
  return status in {'todo','in-progress','waiting'}   # done / cancelled は非ブロッキング（OQ-4）
```
- **循環保護**: `visited` で訪問済み ref を記録し、`parent` の循環リンクでも無限再帰しない（不正データ耐性）。

## 3. 親完了フローとの結合（U-state-management から呼ばれる）

```
# U-state-management.done() が親タスクに対して:
guard = subtasks.canComplete(task.ref)
if not guard.ok: return { kind:'guard-blocked', blocking: guard.blocking }   # 未完子を提示（FR-G2）
# ok なら通常 done へ（recurrence 分岐は別）
```

## 4. サブタスク作成（US-4.1）

- 子タスクは通常の add に `--parent "[[<親ref>]]"` を付与するだけ（frontmatter `parent`）。作成自体は task-core。本 unit は親子の**解釈**（列挙・ガード）を担う。

## 5. 表示補助

- `list --parent <親>` は children(parentRef) の結果を QueryService/OutputFormatter に渡す（絞り込み表示, FR-G3）。

## 6. 境界・エラー

- 純粋寄り（副作用なし、repo.list を読むのみ）。`io`（列挙失敗）を Result で返す。存在しない親 ref は children 空（エラーにしない）。

<!-- Text fallback: U-subtasksはchildren(parentRef)=repo.listのparent逆引き、canComplete=子がすべてdone/cancelledならok、todo/in-progress/waitingはブロッキング(OQ-4)。多階層は再帰、循環はvisitedで保護。親のdoneはU-state-managementがcanCompleteを呼び未完子があればguard-blocked。作成はtask-coreにparent付与、list --parentで絞り込み。読むだけで副作用なし。 -->

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:15:07Z
**Iteration:** 1

### Strengths

1. **Clean single-source-of-truth for parent-child relationships**: The design achieves DRY by storing `parent` only on the child side (frontmatter wikilink) and computing `children()` via reverse-lookup over `Repository.list`. This eliminates synchronization bugs (no dual writes) and makes the relationship expression natural for wikilink-based Markdown (children reference parent in prose, not vice versa). The Repository owns the enumeration primitive, SubtaskService interprets it — clean boundary.

2. **OQ-4 resolution is sound and explicitly documented**: The `isBlocking(status)` rule correctly implements the requirements decision: `done` and `cancelled` are non-blocking (cancelled children don't prevent parent completion — legitimate for intentionally abandoned subtasks), while `todo`, `in-progress`, and `waiting` are blocking. This matches the domain semantics (a parent shouldn't complete while active work is pending) and is traceable to FR-G2, requirements OQ-4, and business-rules.md R3. The table in domain-entities.md makes the rule immediately verifiable.

3. **Recursive multi-level support with cycle protection**: The `canComplete` algorithm correctly handles FR-G4 (multi-level nesting) by recursing on children that are themselves parents, and guards against malformed data (circular `parent` links) via the `visited` set. The pseudocode shows proper accumulation of `blocking` descendants across levels — a grandchild in `todo` will block the grandparent, as required. Cycle detection is fail-safe: infinite recursion is prevented, and the function can still return a verdict even if part of the tree is malformed.

4. **Pure read-only design with explicit delegation**: SubtaskService holds no state, performs no mutations, and delegates all enumeration to task-core Repository (FR boundary respected). The guard is invoked by U-state-management's `done` handler — the integration point is explicit and matches component-methods.md C10 TaskService `complete()` flow. The Result-based error handling for `io` failures (Repository.list fails) is consistent with the project-wide error strategy.

5. **`--force` override preserves human judgment**: Business-rules.md R6 documents the escape hatch (override guard via explicit `--force` flag), preventing the system from trapping users in unresolvable states. The default is guard-enabled (safe), the override is explicit (intentional) — good human-in-the-loop design.

6. **Handles edge cases gracefully**: Non-existent parent refs don't throw (children() returns empty list, not error) — NFR-2 non-destructive spirit. The `guard-blocked` return type from component-methods includes the blocking list, enabling the CLI/MCP to present actionable feedback (show which children are blocking). This satisfies FR-D4 (human-readable errors with context).

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | business-logic-model.md § 2 | The `visited` cycle-protection pseudocode is mentioned but not shown in the algorithm. The prose says "visited で訪問済み ref を記録" and business-rules R5 says "その枝を打ち切り、可能なら警告", but the canComplete pseudocode doesn't show where `visited[c.ref] = true` is set or where the cycle check `if c.ref in visited: skip` occurs | Add the visited checks to the pseudocode for implementability: `if c.ref in visited: continue` at the loop top, and `visited[c.ref] = true` before recursing. The cycle-warning ("可能なら警告") is optional and can be a logged warning (not blocking). Not a soundness issue — the logic is architecturally correct, just needs the guard explicitly in the code shape |
| 2 | Minor | business-logic-model.md § 3 | The integration prose says U-state-management calls `subtasks.canComplete(task.ref)` when the task being completed is a parent, but the condition for "is this task a parent?" is not stated. Does state-management check `children(task.ref).length > 0` first, or does it unconditionally call canComplete and rely on empty children → ok=true? | Clarify in code-generation: either (a) always call canComplete (cheap when no children), or (b) state-management checks for children first. Option (a) is simpler (one call, no conditional) and correct (empty children → ok=true → no-op). Recommend (a). Not blocking — both work, just document the choice so the developer doesn't guess |

### Summary

The design is **implementable without architectural guidance beyond this document**. A developer can write `children(parentRef)` as a filter over `Repository.list()`, implement `canComplete` with recursive descent and the `isBlocking` rule table, and integrate it into `TaskService.complete()` by checking the guard before transitioning to `done`. The OQ-4 resolution (cancelled is non-blocking, waiting is blocking) is sound and traced to requirements. The visited-set cycle protection is architecturally correct but needs the guard checks added to the pseudocode for literal implementability. The integration point with U-state-management is clear. The pure read-only design respects unit boundaries.

**READY to advance to code-generation.** The two findings are pseudocode completeness (add `visited` guards) and an integration-flow clarification (always-call vs conditional-call) — both are straightforward refinements, not architectural flaws.
