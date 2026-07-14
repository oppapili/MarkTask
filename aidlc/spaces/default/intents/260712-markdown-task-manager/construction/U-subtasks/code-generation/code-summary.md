# Code Summary — U-subtasks

> Construction / code-generation（unit: U-subtasks, library）。実コードは workspace root `src/core/`。上流参照: `./code-generation-plan.md`, `../functional-design/*`, `../../../inception/requirements-analysis/requirements.md`（FR-G）。

## 生成/変更ファイル

- `src/core/subtasks.ts`（新規, 138 行）— 親子解釈＋完了ガード。純粋関数中心・読取のみ・副作用なし（R7）。
  - `parseParentRef(parent): string | null` — `"[[<ref>]]"` → `<ref>`、未設定/不正は null（R1）。
  - `isBlockingStatus(status): boolean` — `todo|in-progress|waiting` は true、`done|cancelled` は false（OQ-4, R3）。
  - `childrenOf(parentRef, tasks): Task[]` — スナップショット上の逆引き（FR-G3）。
  - `canComplete(parentRef, tasks, visited?): { blocked; blocking }` — **純粋・同期**の完了ガード。子が blocking なら収集、子孫へ再帰（多階層 FR-G4）、`visited` で循環保護（R5）、存在しない親は空（R8, 例外なし）。
  - `asSubtaskGuard(tasks): SubtaskGuard` — 純粋 `canComplete` を `ok(...)` で包み、state-machine の**同期 SubtaskGuard seam** を満たすファクトリ。
  - `class SubtaskService(repo)` — repo ベース async 便宜: `children(parentRef)`・`canComplete(parentRef)`（`repo.list()` を1回→純粋関数へ委譲、io は Result 伝播）。`list --parent`/standalone 用。
- `src/core/index.ts`（更新）— `SubtaskService`・`childrenOf`・`asSubtaskGuard`・`parseParentRef`・`isBlockingStatus` と純粋ガードを `canCompleteParent` 別名で再エクスポート。
- `src/core/subtasks.test.ts`（新規, 679 行, bun:test）— 45 テスト。

## 主要な実装判断

- **同期 seam vs 非同期 I/O の整合**: SubtaskGuard.canComplete は同期だが子逆引きは `repo.list()`（async）を要する。→ ガード本体を **`Task[]` スナップショット上の純粋関数**にし、`asSubtaskGuard(tasks)` ファクトリで同期 seam を満たす。TaskService が一度 `repo.list()` してスナップショットを注入。async `SubtaskService` は list/standalone 用の便宜。
- **フィールド命名**: 設計 domain-entities の `GuardResult { ok, blocking }` は `Result<T>.ok`（成否）と二重意味になり紛らわしいため、seam に合わせ **`{ blocked, blocking }`**（`blocked = !ok`, `blocked = blocking.length>0`）で統一。
- **循環保護**: `visited: Set<string>` に parentRef を追加してから子孫へ再帰。循環リンクでも無限再帰しない（不正データ耐性 R5）。
- **読取のみ・副作用なし（R7）**: 親完了で子を自動変更しない。`--force` 上書きは呼び出し側（TaskService/U-cli）責務（R6）。
- seam smoke test で `complete(parent, { subtasks: asSubtaskGuard(tasks) })` が未完子で `guard-blocked`・全完了で `completed` を確認。

## テスト結果（検証済み）

- **`bun test`: 254 pass / 0 fail**（新規 +45、既存 209 を維持）。網羅: parseParentRef（解除/null/不正）／childrenOf（一致抽出・除外・存在しない親空）／canComplete（全 done/cancelled→非 blocked・未完→blocked＋blocking・多階層再帰・循環保護・子なし）／asSubtaskGuard（seam 経由）／seam smoke（complete 経由 guard-blocked/completed）／SubtaskService async（repo 経由・io 伝播）。
- **`bunx tsc --noEmit`: エラーなし**、**`eslint src/`: 違反なし**。sensors（linter/type-check）適合。

## プランからの逸脱

- なし（Step 1〜6 実装, 全チェックボックス `[x]`）。設計 `GuardResult{ok}` → seam 準拠 `{blocked}` への命名統一は plan 記載どおり（意図的整合）。

## Review

**Reviewer:** aidlc-architecture-reviewer-agent
**Verdict:** READY
**Date:** 2026-07-14T14:51:28Z
**Iteration:** 1

### Strengths

- **同期 seam をスナップショットで満たす設計（seam #5）**: SubtaskGuard.canComplete は同期だが子逆引きは async。純粋関数（`canComplete(parentRef, tasks)`＋`asSubtaskGuard(tasks)`）でスナップショット注入。TaskService が一度ロードして注入。同期 seam を I/O ブロックなしで満たし、モック不要で純粋テスト可能。
- **フィールド命名の整合（#8）**: `GuardResult{ok}`→`{blocked}`（`Result.ok` との二重意味回避）。seam（state-machine.ts:44）が既に `{blocked,blocking}` なので契約一致。
- **循環保護（R5）**: `visited: Set<string>` で self/2-node/3-node リング全て終了、例外なし。
- **多階層再帰の集約（FR-G4/R4）**: 孫・曾孫の blocking が親へ伝播。テスト網羅。
- **OQ-4 の正しい実装（R3）**: `todo|in-progress|waiting` block、`done|cancelled` 非 block。cancelled 子で `completed`（guard-blocked でない）を確認。
- **seam smoke 充実**: `complete(parent,{subtasks:asSubtaskGuard(tasks)})` が未完子→guard-blocked、全 done/全 cancelled/子なし→completed。
- **読取のみ・副作用なし（R7）**、依存追加ゼロ、`Result<T,AppError>` 全面、存在しない親も例外なし（R8）。
- **バレル完備**、254 pass/0 fail、tsc/lint クリーン。

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | subtasks.ts:71 | `visited.add(parentRef)` の位置コメント不足 | 循環ガードの add 箇所に一言コメント推奨。ロジックは正しい。 |
| 2 | Minor | subtasks.ts:53-54 | `childrenOf` の JSDoc に存在しない親→空配列の明記なし | JSDoc に R8 非 throw 挙動を追記推奨。 |

### Summary

code は **実装・デプロイ可能**。TaskService.complete で `repo.list()` を一度ロード→`asSubtaskGuard(tasks)` を `deps.subtasks` に注入する経路が smoke test で実証済み。純粋 `canComplete` は FR-G2/G4・OQ-4・R5 循環保護を正しく処理。`{blocked,blocking}` 命名は seam 契約に一致し `Result.ok` 衝突を回避。テスト構築グレード（45件, 再帰/循環/OQ-4 厚め）。読取のみ・依存追加なし・全検証 green。2 件の Finding は JSDoc/コメント完全性のみで readiness を妨げない。**READY**。
