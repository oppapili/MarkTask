# Code Summary — U-task-core

> Construction / code-generation（unit: U-task-core, library・基盤）。実コードはワークスペース root（`src/core/`）。上流参照: `./code-generation-plan.md`, `../functional-design/*`, `../nfr-requirements/*`, `../../../inception/requirements-analysis/requirements.md`。

## 生成ファイル

### アプリケーションコード（workspace root）
- `src/core/types.ts` — 共通型（Status/Priority/TaskType/Task/Config/Result/AppError）
- `src/core/config.ts` — ConfigManager（XDG `~/.config/marktask/config.yaml`, resolvePaths, 既定値）
- `src/core/codec.ts` — FrontmatterCodec（gray-matter+yaml, decode/encode, 未知フィールド保持, frontmatter 無し安全, titleFromRef）
- `src/core/task-model.ts` — スキーマ検証（validate/assertValidStatus）
- `src/core/repository.ts` — TaskRepository（原子的 temp→rename 書込, ファイル名生成＋衝突回避, slug サニタイズ, resolveRef 完全→部分→候補, list, moveToTrash/moveToArchive, childrenOf）
- `src/core/index.ts` — core エクスポート
- `src/cli/index.ts`, `src/mcp/index.ts` — 後続 unit 用プレースホルダ

### テスト（bun:test, コア重点）
- `src/core/repository.test.ts` / `codec.test.ts` / `config.test.ts` / `task-model.test.ts`

### プロジェクト雛形
- `package.json`（name: marktask, type: module, scripts: test/lint/format）, `tsconfig.json`（strict）, `.prettierrc`, `eslint.config.js`（flat, TS）, `.gitignore`

## 主要な実装判断

- エラーは `Result<T, AppError>`（例外を境界で投げない, ADR-9）。fs 例外は `io` に正規化。
- 原子的書込（temp→rename）で破損防止（NFR-1）。slug サニタイズでパストラバーサル拒否・日本語は保持（SEC-1, NFR-4）。
- codec は未知 frontmatter フィールドを `raw` に温存し encode で書き戻す（NFR-2）。frontmatter 無しも正常扱い。
- ファイル名 `<YYYYMMDD>-<slug>.md` が参照キー（`id`/`title` フィールドなし, DRY）。衝突は `-2`,`-3`。

## テスト結果（検証済み）

- **`bun test`: 56 pass / 0 fail**（112 expect）。
- **`bunx tsc --noEmit`: エラーなし**。
- **`eslint src/`: 違反なし**。

## プランからの逸脱

- なし（Step 1–9 を実装。README は最小雛形として作成、後続 unit で拡充予定）。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T14:10:56Z
**Iteration:** 1

### Strengths

1. **Complete design-to-code fidelity for Task schema (a)**: The `Task` interface in `types.ts` faithfully implements domain-entities.md: `ref`/`title` are derived (not persisted), the five-state `Status` enum is exact, the 11 frontmatter fields (tags through last_done) match, and `raw: Record<string, unknown>` preserves unknown fields per NFR-2/INV2. The codec correctly omits `ref` and `title` from frontmatter (FR-A1, DRY) and derives them at decode time via `titleFromRef()`.

2. **Atomic writes implemented correctly (b)**: `repository.ts:atomicWriteSync()` implements the business-logic-model.md §3 temp→rename sequence with `pid+rand` unique suffix, error-path cleanup (`unlinkSync(tmpPath)` in catch), and recursive directory creation (`mkdirSync(..., { recursive: true })`). This satisfies NFR-1 and business-rules INV1. The `TaskRepository.write()` method validates schema before calling `atomicWriteSync()`, preventing invalid tasks from reaching disk. The implementation matches the pseudocode exactly.

3. **Reference resolution with disambiguation (c)**: `repository.ts:resolveRef()` implements business-logic-model.md §2 precisely: exact match returns immediately, partial match scans both `r.includes(input)` and `titleFromRef(r).includes(input)` (lowercase for case-insensitivity), single match returns `ok()`, no matches returns `err(not-found)`, multiple matches returns `err(ambiguous, {candidates})`. This fulfills FR-D5 and the user-centered "don't fail, present choices" philosophy from requirements Q5=C. The code is testable and the tests confirm all four paths.

4. **Codec preserves unknown fields and handles missing frontmatter (d)**: `codec.ts:decode()` uses `gray-matter` to parse frontmatter, treats missing frontmatter as `data={}` (normalizing to defaults), filters known fields into `Task` properties while copying all `data` entries that aren't in `KNOWN_FIELDS` into `raw`. `encode()` merges `{ ...task.raw, ...known }`, writing unknown fields back verbatim. Tests confirm round-trip preservation (`custom_field`, nested objects) and safe handling of frontmatter-less files. This implements NFR-2 and security-requirements SEC-6 (no arbitrary YAML object construction — `gray-matter` uses safe parsing by default).

5. **Slug sanitization prevents path traversal while keeping UTF-8/Japanese (e)**: `repository.ts:slugify()` strips `OS_FORBIDDEN_RE` (`/[/\\:*?"<>|\x00-\x1f]/g`) and path-traversal `..` sequences, collapses consecutive hyphens, trims, and falls back to `"untitled"` on empty result. `validatePathSafe()` additionally rejects absolute paths, checks OS-forbidden chars, resolves the path, and verifies it stays within `allowedDir` via `relative()` escaping check. Tests confirm Japanese characters pass through (`買い物リスト`), while `../etc/passwd`, `:name*`, and `/absolute` are rejected. This implements security-requirements SEC-1 and business-rules R9, correctly balancing safety and UTF-8 preservation (NFR-4).

6. **Result<T,AppError> at all boundaries, no thrown exceptions (f)**: Every public repository method returns `Result<T, AppError>`. Filesystem errors (`readFile`, `writeFileSync`, `renameSync`, `readdirSync`) are caught and normalized to `appError('io', message, {cause})`. The error taxonomy (not-found, ambiguous, config, io) matches domain-entities.md's `AppError` design. No exceptions cross the module boundary. Tests confirm `Result` unpacking (`result.ok` checks) at every call site. This fulfills ADR-9's "no exceptions across the API" contract and business-rules R11.

7. **No hard delete, only move primitives (g)**: `TaskRepository` exposes `moveToTrash()` and `moveToArchive()` but never exposes a `delete()` or `unlink()` primitive. The `moveTask()` private method uses `renameSync()` for atomic moves with collision-avoidance (`-2`, `-3` suffixes in destination). Tests confirm soft-delete behavior (file moves to `trashDir`, not destroyed). This implements security-requirements SEC-7, business-rules INV3, and FR-I1's "ハード削除は提供しない（git がセーフティネット）".

8. **Test coverage aligns with Standard strategy (h)**: 56 passing tests (112 expects) cover the happy paths plus critical edges: filename collision/incrementing, ref resolution exact/partial/ambiguous/not-found, atomic write with missing directories, codec round-trip with unknown fields + frontmatter-less files, slugify with UTF-8/path-traversal/forbidden-chars, validatePathSafe rejection cases, schema validation for all rule violations (R1–R7), moveToTrash/Archive with collision. The test surface matches team-practices "コア重点のテスト方針" — thick tests on fragile I/O/codec/slug/recurrence logic, thin periphery (no CLI tests yet, correctly deferred to U-CLI). Coverage is appropriate for Standard depth without numeric targets.

### Findings

**No blocking findings.** The code is architecturally sound, implements every design contract, and is ready for integration with dependent units (U-state-management, U-recurrence, U-subtasks, U-CLI, U-MCP).

Three minor clarifications for future unit integration:

| # | Severity | Location | Observation | Recommendation |
|---|---|---|---|---|
| 1 | Advisory | repository.ts:generateFilename | The `slugify('')` → `"untitled"` fallback is implemented but not explicitly documented in the function comment | Add a code comment at `slugify()`: "Returns 'untitled' when result is empty after sanitization (e.g., symbol-only input)" — not a defect, just aids future maintainers |
| 2 | Advisory | repository.ts:moveTask | Collision suffix in trash (`-2`, `-3`) matches create's pattern (consistency), but the business-logic-model note "trash 内で同名既存なら `-n`" used `-n` notation | Confirm with U-delete-archive integration that the `-2` pattern is intentional (current code is consistent with create, which is correct) — no action needed unless U-delete-archive expects different semantics |
| 3 | Advisory | repository.ts:read (async) vs write/moveToTrash (sync) | `read()` is async (`async/await + readFile`) while `write()` and move operations are sync (`writeFileSync`, `renameSync`) — API surface is mixed | This is acceptable for mvp (file sizes are small, sync I/O is fast enough for local CLI). If future performance requirements emerge, batch operations could use async I/O uniformly. Document the async/sync split in a top-level comment if it becomes a maintenance concern |

### Summary

The generated code **faithfully implements the approved design** and is **sound/implementable**. Every verification criterion from the orchestrator's task prompt passes:

- **(a) Task schema per domain-entities**: Filename=ref (no id/title fields), 5 states, raw for unknown fields ✓
- **(b) Atomic temp→rename writes (NFR-1)**: `atomicWriteSync()` with cleanup ✓
- **(c) Ref resolution exact→partial→ambiguous-candidates (FR-D5)**: `resolveRef()` with disambiguation ✓
- **(d) Codec preserves unknown fields + handles missing frontmatter (NFR-2)**: Round-trip tests pass ✓
- **(e) Slug sanitization prevents path traversal, keeps UTF-8/Japanese (SEC-1)**: `slugify()` + `validatePathSafe()` ✓
- **(f) Result<T,AppError> at boundaries, no thrown exceptions**: All public methods return Result, fs errors normalized to io ✓
- **(g) No hard delete (only move primitives)**: `moveToTrash()`/`moveToArchive()` exposed, no `unlink()` ✓
- **(h) Tests cover happy + edge per Standard strategy**: 56 pass/0 fail, appropriate coverage ✓

The code is **production-grade for a local CLI/MCP mvp**. The atomic write implementation is textbook-correct (temp→fsync→rename with error cleanup). The path-traversal prevention is comprehensive (character filtering + boundary checks). The codec is non-destructive (unknown field preservation). The error handling is boundary-safe (no exceptions leak). The test coverage respects the project's "コア重点" philosophy (thick tests on I/O/codec/slug, thin periphery).

The three advisory findings are integration notes, not defects: the untitled-fallback comment clarification, trash-collision-suffix confirmation, and async/sync I/O mix documentation. None block advancement. The implementation can proceed to U-state-management (which will consume TaskRepository for state transitions), U-recurrence (which will parse `repeat` strings and compute next-due dates), U-subtasks (which will enforce parent-child guards via `childrenOf()`), and the U-CLI/U-MCP adapters (which will wire this core to user-facing surfaces).

**READY to advance to build-and-test stage.**
