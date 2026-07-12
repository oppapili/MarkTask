# Code Generation Plan — U-query-search

> Construction / code-generation（unit: U-query-search, library）。上流参照: `../functional-design/business-logic-model.md`, `../functional-design/business-rules.md`, `../functional-design/domain-entities.md`, `../nfr-requirements/tech-stack-decisions.md`, `../nfr-requirements/security-requirements.md`, `../../../inception/units-generation/unit-of-work.md`, `../../../inception/requirements-analysis/requirements.md`（FR-F）。
> スタック: TypeScript + bun / 標準 Array 操作 / bun:test / Prettier + ESLint。外部依存の追加ゼロ（tech-stack-decisions）。実コードはワークスペース root（`src/core/`）。Test Strategy=Standard（コア重点）。

## 統合コンテキスト（既存 task-core との結線）

- QueryService は task-core の `TaskRepository` を単一 I/O 境界（INV4）として読むだけ。副作用なし。
- **重要な結線ギャップ**: 現行 `TaskRepository` は `listRefs(): Result<string[]>` ＋ `read(ref): Promise<Result<Task>>` を公開し、`list(): Task[]` / `listArchived(): Task[]` は未実装。functional-design の擬似コード `repo.list()` / `repo.listArchived()` はこの2メソッドで満たす。
  - 方針: `TaskRepository` に `list(): Promise<Result<Task[]>>`（tasksDir 直下を列挙し decode）と `listArchived(): Promise<Result<Task[]>>`（archiveDir を列挙し decode）を **in-place 追記**（重複ファイル禁止, brownfield 修正）。I/O を repository に閉じ INV4 を維持。
  - フィルタ/ソート/検索本体は `Task[]` を受ける純粋関数として実装（最大限テスト容易・ファイル I/O 非依存）。QueryService クラスは repo から母集合をロードし純粋関数を合成する薄いオーケストレータ。

## 実装ステップ（順次・チェックボックス）

- [x] **Step 1: リポジトリ列挙 API の補完**（`src/core/repository.ts` を in-place 修正）
  - `list(): Promise<Result<Task[]>>` — `listRefs()` → 各 ref を `read()` → `Task[]`。個別 decode 失敗は `io` エラーで返す（silent skip しない, construction guardrail）。
  - `listArchived(): Promise<Result<Task[]>>` — `archiveDir` を走査（存在しなければ空配列）、各 `.md` を decode。archive 内は既定除外の対象なので `includeArchived` 指定時のみ呼ばれる。
  - `index.ts` のエクスポートは既に `TaskRepository` を出しているため追加不要（メソッド追加のみ）。
- [x] **Step 2: クエリ用値オブジェクト型**（`src/core/query.ts`）
  - `TaskFilter`（status?: Status[] / dueBefore?: string / priority?: Priority[] / tags?: string[] / project?: string / includeArchived?: boolean）, `Sort`（key: 'due'|'priority'|'created'|'status' / dir: 'asc'|'desc' / nullsLast?: boolean）, `DEFAULT_SORT = { key:'due', dir:'asc', nullsLast:true }`（domain-entities.md 準拠）。
- [x] **Step 3: 純粋関数（filter / sort / search）**（`src/core/query.ts`）
  - `matches(t: Task, f: TaskFilter): boolean` — AND 合成（R2）。未指定条件は恒真。tags は部分集合（R3, `f.tags ⊆ t.tags`）。dueBefore は `t.due != null && t.due <= f.dueBefore`（R4, `<=` 包含）。status/priority は配列包含。project は完全一致。
  - `filterTasks(tasks, f): Task[]` — `tasks.filter(t => matches(t, f))`。
  - `sortTasks(tasks, sort=DEFAULT_SORT): Task[]` — 安定ソート。due 未設定は nullsLast で末尾（R5）。priority は high>medium>low の意味順。同値は created 昇順を副キー。dir で昇順/降順。
  - `searchTasks(tasks, query): Task[]` — `normalize`（小文字化・trim）した query を title＋body の部分一致（R6, 大小無視）。0 件は空配列（エラーでない）。既定ソート適用。
- [x] **Step 4: QueryService クラス**（`src/core/query.ts`）
  - `constructor(repo: TaskRepository)`。
  - `list(filter?: TaskFilter, sort?: Sort): Promise<Result<Task[]>>` — 母集合 = `repo.list()`（＋ `filter.includeArchived` 時 `repo.listArchived()` を連結）→ `filterTasks` → `sortTasks`。I/O エラーは `Result` で伝播。
  - `search(query: string): Promise<Result<Task[]>>` — `repo.list()` → `searchTasks` → 既定ソート。
- [x] **Step 5: バレル エクスポート更新**（`src/core/index.ts`）
  - `QueryService`、純粋関数（`matches`/`filterTasks`/`sortTasks`/`searchTasks`）、型（`TaskFilter`/`Sort`/`DEFAULT_SORT`）を再エクスポート（in-place 追記, 重複禁止）。
- [x] **Step 6: ユニットテスト（コア重点, bun:test）**（`src/core/query.test.ts`）
  - filter: status/priority 配列包含、dueBefore 境界（`<=` 包含・due 未設定は除外）、tags 部分集合（全含む/一部欠け）、project 一致、複数条件 AND、未指定＝全通過。
  - sort: due 昇順＋nullsLast（未設定末尾）、priority 意味順、created 副キー安定性、dir=desc、DEFAULT_SORT。
  - search: title ヒット・body ヒット・大小無視・部分一致・0 件空配列。
  - includeArchived: archive 分の加算／既定除外。
  - repository.list()/listArchived(): 列挙→decode の happy path＋空ディレクトリ。
- [x] **Step 7: 検証**
  - `bun test`（既存 + 新規が green）／`bunx tsc --noEmit`（型エラー無し）／`eslint src/`（違反無し）。sensors（linter/type-check）に適合。

## Story トレーサビリティ

| Step | Story / FR |
|---|---|
| Step 3 `filterTasks`/`matches` | US-5.1（フィルタ）, FR-F1（status/due/priority/tags/project） |
| Step 3 `searchTasks` | US-5.1（検索）, FR-F2（title+body 部分一致・大小無視） |
| Step 3 `sortTasks` | US-1.3（一覧 既定 due 昇順）, FR-F3（--sort 切替） |
| Step 1/Step 4 母集合 | FR-F4（trash/archive 既定除外・--archived 加算）, US-1.3 |
| Step 6 | team-practices（コア重点テスト） |

## 備考

- QueryService は Task[] を返すのみ。列・記号・色・`--json` 整形は OutputFormatter/アダプタ（U-cli/U-mcp）の責務（R7）。
- インデックス DB は持たず O(n) 走査（R8, ADR-4, NFR-3 数千件）。将来ボトルネック化時にキャッシュ追加可（可逆）。
- 完全・実行可能なファイルを生成（プレースホルダ放置禁止, construction guardrail）。エラーは `Result<T, AppError>` で境界に surface（ADR-9）。
