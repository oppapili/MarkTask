# Code Summary — U-state-management

> Construction / code-generation（unit: U-state-management, library）。実コードは workspace root `src/core/`。上流参照: `./code-generation-plan.md`, `../functional-design/*`, `../nfr-requirements/tech-stack-decisions.md`, `../../../inception/requirements-analysis/requirements.md`（FR-B）。

## 生成/変更ファイル

- `src/core/state-machine.ts`（新規, 152 行）— 状態遷移と done 分岐。
  - `transition(task, to): Result<Task, AppError>` — `assertValidStatus(to)`（task-model 再利用）で検証し、**新しい Task** を返す（`{ ...task, status: to, updated: nowIso() }`）。入力を破壊せず `created` 不変（R3）。純粋・副作用なし・I/O なし。
  - 糖衣 use-case: `start`（→in-progress）/`wait`（→waiting）/`cancel`（→cancelled）/`setState`（任意 Status）。
  - `complete(task, deps?): Result<CompleteOutcome, AppError>` — done 分岐（R4）: ①`deps.subtasks.canComplete(ref)` が blocked → `guard-blocked`（blocking 付き）②`type==='recurrence' && repeat && deps.recurrence` → `rollForward(task)` に委譲（recurred/recurrence-ended）③それ以外 → `transition(task,'done')` → `completed`。永続化しない（R6, Task/Outcome を返すのみ）。
  - `CompleteOutcome`（4 variant 判別共用体, C10/domain-entities 準拠）と依存インタフェース `RecurrenceRoller`/`SubtaskGuard`/`CompleteDeps` を定義。
- `src/core/index.ts`（更新）— `transition`/`start`/`wait`/`cancel`/`setState`/`complete` と型 `CompleteOutcome`/`RecurrenceRoller`/`SubtaskGuard`/`CompleteDeps` を再エクスポート。
- `src/core/state-machine.test.ts`（新規, 263 行, bun:test）— 24 テスト。

## 主要な実装判断

- **DRY / SSOT**: 状態値検証は既存 `task-model.assertValidStatus` を再利用（重複実装なし）。
- **純粋関数**: `transition` は入力を変更せず新オブジェクトを返す。状態遷移ロジックを厚くユニットテスト（team-practices: コア重点）。
- **依存性逆転（委譲境界 R5）**: U-recurrence（`rollForward`）と U-subtasks（`canComplete`）はまだ未生成のため、本ユニットで**依存インタフェース**（seam）を定義し注入された実装に委譲。これにより U-state-management は単独でコンパイル・モックテスト可能。recurrence 固有計算・親子ガード判定は本ユニットに実装しない。実配線は後続の TaskService/アダプタ（U-cli/U-mcp）が担う。
- **done 分岐の優先順**: 親ガード → recurrence → 通常 done（R4）。永続化は分離（R6）。
- ESLint 対応: 型変換は `as any` を使わず `@typescript-eslint/no-explicit-any` に適合。

## テスト結果（検証済み）

- **`bun test`: 136 pass / 0 fail**（新規 +24、既存 112 を維持）。state-machine.test.ts の内訳:
  - transition: 各状態遷移で status 更新＋updated 変化＋created 不変、不正状態値は error（許容値提示 FR-B3）、入力 Task 非破壊（新オブジェクト）。
  - 糖衣: start→in-progress / wait→waiting / cancel→cancelled / setState 任意。
  - complete 分岐: deps なし→completed／subtasks モック blocked→guard-blocked＋blocking／非 blocked→completed／recurrence タスク＋モック→recurred(nextDue)・recurrence-ended／recurrence だが recurrence dep なし→completed（fallthrough）／deps エラー伝播。
- **`bunx tsc --noEmit`: エラーなし**、**`eslint src/`: 違反なし**。sensors（linter/type-check）適合。

## プランからの逸脱

- なし。プランの Step 1〜5 をすべて実装（全チェックボックス `[x]`）。

## Review

**Reviewer:** aidlc-architecture-reviewer-agent
**Verdict:** READY
**Date:** 2026-07-14T14:25:16Z
**Iteration:** 1

### Strengths

- **5状態を types.ts から再利用（再定義なし, R1）**: `Status` を `./types.js` から import し全体で使用。`inbox` なし、SSOT 厳守。
- **transition の updated 更新・created 不変・非破壊（R3/FR-B2）**: `{ ...task, status, updated: nowIso() }` を新オブジェクトで返し入力を変更しない。テストで created 保持・非破壊を確認。
- **status 検証を assertValidStatus に委譲（DRY）**: task-model の既存実装を再利用、重複検証なし。不正値は許容値提示付き error（FR-B3）。
- **糖衣は transition に合成**: start/wait/cancel/setState は各1行アダプタ、updated/検証の再実装なし。
- **complete 分岐は注入依存に委譲（R4/R5）**: 親ガード→recurrence→通常 done。recurrence 日付計算・subtask クエリを本ユニットに実装せず（RecurrenceRoller/SubtaskGuard インタフェース経由）。永続化なし（R6）。
- **CompleteOutcome が C10/domain-entities と完全一致**（4 variant, フィールド名一致）。
- **外部依存の追加ゼロ**: types/task-model のみ import、標準 `Date` のみ。`Result<T,AppError>` で throw なし・silent failure なし（ADR-9）。
- **テスト網羅（24件）**: transition/糖衣/complete 全分岐（blocked・非blocked・recurred・recurrence-ended・fallthrough・エラー伝播・優先順）。136 pass / 0 fail、tsc・lint クリーン。

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| — | — | — | No findings | — |

### Summary

code-generation 出力は **そのまま実装・デプロイ可能**。6 検証基準（5状態再利用／updated・created／糖衣合成／done 分岐委譲・R5 境界／依存ゼロ／Result エラー処理）をすべて満たす。依存性逆転（RecurrenceRoller/SubtaskGuard）は教科書的で、U-state-management は単独でコンパイル・テスト可能、後続ユニットが実装を供給し TaskService が配線する。Blocking/Major なし。**READY**。
