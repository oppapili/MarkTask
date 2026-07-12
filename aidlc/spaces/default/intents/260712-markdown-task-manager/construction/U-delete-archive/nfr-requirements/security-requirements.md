# Security Requirements — U-delete-archive

> Construction / nfr-requirements（unit: U-delete-archive, library）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements, NFR/FR-I）。
> 前提: ローカル・単一ユーザー・ネットワーク非公開。

## セキュリティ要件

- **SEC-1（移動先の閉じ込め）**: delete/archive の移動先は設定済み `trashDir`/`archiveDir` に限定。`ref` 由来のパスに `..`・絶対パスを許さない（task-core の SEC-1 と同じサニタイズを利用）。
- **SEC-2（非破壊・回復可能）**: 物理削除をしない。delete はソフト（`.trash/` へ移動）で回復可能（FR-I1）。誤操作・AI 経由の delete でもデータを失わない（US-6.2）。
- **SEC-3（原子的移動）**: 移動は copy→fsync→unlink もしくは rename の原子的操作で、途中失敗で元/先の両方を壊さない（NFR-1 準拠）。
- **SEC-4（confirm 不要の正当化）**: MCP delete に追加 confirm を課さないのは、ソフト削除が回復可能だから（FR-H4）。ハード削除を提供しないため無確認でも安全。
- **SEC-5（衝突安全）**: 移動先に同名既存があればサフィックスで一意化し、既存ファイルを上書きしない。

## 脅威・非該当

- ネットワーク/認証は非該当（ローカル単一ユーザー）。主リスクは「意図しないデータ喪失」で、ソフト削除＋git で二重に緩和。

## テスト観点

- パス閉じ込め、移動の原子性、衝突時の非上書き、`.trash/`/archive の list 除外をユニット/結合テストで確認。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:32:20Z
**Iteration:** 1

### Strengths

1. **Appropriate security scope for local single-user context**: The requirements correctly focus on filesystem-level safety (path confinement, atomic operations, collision avoidance) rather than network/auth/compliance concerns that don't apply to a local CLI tool. The "脅威・非該当" section explicitly documents why network/auth are out of scope.

2. **SEC-1 (path confinement) traces to task-core security boundary**: The requirement to confine delete/archive destinations to configured `trashDir`/`archiveDir` with path sanitization (no `..` or absolute paths) matches task-core's SEC-1 primitive and delegates the actual sanitization to task-core (tech-stack-decisions.md confirms zero added deps, full delegation to Repository primitives).

3. **SEC-2 (non-destructive/recoverable) correctly implements FR-I1**: Soft delete to `.trash/` with no physical unlink satisfies the "delete ≠ hard delete" requirement (requirements.md FR-I1, Q9 decision). The justification explicitly ties recoverability to US-6.2 (MCP safety) and FR-H4 (no confirm needed).

4. **SEC-3 (atomic move) implements NFR-1**: The atomic operation constraint (copy→fsync→unlink or rename) prevents corruption on failure, directly satisfying NFR-1 (data safety). The functional-design business-logic-model.md § "原子的 move" confirms this is delegated to task-core Repository, so the unit doesn't re-implement I/O.

5. **SEC-4 (MCP no-confirm justification) is architecturally defensible**: The rationale "ソフト削除が回復可能だから（FR-H4）。ハード削除を提供しないため無確認でも安全" is sound — because the operation is non-destructive (SEC-2) and git is a secondary safety net (requirements.md FR-I1 constraint), exposing delete via MCP without additional confirmation does not introduce data-loss risk. This satisfies the verification criterion (a).

6. **SEC-5 (collision safety) prevents silent overwrites**: Suffix-based uniquification when a file exists at the move destination ensures archive/delete never clobbers existing files. This delegates to task-core's move primitive (business-rules.md R5 "-2, -3… サフィックス（task-core の move プリミティブが担保）"), so no new collision logic is introduced.

7. **Test coverage section is concrete**: The "テスト観点" lists verifiable properties (path confinement, atomic move, collision non-overwrite, `.trash/`/archive list exclusion) suitable for unit/integration tests, satisfying the stage's NFR verification requirement.

8. **Tech-stack-decisions.md correctly shows zero added deps**: The table confirms every concern delegates to task-core primitives (Repository.moveToTrash/moveToArchive, ConfigManager.resolvePaths). The "外部依存ゼロ（追加）" statement satisfies the project.md "不要な依存を増やさない" rule. This is architecturally correct for a library unit that wraps existing primitives (verification criterion b).

9. **Cross-references are valid**: security-requirements.md header cites business-logic-model, business-rules, requirements (upstream coverage). SEC-2 references FR-I1, US-6.2, FR-H4. SEC-3 references NFR-1. All cited identifiers exist in the upstream contracts.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | security-requirements.md SEC-1 | The requirement says "task-core の SEC-1 と同じサニタイズを利用" but doesn't specify what happens if task-core's sanitization rejects a path (e.g., user passes `ref` with `..` escape attempt) | Acceptable for NFR-requirements depth. The functional-design business-logic-model.md § error handling already states "io（move 失敗, task-core が正規化）" — path-rejection errors would surface as `Result::Err` from Repository. If code-generation needs explicit error mapping (e.g., "path-rejected" vs "file-not-found"), that's where to specify it. Not blocking. |
| 2 | Minor | tech-stack-decisions.md | The備考 says this unit is "薄いドメインサービス" (thin domain service) but doesn't quantify "薄い" — is there any business logic beyond intent separation (delete vs archive)? | Clarify at code-generation if needed. The functional-design business-logic-model.md §1-2 shows the logic is purely delegation (`resolveRef → moveToTrash/moveToArchive → return outcome`), so "薄い" is accurate. The備考 already states "技術的には task-core の移動プリミティブの薄いラッパ" — no ambiguity for a developer. Not blocking. |

### Summary

The NFR Requirements for U-delete-archive satisfy the verification criteria: (a) security requirements correctly model local soft-delete/archive primitives with move-target confinement, non-destructive operations, atomic moves, and justified MCP-no-confirm per FR-H4; (b) tech-stack-decisions shows zero added dependencies with full delegation to task-core Repository; (c) no over-reach — the scope is appropriate for a library unit wrapping existing primitives.

The two findings are clarifications on error-flow detail (already covered in functional-design) and the semantics of "thin wrapper" (already explained in the備考). Neither exposes architectural unsoundness.

For a **local single-user tool** with no network/auth/compliance surface, focusing security requirements on filesystem safety (path confinement, atomicity, collision avoidance, recoverability) is architecturally correct. The delete-vs-archive intent separation (the unit's primary domain value) is enforced via distinct operations (softDelete → `.trash/`, archive → `archiveDir`) without adding unnecessary dependencies.

The artifacts trace cleanly to FR-I (delete/archive separation), NFR-1 (atomic writes), and the functional-design's delegation model. A developer can implement this unit without further architectural guidance — the security invariants (non-destructive, atomic, confined) are clear, the tech stack is specified (zero-added-deps delegation), and the test surface is enumerated.

**READY to advance to infrastructure-design.**
