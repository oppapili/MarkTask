# Code Summary — U-mcp（最終ユニット）

> Construction / code-generation（unit: U-mcp, service）。実コードは workspace root `src/mcp/`（＋共有 TaskService への薄い追加）。上流参照: `./code-generation-plan.md`, `../functional-design/*`, `../nfr-requirements/tech-stack-decisions.md`, `../../../inception/requirements-analysis/requirements.md`（FR-H）。

## 生成/変更ファイル

- `src/core/task-service.ts`（更新）— `setRecurrence(ref, repeat: string|null)` を追加（`updateTask(ref, { repeat })` に委譲、R11 type 整合込み。CLI/MCP 共有 API）。
- `src/mcp/handlers.ts`（新規, 528 行）— テスト可能な純ディスパッチ＋変換層。
  - `toTaskJson`/`toListJson`（{tasks,count}）/`toCompleteJson`（kind/ref/status/nextDue?/blocking?）/`errorToStructured`（not-found/ambiguous+candidates/invalid-repeat+reason/guard-blocked/io/config）。
  - `TOOL_DEFS`（10 ツールの name/description/inputSchema= JSON Schema, zod 不使用）。
  - `dispatchTool(service, name, args)` — 必須引数を手動検証（欠如/型不正→`invalid-input` 構造化, R7）→ TaskService 呼出→構造化 JSON。delete は confirm 不要＋trash パス（R4/FR-H4）、complete は CompleteOutcome→構造化（guard-blocked は blocking refs）。**例外を投げず**全て構造化結果（R5・決定的）。
- `src/mcp/index.ts`（スタブ→実装, 74 行, shebang）— `Server({name:'marktask'})` に ListTools（TOOL_DEFS）/CallTool（dispatchTool へ委譲）を登録、`StdioServerTransport` で connect。起動は CLI と同一構成（loadConfig→resolvePaths→TaskRepository→TaskService）。stdout は JSON-RPC 専用・ログは stderr。
- `src/mcp/handlers.test.ts`（新規, 523 行, bun:test）— 50 テスト。

## 主要な実装判断

- **コア共有（R1, project.md Mandated）**: MCP はロジックを持たず、CLI と同一の `TaskService` を呼ぶだけ。挙動一致を dispatchTool 結合テストで担保。
- **低レベル Server API＋手動検証で zod 直接依存を回避**（principles: 不要な依存を増やさない）。追加依存は `@modelcontextprotocol/sdk@1.29.0` のみ。
- **テスト可能化**: `dispatchTool` を純ロジックに切り出し、stdio 起動なしで一時ディレクトリの実 TaskService に対して検証（CLI の `run(argv)` パターンに倣う）。
- **決定的エラー（R5）**: 失敗は例外でなく構造化エラー。`ambiguous` は候補配列で AI が選び直せる。
- **セキュリティ境界（R6/SC）**: `StdioServerTransport` のみ＝ネットワークソケットを開かない・認証なし（ローカル単一ユーザー）・外部送信なし。stdout 汚染防止（ログは stderr）。
- **`structuredContent` 非採用**: SDK 1.29.0 の `CallToolResult` 型に含まれないため、標準の `content:[{type:'text', text: JSON.stringify(result)}]` で構造化データを返す（プラン記載の実装詳細）。
- **invalid-repeat の surface 経路**: repeat は addTask/updateTask では pass-through（task-model R7）、完了時に RecurrenceEngine が検証して `invalid-repeat` が出る（completeTask 経路）。テストで確認。

## テスト結果（検証済み）

- **`bun test`: 356 pass / 0 fail**（新規 +50、既存 306 を維持）。全 10 ツール（create/list/get/update/complete（completed/recurred/guard-blocked）/state/search/delete（trash 含む）/archive/recurrence_set（設定/解除））＋エラー正規化（not-found/ambiguous+candidates/invalid-repeat/guard-blocked/引数欠如 invalid-input）＋構造化 JSON 形状（安定キー・装飾なし・例外を投げない）。
- **`bunx tsc --noEmit`: エラーなし**、**`eslint src/`: 違反なし**。sensors（linter/type-check）適合。
- **起動 smoke**: stdio サーバが初期化し `[marktask-mcp] Server ready (stdio)` を stderr に出力。

## プランからの逸脱

- `structuredContent` はレスポンスに含めず `content[text]` に JSON を格納（SDK 1.29.0 の型制約, 標準 MCP パターン）。それ以外の逸脱なし（Step 1〜6 実装, 全チェックボックス `[x]`）。

## Review

**Reviewer:** aidlc-architecture-reviewer-agent
**Verdict:** READY
**Date:** 2026-07-14T15:26:54Z
**Iteration:** 1

### Strengths

- **薄いアダプタ厳守（R1, Mandated）**: dispatchTool は 10 ハンドラで TaskService へ委譲するだけ、ビジネスロジック/I/O なし。CLI と同一コア。
- **ツール網羅（R2, FR-H2）**: 10 ツール（create/list/get/update/complete/state/search/delete/archive/recurrence_set）＋setRecurrence を TaskService に追加（updateTask 委譲, R11 保持）。
- **構造化 JSON（R3, FR-H3）**: 安定キー、任意フィールドは null 明示、list/search→{tasks,count}、complete→{kind,...}。
- **delete no-confirm＋trash（R4/FR-H4）**、**決定的エラー（R5）**: errorToStructured で 6 種正規化、ambiguous は candidates、throw なし（引数不正→invalid-input）。
- **セキュリティ境界（R6/SC）**: StdioServerTransport のみ・ネットワーク/認証/外部送信なし、stdout は JSON-RPC 専用・ログ stderr。
- **依存最小**: @modelcontextprotocol/sdk のみ（zod 直接依存なし）。tsc/eslint クリーン。
- **テスト 50 件**: 実 TaskService（temp dir）で全ツール＋エラー正規化、CLI 挙動一致。356 pass/0 fail。

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | index.ts:57 | `structuredContent` 非採用、`content[text]` に JSON（SDK 1.29.0 型制約） | 標準 MCP パターンで許容。将来 SDK 対応時に移行検討。 |
| 2 | Minor | handlers.ts:282-291 | dispatchTool の try-catch セーフティネットの `internal` エラー形状が McpError union 未記載 | 防御的実装として許容。domain-entities に注記推奨。 |

### Summary

**そのまま実装・デプロイ可能**。共有 TaskService 上の正しい薄いアダプタで、全 10 ツール・構造化 I/O・delete trash・決定的エラー・stdio ローカル境界・最小依存・50 テスト（CLI 挙動一致）を満たす。2 Finding は許容範囲の実装詳細。setRecurrence 統合点・CompleteOutcome マッピングは型整合。356/356 green・tsc/lint クリーン・stdio smoke 起動確認。**READY** to advance to build-and-test.
