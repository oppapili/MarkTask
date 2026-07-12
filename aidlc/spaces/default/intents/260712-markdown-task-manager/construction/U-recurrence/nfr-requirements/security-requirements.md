# Security Requirements — U-recurrence

> Construction / nfr-requirements（unit: U-recurrence, library）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-E）。
> 前提: ローカル・単一ユーザー・ネットワーク非公開。中核ロジックゆえ堅牢性を重視。

## セキュリティ要件

- **SEC-1（記法パースの安全性）**: `repeat` 文字列は**式として評価しない**。トークン化＋許容パターンの照合のみ（eval/Function 生成禁止）。不正記法は `invalid-repeat` で拒否（business-rules R2）。
- **SEC-2（ReDoS 回避）**: 正規表現を使う場合は破滅的バックトラッキングを避ける限定的なパターンにする。あるいは手続き的パーサを用いる。長大/悪意ある `repeat` でも停止する。
- **SEC-3（日付計算の健全性）**: 月末 clamp・うるう年・週跨ぎ・大幅遅延の missed スキップで無限ループを起こさない（`stepOnce` は必ず前進し、終了条件で停止）。境界をユニットテストで担保（team-practices）。
- **SEC-4（純粋・副作用なし）**: parse/nextDue/rollForward は I/O を持たない。永続化は task-core（原子的）。破損経路なし。
- **SEC-5（状態の一貫性）**: `xN` の減算・`until` 判定で、完了のたびに単調に終了へ近づく（回数/日付の後退がない）。

## 脅威・非該当

- ネットワーク/認証は非該当。主眼は「信頼できない記法文字列を安全にパースし、日付計算で停止性・正確性を保つ」こと。

## テスト観点（最重要ユニット・厚め）

- 不正記法拒否、ReDoS 耐性、月末/うるう年/週跨ぎ、大幅遅延の未来スキップ、until/xN 境界、無限ループ非発生。


## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:46:37Z
**Iteration:** 1

### Strengths

1. **SEC-1 (no eval/Function) is explicit and architecturally enforced**: The requirement mandates token-based parsing with pattern matching only, explicitly forbidding eval/Function generation. The tech-stack-decisions.md pairs this with "手続き的パーサ（自前・軽量）" — a procedural parser written in-house. This combination eliminates code-injection risk at the architecture level. The upstream business-logic-model § 1 parse() algorithm shows deterministic token matching (every N unit / every weekday / every month on...) with no dynamic evaluation paths. **SEC-1 is verifiable and blocks the primary recurrence-parsing attack vector.**

2. **SEC-2 (ReDoS avoidance) is addressed with implementation guidance**: The requirement states "正規表現を使う場合は破滅的バックトラッキングを避ける限定的なパターンにする。あるいは手続き的パーサを用いる。" The tech-stack decision chose the procedural parser path, which inherently avoids ReDoS (no regex backtracking in a deterministic state machine). If regex is used for token normalization (whitespace, case), the requirement pins it to "限定的なパターン" — bounded patterns without nested quantifiers. The business-logic-model § 1 shows keyword matching and numeric extraction, which can be done with simple string operations or atomic regex (no catastrophic backtracking). **SEC-2 is architecturally sound — the procedural parser choice is the strongest mitigation, and the fallback regex constraint is explicit.**

3. **SEC-3 (date-math termination, no infinite loops) is algorithmically guaranteed**: The requirement demands "無限ループを起こさない（`stepOnce` は必ず前進し、終了条件で停止）". The business-logic-model § 2 nextDue() algorithm shows the termination contract explicitly: (a) stepOnce(rule, from) always returns a date strictly after `from` (interval adds positive N; weekly-days returns "翌日以降の最小の該当日"; monthly-day adds 1 month then clamps to valid day); (b) the `while next <= today` loop in nextDue() has monotonic progress because stepOnce() is strictly increasing; (c) terminal conditions (until/xN) are checked after each step and return null to halt. The business-rules R5 confirms "今日より後になる最初の発生日まで加算を繰り返す" with the implicit guarantee that the loop terminates when `next > today`. **SEC-3 is verified — the algorithm has no infinite-loop paths because stepOnce() is monotonic and until/xN are deterministic halting conditions.**

4. **SEC-4 (purity, no I/O) is a first-class boundary constraint**: The requirement states "parse/nextDue/rollForward は I/O を持たない。永続化は task-core（原子的）。破損経路なし。" The business-logic-model § 5 echoes this: "純粋計算 — parse/nextDue/rollForward はファイル I/O を持たない。永続化は TaskService→task-core.Repository。" The business-rules R12 repeats the same boundary. The tech-stack decision confines date-fns (a pure library) within RecurrenceEngine, with no network/file dependencies. **SEC-4 is architecturally enforced — the library unit has no I/O surface, and persistence is delegated to U-task-core (which has atomic write guarantees per NFR-1).**

5. **SEC-5 (monotonic progress to termination) is satisfied by xN/until semantics**: The requirement demands "完了のたびに単調に終了へ近づく（回数/日付の後退がない）". The business-logic-model § 3 rollForward() shows: (a) xN decrements on each completion (x3→x2→x1→終了), which is strictly monotonic toward zero; (b) until is checked against an increasing `next` date (stepOnce() is monotonic per SEC-3), so the sequence marches toward the until threshold; (c) the rollForward() algorithm explicitly checks `if rule.end.count <= 1` and `if next == null` to produce `recurrence-ended`, guaranteeing terminal states. **SEC-5 is verified — the xN counter decreases monotonically, and the until date is approached monotonically via stepOnce(). No backtracking paths exist.**

6. **Test emphasis aligns with team-practices and the risk profile**: The "テスト観点" section lists "不正記法拒否, ReDoS 耐性, 月末/うるう年/週跨ぎ, 大幅遅延の未来スキップ, until/xN 境界, 無限ループ非発生" — these are the exact boundaries the business-rules R13 mandate for thick testing. The team-practices Testing Posture emphasizes core logic (file I/O, state transitions, recurrence parser, next-occurrence calculation) with thick unit tests, which matches the SEC-3/SEC-5 guarantees. **Test coverage is appropriately scoped to the highest-risk paths in the riskiest unit.**

7. **Tech-stack decisions are minimal and reversible**: The tech-stack-decisions.md limits external dependencies to date-fns only (ADR-5), with the recurrence parser written in-house. This satisfies the project.md Decided constraint "不要な依存を増やさない" and the ADR-5 reversibility principle (date-fns is confined within RecurrenceEngine and can be swapped). The bun:test choice aligns with the existing bun runtime (ADR-1). **Dependency discipline is exemplary — no heavy parser-generator libraries, no eval-based DSL engines.**

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | security-requirements.md SEC-2, tech-stack-decisions.md | ReDoS mitigation relies on procedural parser choice, but the security requirement hedges with "正規表現を使う場合は..." without pinning whether regex will be used for tokenization/normalization | Acceptable hedge for Standard depth — the procedural parser is the primary path, and the regex constraint is present as a fallback. Code-generation should confirm: if regex is used for whitespace normalization or keyword extraction, patterns must be atomic (no nested `*` or `+`). Not architecturally unsound — just a "trust but verify" note for implementation. |
| 2 | Minor | security-requirements.md SEC-3, business-logic-model § 2 | The "無限ループ非発生" guarantee depends on stepOnce() being strictly monotonic, but the business-logic-model § 2 pseudocode for weekly-days does not explicitly state "returns a date > from" — it says "次に来る weekdays の最小の日 (from の翌日以降)" which *implies* strictly-after but is not *explicit* | The prose "翌日以降" is unambiguous in Japanese (strictly after tomorrow, not today), so the monotonicity guarantee holds. Recommend: code-generation should add a comment or assertion that `nextDay(from, weekday)` returns a date > from, and unit tests should cover the edge case where from itself is a weekday in the list (e.g., completing a Monday recurrence on Monday should schedule Thursday, not re-Monday). The functional-design review Finding #3 flags this same ambiguity. Not blocking — the semantic intent is sound. |
| 3 | Minor | security-requirements.md, tech-stack-decisions.md | The security requirements do not explicitly address integer overflow in xN decrement or date arithmetic (e.g., `every 1 day x999999999` or `addMonths(date, 1e9)`) | This is a reasonable deferral to language/library safety: TypeScript numbers are IEEE 754 doubles (safe integer range ±2^53), and date-fns addMonths/addYears will throw or clamp on absurd inputs. The business-rules R2 mandates rejection of malformed input, which would catch `x999999999` as unreasonable. Recommend: code-generation should add input validation (e.g., xN count ≤ 10000, interval N ≤ 365) as a defense-in-depth measure. Not architecturally blocking — the attack surface is tiny (local single-user tool), and the mitigation is a simple guard. |

### Summary

The NFR requirements for U-recurrence are **architecturally sound and implementation-ready**. Every security concern raised in the review criteria is addressed:

- **(a) Real risks of parsing untrusted repeat strings**: SEC-1 forbids eval/Function (enforced by procedural parser choice). SEC-2 avoids ReDoS (procedural parser + bounded regex fallback). SEC-3 guarantees termination (stepOnce() monotonicity + deterministic halting). SEC-4 ensures purity (no I/O leakage). SEC-5 ensures monotonic progress (xN decrements, until approaches). The upstream business-logic-model § 1-3 and business-rules R1-R13 trace cleanly to these requirements. **FR-E is fully covered.**

- **(b) Tech-stack: date-fns only + self-written parser**: tech-stack-decisions.md explicitly states "date-fns のみ" and "手続き的パーサ（自前・軽量）". No heavy parser-generator dependencies (yacc, PEG.js, Chevrotain) are introduced, satisfying the project.md Decided constraint "不要な依存を増やさない". ADR-5 reversibility is respected (date-fns confined within RecurrenceEngine). **Tech-stack decisions align with the architecture principles.**

- **(c) Test emphasis on boundaries**: The "テスト観点" section explicitly lists month-end, leap year, week-crossing, overdue/missed-skip, until/xN boundaries, and no-infinite-loop as test focus areas. This matches team-practices Testing Posture ("コア重点のテスト方針 — ファイル I/O・状態遷移・recurrence パーサ・次回発生日算出にユニットテストを厚く") and business-rules R13. **Test coverage is appropriately scoped to the risk profile.**

The three findings are legitimate defensive-programming notes (regex usage clarity, weekday monotonicity explicitness, absurd-input guards) that code-generation will resolve — none expose circular dependencies, unimplementable designs, or missing security boundaries. A developer implementing this can trace the security contract end-to-end: user provides `repeat` string → parse() tokenizes without eval → invalid input rejected per R2 → nextDue() computes via monotonic stepOnce() with deterministic termination → rollForward() updates state purely with monotonic xN/until progress → task-core persists atomically per NFR-1. The flow has no code-injection, no ReDoS, no infinite loops, no I/O leakage, no state corruption.

**READY for code-generation.** This is the highest-risk unit in the project (最重要/最リスク per unit-of-work) and the security requirements meet that bar — every attack vector specific to recurrence parsing and date arithmetic is explicitly mitigated with verifiable constraints.
