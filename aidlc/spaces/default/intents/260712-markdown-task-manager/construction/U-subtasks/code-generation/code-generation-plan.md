# Code Generation Plan — U-subtasks

> Construction / code-generation（unit: U-subtasks, library）。上流参照: `../functional-design/business-logic-model.md`, `../functional-design/business-rules.md`, `../functional-design/domain-entities.md`, `../nfr-requirements/tech-stack-decisions.md`, `../../../inception/units-generation/unit-of-work.md`, `../../../inception/requirements-analysis/requirements.md`（FR-G）。
> スタック: TypeScript + bun / bun:test / Prettier + ESLint。外部依存の追加ゼロ。実コードは workspace root `src/core/`。Test Strategy=Standard（コア重点）。

## 統合コンテキスト（既存コードとの結線）

- `src/core/types.ts`: `Task`・`Status`・`Result<T,AppError>`・`ok`/`err`/`appError` を再利用。
- `src/core/repository.ts`: `TaskRepository.list()`（逆引き母集合）を利用（U-query-search で追記済み）。
- `src/core/state-machine.ts`: **`SubtaskGuard` インタフェース**が既存 — `canComplete(ref: string): Result<{ blocked: boolean; blocking: Task[] }, AppError>`（**同期**）。`complete()` の done 分岐から `deps.subtasks.canComplete(task.ref)` で呼ばれ、`blocked` なら `guard-blocked` を返す。
- **重要な整合判断（同期 seam vs 非同期 I/O）**: 子の逆引きは `repo.list()`（async）が必要だが SubtaskGuard.canComplete は同期。よって:
  - ガード本体は **`Task[]` スナップショット上の純粋関数**として実装（同期・I/O 非依存・厚くテスト容易）。
  - **`asSubtaskGuard(tasks: Task[]): SubtaskGuard`** ファクトリで同期 seam を満たす（TaskService が一度 `repo.list()` してスナップショットを注入）。
  - repo ベースの async 便宜メソッド（`list --parent` 等）は別途 `SubtaskService` に用意。
- **フィールド命名**: 設計 domain-entities の `GuardResult { ok, blocking }` は、`Result<T>` の `.ok`（成否）と二重意味になり紛らわしいため、seam に合わせ **`{ blocked, blocking }`**（`blocked = !ok`）で統一する（後述 Deviations）。

## 実装ステップ（順次・チェックボックス）

- [x] **Step 1: 親子リンク解釈 helper**（`src/core/subtasks.ts` 新規）
  - `parseParentRef(parent: string | undefined): string | null` — `"[[<ref>]]"` → `<ref>`、未設定は null（R1）。
  - `isBlockingStatus(status: Status): boolean` — `todo|in-progress|waiting` は true、`done|cancelled` は false（OQ-4, R3）。
- [x] **Step 2: 純粋な逆引き・ガード（スナップショット上）**（`src/core/subtasks.ts`）
  - `childrenOf(parentRef: string, tasks: Task[]): Task[]` — `tasks.filter(t => parseParentRef(t.parent) === parentRef)`（FR-G3）。
  - `canComplete(parentRef: string, tasks: Task[], visited?: Set<string>): { blocked: boolean; blocking: Task[] }`（FR-G2/G4, R2/R4/R5）:
    - `visited` で循環保護（訪問済み ref はスキップ, R5）。
    - 各子について `isBlockingStatus` なら blocking に追加。子自身が親（子を持つ）なら再帰して子孫の blocking を集約（多階層）。
    - `blocked = blocking.length > 0`。存在しない親は children 空 → `{ blocked:false, blocking:[] }`（R8, 例外投げない）。
  - `asSubtaskGuard(tasks: Task[]): SubtaskGuard` — `{ canComplete: (ref) => ok(canComplete(ref, tasks)) }`（state-machine の同期 seam を満たす）。
- [x] **Step 3: SubtaskService（repo ベース async 便宜）**（`src/core/subtasks.ts`）
  - `constructor(repo: TaskRepository)`。
  - `children(parentRef: string): Promise<Result<Task[], AppError>>` — `repo.list()` → `childrenOf`。`io` は Result 伝播（R6, 存在しない親は空）。
  - `canComplete(parentRef: string): Promise<Result<{ blocked: boolean; blocking: Task[] }, AppError>>` — `repo.list()` を1回 → 純粋 `canComplete` に委譲（standalone/CLI 検証用）。
  - 本 unit は**読取のみ・副作用なし**（親完了で子を自動変更しない, R7）。`--force` 上書きはガード呼び出し側（U-cli/TaskService）の責務（R6）。
- [x] **Step 4: バレル エクスポート更新**（`src/core/index.ts` in-place）
  - `SubtaskService`・`childrenOf`・`canComplete`（純粋版）・`asSubtaskGuard`・`parseParentRef`・`isBlockingStatus` を再エクスポート（重複禁止）。純粋 `canComplete` は名前衝突回避のため **`canCompleteParent`** 別名で公開。
- [x] **Step 5: ユニットテスト（コア重点, bun:test）**（`src/core/subtasks.test.ts` 新規）
  - parseParentRef: wikilink 解除・未設定 null・不正形式。
  - childrenOf: parent 一致で抽出・無関係除外・存在しない親は空。
  - canComplete（純粋・スナップショット）: 全子 done/cancelled → blocked=false／todo/in-progress/waiting のいずれか未完 → blocked=true＋blocking 提示／多階層（孫未完で親 blocked, 再帰）／循環リンク（visited で無限再帰しない）／子なし → blocked=false。
  - asSubtaskGuard: seam 経由で `{ blocked, blocking }` を返す。
  - seam smoke: `complete(parentTask, { subtasks: asSubtaskGuard(tasks) })`（state-machine）→ 未完子ありで `guard-blocked`、全完了で `completed`。
  - SubtaskService（async, repo モック/一時ディレクトリ）: children/canComplete が repo.list 経由で動作・io エラー伝播。
- [x] **Step 6: 検証**
  - `bun test`（既存 209 ＋新規が green）／`bunx tsc --noEmit`／`eslint src/`。sensors（linter/type-check）適合。

## Story トレーサビリティ

| Step | Story / FR |
|---|---|
| Step 2 childrenOf | US-4.1（親子リンク）, FR-G3 |
| Step 2 canComplete/asSubtaskGuard | US-4.2（完了ガード）, FR-G2/G4, OQ-4 |
| Step 2 循環保護 | R5（不正データ耐性） |
| Step 5 | team-practices（コア重点・ガード再帰を厚く） |

## 備考

- 純粋 canComplete はスナップショット（Task[]）上で動作 → 同期 SubtaskGuard seam を満たし、モック不要で厚くテスト可能。async SubtaskService は `list --parent`/standalone 用の便宜。
- 読取のみ・副作用なし（R7）。永続化・状態変更・`--force` 上書きは呼び出し側（TaskService/U-cli）。
- 完全・実行可能なファイル（プレースホルダ禁止）。エラーは `Result<T,AppError>`（io）で境界に surface。
