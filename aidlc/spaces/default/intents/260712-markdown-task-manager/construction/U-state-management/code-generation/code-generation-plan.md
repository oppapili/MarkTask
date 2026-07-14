# Code Generation Plan — U-state-management

> Construction / code-generation（unit: U-state-management, library）。上流参照: `../functional-design/business-logic-model.md`, `../functional-design/business-rules.md`, `../functional-design/domain-entities.md`, `../nfr-requirements/tech-stack-decisions.md`, `../../../inception/units-generation/unit-of-work.md`, `../../../inception/requirements-analysis/requirements.md`（FR-B）。
> スタック: TypeScript + bun / bun:test / Prettier + ESLint。外部依存の追加ゼロ。実コードはワークスペース root（`src/core/`）。Test Strategy=Standard（コア重点）。

## 統合コンテキスト（既存 task-core との結線）

- `src/core/types.ts` に `Status`（5値: todo/in-progress/done/waiting/cancelled）・`Task`・`Result<T,AppError>`・`AppError`（kinds に `guard-blocked` あり）が既存。新規型は不要（Status は再利用）。
- `src/core/task-model.ts` に `assertValidStatus(value): Result<Status, AppError>` が既存。**DRY のため再利用**（重複実装しない）。
- **委譲境界**: `done` の分岐は U-recurrence（`rollForward`）と U-subtasks（`canComplete`）に委譲するが、両ユニットは未生成。よって本ユニットは**依存インタフェース**（dependency inversion）を定義し、注入された実装に委譲する。これにより U-state-management は単独でコンパイル・ユニットテスト（モック deps）可能。実配線は後続の TaskService/アダプタ（U-cli/U-mcp）が担う。
- `CompleteOutcome`（4 variant 判別共用体）は component-methods C10 と domain-entities に一致させる。

## 実装ステップ（順次・チェックボックス）

- [x] **Step 1: StateMachine コア**（`src/core/state-machine.ts` 新規）
  - `nowIso(): string` — `new Date().toISOString()`（テスト用に差し替え可能な純粋境界。内部 helper）。
  - `transition(task: Task, to: Status): Result<Task, AppError>` — `assertValidStatus(to)`（task-model 再利用）→ 不正なら error 伝播。正常なら**新しい Task オブジェクト**を返す（`{ ...task, status: to, updated: nowIso() }`）。`created` は不変（R3）。副作用なし（純粋寄り, team-practices）。
  - 糖衣 use-case（薄いアダプタ, R2/§1）: `start(task)=transition(task,'in-progress')`, `wait(task)=transition(task,'waiting')`, `cancel(task)=transition(task,'cancelled')`, `setState(task, s)=transition(task, s)`。
- [x] **Step 2: 依存インタフェースと done 分岐**（`src/core/state-machine.ts`）
  - `CompleteOutcome` 型（domain-entities/C10 準拠）:
    ```ts
    type CompleteOutcome =
      | { kind: 'completed'; task: Task }
      | { kind: 'recurred'; task: Task; nextDue: string }
      | { kind: 'recurrence-ended'; task: Task }
      | { kind: 'guard-blocked'; blocking: Task[] };
    ```
  - 依存インタフェース（dependency inversion, 後続ユニットが実装）:
    ```ts
    interface RecurrenceRoller { rollForward(task: Task): Result<CompleteOutcome, AppError>; }
    interface SubtaskGuard { canComplete(ref: string): Result<{ blocked: boolean; blocking: Task[] }, AppError>; }
    interface CompleteDeps { recurrence?: RecurrenceRoller; subtasks?: SubtaskGuard; }
    ```
  - `complete(task: Task, deps?: CompleteDeps): Result<CompleteOutcome, AppError>` — done 分岐（§2/R4）:
    1. `deps.subtasks` があれば `canComplete(task.ref)` を評価。`blocked` なら `{ kind:'guard-blocked', blocking }`（FR-G2）。
    2. `task.type==='recurrence' && task.repeat` かつ `deps.recurrence` があれば `rollForward(task)` に委譲（recurred / recurrence-ended を返す, FR-E4）。
    3. それ以外は `transition(task,'done')` → `{ kind:'completed', task }`。
  - recurrence 固有計算・親子ガード判定は**本ユニットに実装しない**（R5）。永続化もしない（R6, Task を返すのみ）。
- [x] **Step 3: バレル エクスポート更新**（`src/core/index.ts` in-place 追記）
  - `transition`/`start`/`wait`/`cancel`/`setState`/`complete` と型（`CompleteOutcome`/`RecurrenceRoller`/`SubtaskGuard`/`CompleteDeps`）を再エクスポート（重複禁止）。
- [x] **Step 4: ユニットテスト（コア重点, bun:test）**（`src/core/state-machine.test.ts` 新規）
  - transition: 各状態への遷移で `status` 更新＋`updated` が変化・`created` 不変。不正状態値は error（許容値提示, FR-B3）。元 Task を破壊しない（新オブジェクト返却）。
  - 糖衣: start→in-progress / wait→waiting / cancel→cancelled / setState 任意値。
  - complete 分岐: (a) 通常 done→`completed`、(b) subtasks モックが blocked→`guard-blocked`＋blocking、(c) subtasks 非 blocked→通常 done、(d) recurrence タスク＋repeat＋recurrence モック→`recurred`（nextDue）/`recurrence-ended`、(e) deps 未注入時は通常 done。
- [x] **Step 5: 検証**
  - `bun test`（既存 112 ＋新規が green）／`bunx tsc --noEmit`（型エラー無し）／`eslint src/`（違反無し）。sensors（linter/type-check）適合。

## Story トレーサビリティ

| Step | Story / FR |
|---|---|
| Step 1 `transition`/糖衣 | US-1.2（状態を進める）, FR-B2（updated 更新）, FR-B3（不正値エラー） |
| Step 2 `complete` 分岐 | US-3.2（recurrence 完了の一次遷移, FR-E4）, US-4.2（親ガード連携, FR-G2） |
| Step 4 | team-practices（コア重点テスト・状態遷移を厚く） |

## 備考

- StateMachine は Task を受け取り Task/CompleteOutcome を返す純粋関数寄り（副作用なし・厚くテスト）。永続化は TaskService 経由の Repository.write（task-core, R6）。
- `assertValidStatus` は task-model の既存実装を再利用（SSOT・DRY）。エラー kind は既存踏襲。
- 完全・実行可能なファイルを生成（プレースホルダ放置禁止）。エラーは `Result<T,AppError>` で境界に surface（ADR-9）。
