# Business Logic Model — U-delete-archive

> Construction / functional-design（unit: U-delete-archive）。上流参照: `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/units-generation/unit-of-work-story-map.md`, `../../../inception/requirements-analysis/requirements.md`（requirements）, `../../../inception/application-design/components.md`（components）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/application-design/services.md`（services）。
> 対象: DeleteArchiveService。delete=ソフト削除・archive=退避（別 operation・非破壊）。task-core の Repository 移動プリミティブを利用。

## 1. softDelete（FR-I1, US-7.1）

```
softDelete(ref):
  resolved = repo.resolveRef(ref)            # 完全一致→部分一致→候補（task-core）
  if err: return err
  trashPath = repo.moveToTrash(resolved)     # tasks/ -> tasks/.trash/（原子的 move, 衝突時 -n）
  return Ok({ ref: resolved, trashPath, restoreHint: `mv ${trashPath} <tasksDir>/ (or git checkout)` })
```
- ハード削除（unlink）は行わない（INV: 非破壊）。既定 `list` からは `.trash/` が別ディレクトリのため自然に除外される。

## 2. archive（FR-I2, US-7.2）

```
archive(ref):
  resolved = repo.resolveRef(ref)
  if err: return err
  archivePath = repo.moveToArchive(resolved) # tasks/ -> <archiveDir>/（原子的 move, 衝突時 -n）
  return Ok({ ref: resolved, archivePath })
```
- delete とは**意図が異なる別 operation**: archive=完了/非アクティブの保全（活動一覧から外すが残す）。status は変更しない（退避＝場所の移動のみ）。

## 3. 一覧からの除外・参照

- 既定 `list`/`search`（U-query-search）は `tasksDir` 直下のみを走査し `.trash/`・`archiveDir` を対象外とする。
- 退避分は `list --archived` で `archiveDir` を走査して参照（U-query-search と協調）。
- `.trash/` は復旧用途のみ（一覧の第一級対象にしない）。

## 4. MCP からの利用（US-6.2, FR-H4）

- MCP `delete` は softDelete をそのまま呼ぶ（回復可能ゆえ追加 confirm なし）。戻り値に trashPath を含め、AI が復旧経路を認識できる。

## 5. エラー

- `not-found` / `ambiguous`（resolveRef 由来）、`io`（move 失敗, task-core が正規化）。すべて `Result` で返す（例外を投げない）。

<!-- Text fallback: U-delete-archiveはdelete=softDelete(tasks/→.trash/移動、復旧ヒント付き)とarchive=退避(→archiveDir移動、statusは変えない)を別operationとして提供。いずれもtask-coreのmoveプリミティブで原子的に移動し非破壊(ハード削除なし)。既定listは.trash/とarchiveDirを除外、退避分はlist --archivedで参照。MCP deleteは回復可能ゆえconfirm不要。 -->

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T12:56:06Z
**Iteration:** 1

### Strengths

1. **Delete/archive separation correctly implemented per FR-I**: The design distinguishes `softDelete` (→ `.trash/`, recoverable, intent=removal of error/unwanted) from `archive` (→ `archiveDir`, preservation, intent=retire from active list) as separate operations (FR-I1/I2, requirements Q9). Both are non-destructive (no unlink/hard-delete) per R1. This satisfies the critical design trap identified in the orchestrator prompt.

2. **Delegation to task-core Repository primitives is explicit**: softDelete/archive call `repo.moveToTrash`/`moveToArchive` respectively (business-logic-model.md §1, §2). The design does NOT re-implement file I/O — it delegates to C2 Repository's atomic move primitives (component-methods.md C2 signatures match). The boundary is respected (point c in verification criteria).

3. **Default list/search exclusion stated for coordination**: §3 "既定 `list`/`search`（U-query-search）は `tasksDir` 直下のみを走査し `.trash/`・`archiveDir` を対象外" and "退避分は `list --archived` で `archiveDir` を走査して参照（U-query-search と協調）" explicitly documents the coordination with U-query-search. This satisfies point (d).

4. **MCP delete safety rationale is present**: §4 "MCP `delete` は softDelete をそのまま呼ぶ（回復可能ゆえ追加 confirm なし）" matches FR-H4 and requirements Q9 decision. The design includes `restoreHint` in the return payload ("trashPath を含め、AI が復旧経路を認識できる") to enable recovery visibility (point e).

5. **Business rules are comprehensive and correct**:
   - R2 (delete ≠ archive) explicitly states intent separation with user-facing rationale (誤り除去 vs 活動除外)
   - R3 (status 不変) confirms archive does not modify task state, only location
   - R5 (衝突回避) delegates to task-core's move primitive with `-n` suffix
   - R6 (復旧容易性) specifies `restoreHint` with mv/git recovery commands
   - R7 (参照解決) uses task-core.resolveRef with disambiguation, matching C2 signature

6. **Cross-reference to shared contracts verified**: business-logic-model.md header cites `unit-of-work.md`, `requirements.md`, `component-methods.md`, `components.md`, `services.md` (upstream coverage). The design references `repo.resolveRef`, `repo.moveToTrash`, `repo.moveToArchive` which exist in component-methods.md C2 TaskRepository (cross-unit contract soundness confirmed). DeleteArchiveService maps to C8 in components.md with matching public API (`softDelete(ref)`, `archive(ref)`).

7. **Error handling at all boundaries**: §5 lists error kinds (not-found/ambiguous/io) returned as `Result` per ADR-9. No silent failures. Errors originate from resolveRef or move failures (task-core normalized).

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | business-logic-model.md §2 | `archive` does not mention the source of `archiveDir` path (config resolution) | Acceptable for functional-design depth. The domain-entities.md § 関係 already states "Config（task-core）が解決" which implies C1 ConfigManager. If code-generation needs explicit wiring, that's where to specify ConfigManager.resolvePaths → Repository initialization. Not blocking. |
| 2 | Minor | business-rules.md R7, business-logic-model.md §1 | `resolveRef` disambiguation ("複数該当時は候補提示") — the design says "曖昧は候補提示（エラーにしない）" but component-methods.md C2.resolveRef returns `Result<string>` with `ambiguous` error kind, not a special disambiguation flow | Clarify at code-generation: does `ambiguous` error carry `candidates: string[]` and the adapter (CLI/MCP) presents them, or does resolveRef have a separate "interactive disambiguation" path? The component-methods.md `AppError` type shows `ambiguous` WITH `candidates` field, so the Result-based flow is correct — the design's prose ("エラーにしない") means "prompt user to choose" not "auto-succeed", which is architecturally sound. Not blocking. |

### Summary

The functional design for U-delete-archive is **implementable without further architectural guidance**. A developer can trace the logic: (1) `DeleteArchiveService.softDelete(ref)` calls `repo.resolveRef(ref)` → `repo.moveToTrash(resolved)` → returns outcome with `restoreHint`, (2) `archive(ref)` follows identical flow to `moveToArchive`, (3) both preserve status and delegate I/O. The delete≠archive separation (FR-I1/I2) is correctly modeled. The non-destructive invariant (R1) holds. The MCP safety rationale (FR-H4) is documented. Coordination with U-query-search (default exclusion of `.trash/` and `archiveDir`) is stated. The boundaries with task-core (C2 Repository primitives) are respected with no I/O re-implementation.

The two findings are clarifications on config path resolution (already covered implicitly) and disambiguation flow semantics (actually correct per component-methods.md error types). Neither exposes architectural unsoundness. The design is complete for Standard mvp depth — detailed rollforward edge cases (OQ-1/OQ-2 from requirements) are appropriately out of scope for this unit (those belong to U-recurrence functional-design).

**READY to advance to code-generation.**
