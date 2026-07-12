# Security Requirements — U-query-search

> Construction / nfr-requirements（unit: U-query-search, library）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements, NFR-3）。
> 前提: ローカル・単一ユーザー・ネットワーク非公開。

## セキュリティ要件

- **SEC-1（読み取り専用）**: QueryService は書き込みをしない（副作用なし）。データ改変経路を持たないため書込系の脅威面がない。
- **SEC-2（クエリ注入なし）**: `search` は独自クエリ言語でなく単純な部分一致（正規表現/式評価をユーザー入力から構築しない）。注入リスクを設計上排除。仮に正規表現対応する場合も入力を式として実行しない。
- **SEC-3（列挙の閉じ込め）**: 母集合は task-core.Repository.list（tasksDir 直下）。`.trash/`・archive を既定除外し、対象外ディレクトリを走査しない。
- **SEC-4（DoS 耐性/性能, NFR-3）**: 数千件のインメモリ走査で実用速度。極端な件数でも O(n) 走査で破綻しない（ローカル単一ユーザーゆえ敵対的負荷は想定外）。

## 脅威・非該当

- ネットワーク/認証は非該当。主眼は「検索入力を式として実行しない」こと（SEC-2）。

## テスト観点

- 部分一致の大小無視、フィルタ AND 合成、trash/archive 除外、特殊文字を含む検索語で式評価が起きないこと。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:42:16Z
**Iteration:** 1

### Strengths

1. **Security posture matches read-only unit role**: SEC-1 correctly identifies that QueryService has no write path and no data mutation surface. This is architecturally sound — a library that only filters/sorts/searches Task[] from Repository cannot introduce write-path threats (SQL injection, unauthorized updates, data corruption). The security requirements correctly scope to the actual attack surface of this unit.

2. **Query injection mitigation is appropriate**: SEC-2 states that `search` uses substring matching, not an eval'd query language. This design eliminates injection risk at the architecture level (no interpreted DSL, no regex construction from user input, no expression evaluation). Even if regex support is added later, the note "入力を式として実行しない" (don't execute input as an expression) establishes the defensive principle. For a LOCAL single-user tool with no network exposure, this is the correct threat model — sophisticated query injection defenses (parameterized queries, input sanitization layers) would be over-engineering.

3. **Enumeration confinement is explicit**: SEC-3 confines the target set to Repository.list (tasksDir only) and excludes `.trash/` and archive by default. This prevents directory traversal outside the intended scope. The constraint matches business-rules.md R1 (target set = active tasks) and functional-design §1 (repo.list excludes trash/archive). No path-injection surface exists because the unit doesn't construct filesystem paths from user input — it delegates enumeration to Repository, which is the single I/O boundary (component-methods C2).

4. **DoS mitigation is realistic**: SEC-4 acknowledges O(n) scan and states "数千件のインメモリ走査で実用速度" as the defense. This aligns with NFR-3 ("数千件のタスクで `list`/`search` が実用的な応答速度") and tech-stack-decisions.md ("O(n) で数千件に十分"). For a LOCAL single-user CLI tool, adversarial DoS attacks (malicious multi-GB queries, recursive directory bombs) are out of scope — the user is the only actor. The O(n) scan will degrade gracefully if the user exceeds scale assumptions (slow response, not crash), and the reversibility note in business-logic-model.md ("必要なら将来キャッシュ（可逆）") provides an escape hatch.

5. **Non-applicable threats correctly dismissed**: The "脅威・非該当" section correctly states that network/authentication are not relevant for a local stdio tool. This matches the context constraint (LOCAL single-user no-cloud, no auth/network is CORRECT per the orchestrator note). Over-specifying authentication or encryption at rest would be wasteful — the threat model is honest.

6. **Traceability to upstream is complete**: 
   - SEC-2 (no query injection) → business-logic-model.md §2 `normalize()` (substring match, no eval)
   - SEC-3 (enumeration confinement) → business-rules.md R1 (target set = tasksDir, exclude trash/archive)
   - SEC-4 (O(n) DoS mitigation) → NFR-3 (scale target = thousands), tech-stack-decisions.md (in-memory scan sufficient)
   
   Every security requirement traces to a design decision or upstream NFR.

7. **Test coverage targets real risks**: The "テスト観点" section lists testable scenarios: case-insensitive matching, filter AND composition, trash/archive exclusion, special-character inputs don't trigger expression evaluation. These tests directly verify SEC-2 (no injection) and SEC-3 (confinement). The test strategy is risk-proportional.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | security-requirements.md | SEC-4 conflates DoS mitigation with performance requirement — it's listed under security but is actually a performance guarantee (NFR-3 scale target). DoS as a security concern (adversarial input exhausting resources) isn't applicable to a single-user local tool | Acceptable for mvp — the classification is loose but the substance is correct (O(n) scan won't break at scale). If nfr-requirements had produced performance-requirements.md (it didn't, because this is a library unit), this content would more naturally belong there. Not a design flaw, just a taxonomy detail. |

### Summary

The security requirements for U-query-search are **appropriate, complete, and implementable**. The threat model is honest: a read-only query/search library for a LOCAL single-user CLI has no authentication, network, or write-path attack surface. The requirements correctly focus on the actual risks — query injection (mitigated by design: no eval), enumeration leakage (mitigated: Repository confines to tasksDir), and performance degradation (mitigated: O(n) scan sufficient for scale target). SEC-1 through SEC-4 trace cleanly to functional-design and NFR-3. The test strategy targets real vulnerabilities (injection via special characters, traversal via trash/archive inclusion). No over-reach (no pointless encryption-at-rest or auth schemes), no under-reach (all real risks covered).

The tech-stack-decisions.md correctly shows no added dependencies — stdlib + existing date-fns, no index DB per ADR-4. This matches the team-practices principle "不要な依存を増やさない" and the Standard-depth scope (mvp with pragmatic choices).

**READY to advance to code-generation.** A developer can implement QueryService's security posture directly from these requirements: use substring matching (no eval), delegate enumeration to Repository (no path construction), test with special characters and trash/archive exclusion. No architectural ambiguities remain.
