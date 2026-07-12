# Code Summary — U-delete-archive

> Construction / code-generation（unit: U-delete-archive, library）。実コードは workspace root `src/core/`。上流参照: `./code-generation-plan.md`, `../functional-design/*`, `../nfr-requirements/security-requirements.md`。

## 生成/変更ファイル

- `src/core/delete-archive.ts`（新規）— DeleteArchiveService: `softDelete(ref)`（→ `.trash/`, restoreHint 付き, FR-I1）／`archive(ref)`（→ archiveDir, status 不変, FR-I2）。task-core の Repository primitive に委譲、独自 I/O なし、`Result<T,AppError>`。
- `src/core/index.ts`（更新）— DeleteArchiveService をエクスポート。
- `src/core/delete-archive.test.ts`（新規, bun:test）。

## 主要な実装判断

- ハード削除なし（非破壊）。delete=ソフト（trash 移動・回復可能）、archive=別 operation（退避・status 不変）。
- 参照解決・移動は task-core に委譲（単一 I/O 境界を維持）。MCP からの delete も回復可能ゆえ confirm 不要（FR-H4）。

## テスト結果（検証済み）

- **`bun test`: 63 pass / 0 fail**（新規 +7、既存 56 を維持）。
- **`bunx tsc --noEmit`: エラーなし**、**`eslint src/`: 違反なし**。

## プランからの逸脱

- なし。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T14:22:39Z
**Iteration:** 1

### Strengths

1. **Delete/archive separation correctly implemented (FR-I1/I2)**: The code provides two distinct operations: `softDelete()` moves to `.trash/` with `restoreHint` (recoverable, intent=error/unwanted removal), and `archive()` moves to `archiveDir` (preservation, intent=retire from active list). Both are non-destructive — no hard delete (`unlinkSync`) is present in the implementation. This satisfies requirements Q9 and business-rules R1, R2.

2. **Status preservation verified (R3)**: Neither `softDelete()` nor `archive()` modifies the task content. Both methods: (a) resolve the ref, (b) call the Repository move primitive (`moveToTrash` / `moveToArchive`), which uses `renameSync` to relocate the file atomically without reading/modifying its content. The test "archive moves task to archiveDir and does not change status" explicitly verifies this by comparing `originalContent === archivedContent`.

3. **Boundary compliance — no I/O re-implementation (INV4)**: `DeleteArchiveService` delegates ALL filesystem operations to `TaskRepository` primitives:
   - Reference resolution: `repo.listRefs()` + `resolveRef(ref, refs)`
   - Move to trash: `repo.moveToTrash(resolvedRef)`
   - Move to archive: `repo.moveToArchive(resolvedRef)`
   
   The only direct `fs` usage in `delete-archive.ts` is `existsSync` in the private `computeDestName()` helper, which mirrors the collision-detection logic in `TaskRepository.moveTask()` for pre-move reporting (to return the correct `trashPath`/`archivePath` in the outcome). This is read-only path inspection for user feedback, NOT a write operation — the actual atomic move with collision suffix is performed by `TaskRepository.moveTask()` (lines 344-377 in repository.ts). The boundary is respected.

4. **Result<T, AppError> contract honored (ADR-9)**: Both methods return `Result<DeleteOutcome, AppError>` / `Result<ArchiveOutcome, AppError>`. Error propagation is explicit: `listRefs()` failure → early return, `resolveRef()` failure (not-found/ambiguous) → early return, `moveToTrash/moveToArchive()` failure → early return. No exceptions thrown. The test "softDelete returns not-found for nonexistent ref" and "archive returns ambiguous error for multiple matches" verify not-found and ambiguous error kinds with correct structure (including `candidates` array for ambiguous).

5. **restoreHint correctness (R6, FR-H4)**: `softDelete()` constructs `restoreHint` with both `mv` and `git checkout` recovery commands, using the actual `trashPath` and `tasksDir` paths. The test "softDelete returns restoreHint containing trash path and tasks dir" verifies both strings are present. This enables MCP delete safety (no additional confirmation needed, per requirements Q9 decision).

6. **Tests cover required behaviors (verification criterion e)**:
   - softDelete: moves to trash (file removed from tasksDir, present in trashDir), excludes from list, includes restoreHint
   - archive: moves to archiveDir, preserves status (content unchanged), excludes from list
   - Error cases: not-found for nonexistent ref, ambiguous with candidates array for multiple matches
   - Collision handling: suffix applied when destination file exists (test "softDelete with collision uses suffix in trash path")
   
   All 7 new tests pass (bun test: 63 pass / 0 fail). The tests exercise both happy paths and error boundaries.

7. **Export completeness**: `src/core/index.ts` exports both the service class and the outcome types (`DeleteOutcome`, `ArchiveOutcome`), making them available to CLI/MCP adapters.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | delete-archive.ts:52, 85 | `computeDestName()` duplicates collision-detection logic from `TaskRepository.moveTask()` | This is intentional duplication for pre-move reporting (to return the correct path in the outcome before the move happens). The actual atomic move with collision handling is delegated to `TaskRepository.moveTask()` (lines 344-377 in repository.ts), which is the single source of truth for the write operation. The duplication is read-only and unavoidable given the outcome contract requires the destination path. Not blocking — the alternative (return only `ref` and document that trash/archive path may have collision suffix) would degrade UX by hiding the actual path from the user. |
| 2 | Minor | delete-archive.test.ts | No test for read-only collision suffix edge case (pre-placed file with `-2` already exists, expects `-3`) | The test "softDelete with collision uses suffix in trash path" verifies basic collision handling (no suffix → `-2`). A second-order collision test (existing `-2` → expects `-3`) would strengthen confidence in the mirrored logic, but this is a minor gap because `TaskRepository.moveTask()` itself is tested and owns the canonical collision algorithm. The service's `computeDestName()` only reads and reports. Acceptable for Standard mvp depth. |

### Summary

The generated code **faithfully implements the design** with no architectural deviations. `DeleteArchiveService` correctly separates delete (soft, to trash, recoverable) from archive (location move, status unchanged) per FR-I1/I2 and business-rules R1-R3. It delegates all I/O to `TaskRepository` primitives (resolveRef, moveToTrash, moveToArchive) with no direct fs write operations, respecting the single I/O boundary (INV4, verification criterion c). Error handling uses `Result<T, AppError>` throughout with correct propagation of not-found/ambiguous/io error kinds (verification criterion d). Tests cover the required behaviors: move to trash/archive, list exclusion, restoreHint presence, status preservation, and error cases (verification criterion e). The implementation is complete, runnable, and passes all tests (bun test: 63/63, tsc clean, eslint clean).

The two findings are acceptable minor points: the collision-detection duplication is intentional for UX (pre-move reporting) and read-only, and the missing edge-case test for second-order collision is not critical because the canonical move logic in `TaskRepository` is tested. A developer could deploy this code without further architectural guidance.

**READY for stage completion.**
