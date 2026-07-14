# Code Generation Plan — U-mcp（最終ユニット）

> Construction / code-generation（unit: U-mcp, service）。上流参照: `../functional-design/business-logic-model.md`, `../functional-design/business-rules.md`, `../functional-design/domain-entities.md`, `../nfr-requirements/tech-stack-decisions.md`, `../../../inception/units-generation/unit-of-work.md`, `../../../inception/requirements-analysis/requirements.md`（FR-H）。
> スタック: TypeScript + bun / **@modelcontextprotocol/sdk@1.29.0**（stdio, 追加済み）/ bun:test / Prettier + ESLint。実コードは workspace root `src/mcp/`。薄いアダプタ（TaskService 共有, project.md Mandated）。

## 統合コンテキスト（結線）

- **CLI と同一の共有 TaskService（`src/core/task-service.ts`）を再利用**（Mandated）。MCP はロジックを持たず TaskService を呼び、結果を構造化 JSON へ変換するだけ（R1/R3）。
- **`setRecurrence` の補完**: ツール `marktask.recurrence_set` は `setRecurrence(ref, repeat|null)` に対応するが TaskService に未定義。`updateTask(ref, { repeat })`（R11 type 整合込み）に委譲する薄い `setRecurrence` を **`src/core/task-service.ts` に in-place 追加**（CLI/MCP 共有 API・component-methods C10 整合）。
- **SDK は低レベル Server API を使用**（zod 直接依存を避ける＝不要な依存を増やさない, principles）: `Server` + `setRequestHandler(ListToolsRequestSchema / CallToolRequestSchema)`。ツール入力スキーマは JSON Schema（inputSchema）で宣言し、引数検証はハンドラ内で手動（R7・サイレント失敗禁止）。

## 実装ステップ（順次・チェックボックス）

- [x] **Step 1: TaskService.setRecurrence 補完**（`src/core/task-service.ts` in-place）
  - `setRecurrence(ref, repeat: string | null): Promise<Result<Task, AppError>>` — `updateTask(ref, { repeat })` に委譲（repeat=null で解除→type=task, R11）。バレル/型はそのまま。
- [x] **Step 2: 構造化変換・ツールディスパッチ（テスト可能な純ロジック）**（`src/mcp/handlers.ts` 新規）
  - `toTaskJson(task): {...}`（ref/status/due/priority/title/type/tags/project/repeat/last_done/body）。`toListJson(tasks): { tasks, count }`。`toCompleteJson(outcome): { kind, ref, status, nextDue?, blocking? }`。
  - `errorToStructured(e: AppError): McpError`（not-found{ref} / ambiguous{candidates} / invalid-repeat{reason} / guard-blocked{blocking} / io|config{message}）。
  - `TOOL_DEFS`: 10 ツールの `{ name, description, inputSchema(JSON Schema) }`（create/list/get/update/complete/state/search/delete/archive/recurrence_set, FR-H2, R2）。
  - `dispatchTool(service: TaskService, name: string, args: unknown): Promise<{ structuredContent }>` — 必須引数検証（欠如/型不正は構造化エラー, R7）→ TaskService 呼び出し → 構造化 JSON。delete は confirm 不要・trash パス含む（R4/FR-H4）。complete は CompleteOutcome→構造化（guard-blocked は blocking 提示）。例外を投げず全て構造化結果で返す（R5・決定的）。
- [x] **Step 3: MCP サーバ配線**（`src/mcp/index.ts` を実装, shebang `#!/usr/bin/env bun`）
  - `Server({ name:'marktask', version })` に `ListToolsRequestSchema`（TOOL_DEFS 返却）・`CallToolRequestSchema`（`dispatchTool` へ委譲, 結果を `{ content:[{type:'text', text: JSON.stringify(...)}], structuredContent }` で返す）を登録。
  - 起動時 `loadConfig`→`resolvePaths(cwd)`→`new TaskRepository`→`new TaskService`（CLI と同一構成）。
  - `StdioServerTransport` で `server.connect(transport)`。stdio ローカルのみ・ネットワーク公開/認証/外部送信なし（R6/SC）。
  - `main()` を起動しエラーは stderr（stdout は JSON-RPC 専用）。
- [x] **Step 4: バレル/エクスポート**（必要に応じ `src/mcp` から `dispatchTool`/`TOOL_DEFS` をテスト用に export）。
- [x] **Step 5: テスト（bun:test）**（`src/mcp/handlers.test.ts` 新規）
  - 一時ディレクトリの実 Repository＋TaskService で `dispatchTool` を検証（**CLI と挙動一致**を担保, R1）: create/list/get/update/complete（recurred/guard-blocked/completed）/state/search/delete（trash 含む）/archive/recurrence_set。
  - エラー正規化: 未検出→not-found、曖昧→ambiguous+candidates、不正 repeat→invalid-repeat、ガード→guard-blocked+blocking、引数欠如→構造化エラー（例外を投げない）。
  - 構造化 JSON 形状（人間向け装飾なし・安定キー）。
- [x] **Step 6: 検証**
  - `bun test`（既存 306 ＋新規が green）／`bunx tsc --noEmit`／`eslint src/`。sensors（linter/type-check）適合。stdio サーバは起動 smoke（初期化応答）を任意で確認。

## Story トレーサビリティ

| Step | Story / FR |
|---|---|
| Step 2/3 ツール登録・ディスパッチ | US-6.1（MCP 操作）, FR-H1/H2/H3 |
| Step 2 delete | US-6.2（安全削除）, FR-H4（confirm 不要・trash） |
| Step 2 エラー正規化 | FR-H（決定的・非対話）, FR-D5（ambiguous 候補） |
| Step 5 挙動一致 | project.md Mandated（CLI/MCP コア共有） |

## 備考

- 低レベル Server API＋手動検証で zod 直接依存を回避（追加依存は @modelcontextprotocol/sdk のみ）。
- `dispatchTool` を純ロジックに切り出し stdio 起動なしでユニットテスト（CLI の `run(argv)` パターンに倣う）。
- 薄いアダプタ・ビジネスロジック/ファイル I/O なし（R1）。例外を投げず構造化エラー結果（R5）。
- 完全・実行可能なファイル（プレースホルダ禁止）。stdio ローカル非公開・認証なし・外部送信なし（SC 制約, セキュリティ境界）。
