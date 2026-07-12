# Security Requirements — U-subtasks

> Construction / nfr-requirements（unit: U-subtasks, library）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-G）。
> 前提: ローカル・単一ユーザー・ネットワーク非公開。

## セキュリティ要件

- **SEC-1（循環リンク耐性）**: `parent` の循環（不正/手書きデータ）でも `visited` により無限再帰しない（business-rules R5）。停止性を保証。
- **SEC-2（読み取り専用）**: SubtaskService は書込・状態変更をしない（親完了で子を自動変更しない, R7）。データ改変経路なし。
- **SEC-3（不正 parent 耐性）**: 実在しない ref を指す `parent` でも例外を投げず、children 逆引きに現れないだけ（NFR-2 精神・壊れた前提に強い）。
- **SEC-4（列挙の閉じ込め）**: 母集合は task-core.Repository.list（tasksDir 直下）。対象外ディレクトリを走査しない。

## 脅威・非該当

- ネットワーク/認証は非該当。主眼は「循環・不正リンクでの停止性」と「読み取り専用」。

## テスト観点

- 循環リンクでの無限再帰非発生、多階層ガードの再帰、done/cancelled 非ブロッキング（OQ-4）、実在しない parent の安全処理。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:48:58Z
**Iteration:** 1

### Strengths

1. **Correctly scoped for library unit**: The artifact correctly recognizes that U-subtasks is a library (no service boundaries, no network exposure, no authentication layer), and limits security requirements to the real risks: cycle protection (SEC-1), read-only guarantees (SEC-2), tolerance of malformed parent references (SEC-3), and enumeration confinement (SEC-4). This matches the local single-user tool context documented in requirements.md Constraints and the MarkTask mvp scope — there is no over-engineering of network/auth concerns that don't exist.

2. **Cycle-link infinite-recursion protection is explicit and traced**: SEC-1 correctly identifies circular `parent` links as the primary runtime safety risk (business-rules R5), and documents the `visited` set mechanism to guarantee termination. This addresses the scenario where hand-edited or corrupted frontmatter creates cycles (e.g., A→B→C→A). The requirement traces to FR-G/OQ-4 (multi-level subtask nesting) and business-rules R5 (cycle protection), establishing clear provenance.

3. **Read-only constraint prevents unintended side effects**: SEC-2 correctly states that SubtaskService performs no writes or mutations (business-rules R7: "親完了で子を自動 done にはしない"). This aligns with the functional-design business-logic-model §6 (pure read-only, delegates all enumeration to task-core Repository). The absence of a write path eliminates data-tampering risks at this layer — a developer implementing this knows "no mutations means no need to guard write operations."

4. **Tolerates nonexistent parent refs without throwing**: SEC-3 addresses NFR-2 (non-destructive handling of malformed data) by requiring that broken `parent` references don't raise exceptions, they just result in the child not appearing in `children()` results. This is the correct failure mode for wikilink-based references (links can break when files are renamed or deleted by users directly in the vault). Business-rules R8 explicitly documents this case.

5. **Enumeration confinement to task-core scope**: SEC-4 states that the "mother set" (全タスクの集合) comes exclusively from `task-core.Repository.list(tasksDir直下)`, preventing directory-traversal or out-of-scope reads. This bounds the blast radius of the `children()` reverse-lookup and ensures SubtaskService can't accidentally enumerate system files or other vaults.

6. **Test observability is concrete**: The "テスト観点" section lists specific scenarios (cycle non-recursion, multi-level guard recursion, done/cancelled non-blocking per OQ-4, nonexistent parent safe handling) that directly map to SEC-1 through SEC-4. A QA engineer or developer writing tests knows what to cover.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | security-requirements.md SEC-1 | The requirement says `visited` prevents infinite recursion, but doesn't specify what happens when a cycle is detected — does the function log a warning, silently skip the cycle branch, or return a distinct status? Business-rules R5 says "可能なら警告" (warn if possible), but SEC-1 doesn't carry that forward | Clarify in code-generation: either (a) detect cycle and log a warning (業務 console.warn or structured log entry), or (b) silently skip (no warning, just terminate recursion). Recommend (a) for debuggability — if a user hand-edits a cycle, seeing "cycle detected: A→B→A" in logs helps them fix it. Not a soundness issue — termination is guaranteed either way |
| 2 | Minor | tech-stack-decisions.md "備考" | The reverse-lookup performance note ("数百〜数千件で実用速度") traces to NFR-3, but NFR-3 itself is stated as a target ("体感で待たされない範囲") without a concrete millisecond threshold. The tech-stack decision is "list 走査で算出" (linear scan over Repository.list), which is O(n) per call. If `canComplete` is called on a parent with many children, and those children are themselves parents (deep recursion), the cumulative O(n) scans could degrade. The artifact doesn't quantify "実用速度" or state whether caching is needed | Add a performance note: either (a) document the expected n (e.g., "assuming n<5000 tasks, O(n) scan is <50ms on typical hardware"), or (b) defer to performance-validation (out of mvp scope per requirements.md Out of Scope, so stating "measured post-mvp" is acceptable). For mvp, the O(n) scan is architecturally sound (no index needed for hundreds of tasks). Recommend adding a comment: "For n>10k tasks, consider indexing parent→children in Repository if profiling shows this is a bottleneck." This makes the trade-off explicit for future maintainers |

### Summary

The security requirements correctly identify the real risks for a local single-user library unit (cycle protection, read-only guarantee, tolerance of broken refs, enumeration confinement) and trace them to upstream artifacts (FR-G/OQ-4, business-rules R5/R7/R8, NFR-2). The tech-stack decision (no added dependencies, use task-core.Repository + stdlib Set) is sound and matches the project's "不要な依存を増やさない" principle (project.md Tech Stack). The two findings are minor clarifications (cycle-detection behavior, performance quantification) that don't block implementation — a developer can write working code from these specs.

**READY to advance to code-generation.** The artifacts are implementable without architectural guidance beyond this document.
