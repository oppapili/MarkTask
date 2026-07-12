# Security Requirements — U-state-management

> Construction / nfr-requirements（unit: U-state-management, library）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-B）。
> 前提: ローカル・単一ユーザー・ネットワーク非公開。

## セキュリティ要件

- **SEC-1（入力検証）**: 状態遷移先は5状態の許容集合のみを受理し、不正値は拒否（business-rules R1/R2, FR-B3）。任意文字列を status に書き込ませない。
- **SEC-2（純粋・副作用なし）**: StateMachine は Task を受け取り Task を返すのみで、ファイル I/O・書込を持たない。永続化は task-core（原子的, NFR-1）に委譲＝本ユニット由来の破損経路なし。
- **SEC-3（委譲の健全性）**: done 分岐で U-subtasks/U-recurrence に委譲する際も、状態の一次判定のみを担い、他ユニットのロジックを再実装しない（境界の明確化）。

## 脅威・非該当

- ネットワーク/認証は非該当。主眼は「不正状態値の拒否」と「副作用を持たないこと」。

## テスト観点

- 不正 status の拒否、updated スタンプ、done 分岐（通常/recurrence/親ガード）の一次判定をユニットテスト（team-practices コア重点）。


## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:44:02Z
**Iteration:** 1

### Strengths

1. **Precise input validation scoped to library boundary**: SEC-1 correctly validates state transitions against the 5-state set (`todo/in-progress/done/waiting/cancelled`) per business-rules.md R1/R2 and FR-B3. The requirement "任意文字列を status に書き込ませない" directly addresses the only attack surface a pure state-transition library has — rejecting malformed input that would corrupt the state model. No over-reach into network/auth (correctly marked 非該当).

2. **Zero side-effects documented and enforced**: SEC-2 states "StateMachine は Task を受け取り Task を返すのみで、ファイル I/O・書込を持たない" with explicit delegation "永続化は task-core（原子的, NFR-1）に委譲＝本ユニット由来の破損経路なし". This traces to business-rules.md R6 and functional-design business-logic-model.md §1 "永続化は呼び出し側(TaskService)が Repository.write". The security posture is correct for a library unit with no I/O — no file corruption path exists in this unit's code.

3. **Delegation boundary soundness**: SEC-3 addresses the `done` branching delegation to U-subtasks/U-recurrence, confirming the unit "状態の一次判定のみを担い、他ユニットのロジックを再実装しない（境界の明確化）". This traces to business-logic-model.md §2 and business-rules.md R4/R5. The security concern here is logic re-implementation creating a dual-write or inconsistent-state scenario — the requirement explicitly blocks that.

4. **Test coverage targets the right risk surface**: "不正 status の拒否、updated スタンプ、done 分岐（通常/recurrence/親ガード）の一次判定をユニットテスト" focuses on the three critical invariants: (a) invalid status rejection (SEC-1), (b) updated timestamp correctness (SEC-2 integrity), (c) done delegation correctness (SEC-3). This aligns with team-practices "コア重点のテスト方針" for risk-proportionate coverage.

5. **Local single-user context correctly drives scope**: The "脅威・非該当" section correctly marks network/auth as out-of-scope for "ローカル・単一ユーザー・ネットワーク非公開". This traces to requirements.md FR-H1 (MCP stdio local, non-public) and scope-document.md constraints (personal local tool). No false security theater.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | security-requirements.md SEC-1 | The phrase "不正値は拒否（business-rules R1/R2, FR-B3）" references the validation requirement but does not specify what happens to the Task when rejection occurs (return error without mutating Task? throw? log?). The functional-design business-logic-model.md §1 shows `Result(error)`, but that's not in the security artifact. | Acceptable — the contract is "reject invalid status" and the developer can read business-logic-model.md §4 for the error-handling mechanism (`Result(error: 'invalid status', 許容値提示)`). The security requirement correctly states the invariant (reject); the error-handling protocol is an implementation detail that functional-design covers. Not blocking. |

### Validation Tool Results

No validation tools configured for this stage (`sensors: [required-sections, upstream-coverage, linter, type-check]` apply post-generation). Manual verification performed via cross-reference to functional-design artifacts and requirements.md FR-B.

### Summary

The security requirements correctly scope to the attack surface of a pure state-transition library: input validation (SEC-1), side-effect elimination (SEC-2), and delegation boundary soundness (SEC-3). The requirements trace cleanly to business-rules.md R1/R2/R4/R5/R6 and requirements.md FR-B. The local-single-user context (no network, no auth) is explicitly acknowledged and correctly excludes irrelevant threat categories. The test strategy targets the right invariants (invalid status rejection, updated integrity, done delegation). The tech-stack-decisions.md confirms zero external dependencies and TS union types for compile-time status validation — both strengthen SEC-1 at implementation time.

**READY to advance to code-generation.** A developer can implement SEC-1/SEC-2/SEC-3 with the existing functional-design contracts and traceability to FR-B without architectural re-questioning.
