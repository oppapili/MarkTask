# Code Generation Plan — U-cli（統合キーストーン）

> Construction / code-generation（unit: U-cli, service）。上流参照: `../functional-design/business-logic-model.md`, `../functional-design/business-rules.md`, `../functional-design/domain-entities.md`, `../nfr-requirements/*`, `../../../inception/units-generation/unit-of-work.md`, `../../../inception/requirements-analysis/requirements.md`（FR-D）。
> スタック: TypeScript + bun / **commander@12.1.0**（追加済み）/ date-fns（相対日付）/ bun:test / Prettier + ESLint。実コードは workspace root（`src/core/` に共有 TaskService、`src/cli/` に CLI アダプタ＋OutputFormatter）。Test Strategy=Standard。

## 統合コンテキスト（結線の要）

- **project.md Mandated**: CLI と MCP はコアロジックを共有（両者は単一コアの薄いアダプタ）。→ **TaskService はコア（`src/core/task-service.ts`）に置き**、U-cli と U-mcp が共有する。CLI は TaskService を呼ぶだけ（R1 薄いアダプタ）。
- 既存コアを再利用（新規重複禁止）: `TaskRepository`（create/read/write/list/listRefs/resolveRef/moveToTrash/moveToArchive）, `QueryService`, `DeleteArchiveService`, `RecurrenceEngine`（RecurrenceRoller）, state-machine（`transition`/`complete`/`CompleteOutcome`）, `asSubtaskGuard`（SubtaskGuard）, `loadConfig`/`resolvePaths`, `codec`。
- **complete の結線（キーストーン）**: TaskService.complete が snapshot をロードし `complete(task, { subtasks: asSubtaskGuard(snapshot), recurrence: new RecurrenceEngine() })` を呼び、outcome に応じて永続化する。ここで recurrence/subtasks の seam が初めて実結線される。

## 実装ステップ（順次・チェックボックス）

- [x] **Step 1: config 書込 API 補完**（`src/core/config.ts` in-place）
  - `writeConfig(config: Config): Result<void, AppError>` — `~/.config/marktask/config.yaml`(XDG) に YAML で原子的書込（親ディレクトリ作成, `atomicWriteSync` 再利用可）。
  - `setConfigValue(key, value): Result<Config, AppError>` — 既存 load→該当キー更新→write→更新後 Config。未知キーは `config` エラー（exit 2 相当）。
- [x] **Step 2: TaskService（共有オーケストレーション）**（`src/core/task-service.ts` 新規）
  - `constructor(repo: TaskRepository)`（内部で QueryService/DeleteArchiveService/RecurrenceEngine を保持）。
  - `addTask(input): Promise<Result<Task>>` — repo.create(title, overrides: due/priority/tags/project/repeat/parent/body/type)。`repeat` 指定時は `type='recurrence'`（R11）。
  - `list(filter, sort): Promise<Result<Task[]>>` / `search(query): Promise<Result<Task[]>>` — QueryService へ委譲。
  - `getByRef(ref): Promise<Result<Task>>` — `listRefs`→`resolveRef`→`read`。
  - `updateTask(ref, patch): Promise<Result<Task>>` — read→メタ更新（due/priority/tags/project/repeat）→**R11 type 整合**（repeat 付与→recurrence、repeat 除去→task）→`updated=now`→write。
  - `changeState(ref, status): Promise<Result<Task>>` — read→`transition(task, status)`→write。
  - `complete(ref, opts?: { force?: boolean }): Promise<Result<CompleteOutcome>>` — read→snapshot=`repo.list()`→`deps={ subtasks: asSubtaskGuard(snapshot), recurrence: engine }`（`force` 時は subtasks を渡さずガード回避）→`complete(task, deps)`→ `guard-blocked` は**永続化せず**返す／それ以外は `outcome.task` を write（recurrence-ended で repeat 除去なら `type='task'` に整合, R11）→ outcome 返却。
  - `softDelete(ref): Promise<Result<DeleteOutcome>>` / `archive(ref): Promise<Result<ArchiveOutcome>>` — DeleteArchiveService へ委譲。
  - `getConfig()/setConfig(key,value)` — config へ委譲。
- [x] **Step 3: OutputFormatter**（`src/cli/output.ts` 新規）
  - `RenderOpts { color; relative; format:'table'|'compact'; width; limit? }`（`--json` は format enum でなく早期 JSON 出力の boolean, review Finding#2）。
  - 記号: `●`todo `◐`in-progress `✓`done `◷`waiting `⊘`cancelled（色は TTY かつ `--no-color` 未指定時のみ・記号＋文字で色なしでも判別可, R4）。
  - `renderList(tasks, opts)`（table: status/due/priority/title, title 端末幅で切り詰め, `--limit`）/ `renderCompact` / `renderTask(task)`（frontmatter＋本文）/ `renderMessage(✓/✗ 接頭辞, 状態遷移 "ref status: X -> Y")`。
  - 日付: 既定は絶対＋相対併記、`--relative` で相対のみ（date-fns `formatDistance` 等, R5）。
  - `toJson(data)`: 安定キーの JSON のみ（装飾なし, R6）。
- [x] **Step 4: CLI 配線（commander）**（`src/cli/index.ts` を実装, shebang `#!/usr/bin/env bun`）
  - `program(name='marktask')`＋短縮 `mt`（bin 経由, FR-D1）。コマンド: add/list/show/update/start/done/wait/cancel/state/search/delete/archive/config（R2, domain-entities コマンド表）。
  - 各ハンドラは **TaskService を呼ぶだけ**（ビジネス判断なし, R1）。起動時 `loadConfig`→`resolvePaths(cwd)`→`new TaskRepository`→`new TaskService`。
  - **done ハンドラ分岐**（CompleteOutcome→出力, §2）: completed/recurred/recurrence-ended/guard-blocked（未完子一覧＋exit 1、`--force` で `changeState('done')`）。
  - **exit code**（R8）: 0=成功／1=業務エラー（not-found/ambiguous/guard-blocked/invalid-repeat）／2=config・使用法。`ambiguous` は候補提示（自動決定しない, R9）。
  - stdout=結果 / stderr=エラー（`✗ ` 接頭辞＋理由＋次アクション, R10）。`--json` は JSON のみ stdout。delete/archive は即実行＋復旧ヒント（R7）。
  - `package.json` に `bin: { marktask, mt }` を追加。
- [x] **Step 5: バレル エクスポート更新**（`src/core/index.ts` in-place）— `TaskService`（＋必要な型）を再エクスポート。
- [x] **Step 6: テスト（bun:test）**
  - `src/core/task-service.test.ts`: addTask/list/search/getByRef/updateTask(R11 type 整合)/changeState/complete（completed・recurred・recurrence-ended・guard-blocked・force）/softDelete/archive/config を一時ディレクトリの実 Repository で結合的に検証（コア共有ロジックゆえ厚め）。
  - `src/cli/output.test.ts`: renderList/renderTask/renderMessage/記号/切り詰め/色無効(no-color)/相対日付/toJson。
  - exit code・ambiguous 提示はハンドラ経路の単体で確認（プロセス終了は関数戻り値で表現しテスト可能に）。
- [x] **Step 7: 検証**
  - `bun test`（既存 254 ＋新規が green）／`bunx tsc --noEmit`／`eslint src/`。`marktask add/list/done` の手動 smoke（一時 tasksDir）で E2E 疎通も確認。

## Story トレーサビリティ

| Step | Story / FR |
|---|---|
| Step 2 complete 結線 | US-3.2（recurrence 完了）, US-4.2（親ガード）, FR-B/E/G 統合 |
| Step 2 addTask/updateTask/changeState | US-1.1/1.2, US-2.1, FR-A/B/C |
| Step 4 コマンド配線 | US-1.1〜1.3, US-5.1, US-7.x, US-T.2, FR-D1/D2 |
| Step 3/4 出力・exit | FR-D4/D5, refined-mockups Q1〜Q5 |

## 備考

- TaskService はコア共有（U-mcp が同一サービスを再利用＝挙動一致）。CLI/OutputFormatter は薄いアダプタでビジネス判断なし（R1, project.md Mandated）。
- recurrence/subtasks の seam が complete でここで初めて実結線される（依存性逆転の解消点）。
- 完全・実行可能なファイル（プレースホルダ禁止）。I/O 境界のエラーは `Result<T,AppError>` で surface、CLI が exit code＋`✗`表示にマップ。
