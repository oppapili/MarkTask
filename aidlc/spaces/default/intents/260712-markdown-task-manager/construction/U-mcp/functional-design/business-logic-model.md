# Business Logic Model — U-mcp

> Construction / functional-design（unit: U-mcp, service）。上流参照: `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/units-generation/unit-of-work-story-map.md`, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-H）, `../../../inception/application-design/components.md`（components）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/application-design/services.md`（services）。
> 対象: MCP アダプタ（@modelcontextprotocol/sdk, stdio ローカル・非公開）。**薄いアダプタ**（TaskService 共有, Mandated）。

## 1. サーバ起動・ツール登録（FR-H1,H2）

```
server = McpServer(transport=stdio)
register 'marktask.create'   {title, due?, priority?, tags?, project?, repeat?, parent?} -> addTask
register 'marktask.list'     {status?, due_before?, priority?, tag?, project?, archived?} -> list
register 'marktask.get'      {ref} -> getByRef
register 'marktask.update'   {ref, fields} -> updateTask
register 'marktask.complete' {ref} -> complete
register 'marktask.state'    {ref, value} -> changeState
register 'marktask.search'   {query} -> search
register 'marktask.delete'   {ref} -> softDelete          # ソフト削除ゆえ confirm 不要（FR-H4）
register 'marktask.archive'  {ref} -> archive
register 'marktask.recurrence_set' {ref, repeat|null} -> setRecurrence
server.start()
```
- 各ハンドラは引数を検証して TaskService を呼び、結果を**構造化 JSON**へ変換して返す（FR-H3）。

## 2. 結果→構造化レスポンス（FR-H3）

```
onOk(value): return toStructured(value)     # 例: { ref, status, due, priority, title }
list/search: return { tasks: [...], count }
complete: CompleteOutcome を { kind, ref, status, nextDue?, blocking? } へ
delete: { ref, status:'deleted', trash }     # 復旧経路を含む
```
- OutputFormatter の人間向け整形は使わず、JSON シリアライズを用いる（アダプタ差）。

## 3. エラー→構造化エラー結果（ADR-9）

```
onErr(AppError):
  not-found -> { error:'not-found', ref }
  ambiguous -> { error:'ambiguous', candidates:[...] }    # AI が選び直せる（決定的）
  invalid-repeat -> { error:'invalid-repeat', reason }
  guard-blocked -> { error:'guard-blocked', blocking:[...] }
  io|config -> { error:'io'|'config', message }
```
- 例外を投げず、MCP のツール結果としてエラーを返す（非対話・決定的挙動, FR-H）。

## 4. コア共有の担保

- CLI と同一の TaskService インスタンス構成を使う（project.md Mandated）。ロジックは持たない。挙動一致は結合テストで検証（team-practices）。

## 5. セキュリティ境界

- stdio ローカル・非公開（SC 制約）。ネットワーク公開なし・認証なし（ローカル単一ユーザー）。外部送信なし。

<!-- Text fallback: U-mcpはMCP SDK(stdio)でcreate/list/get/update/complete/state/search/delete/archive/recurrence_setを登録し各ハンドラはTaskServiceを呼んで構造化JSONを返す。deleteはソフトゆえconfirm不要。AppErrorは構造化エラー結果(ambiguousは候補)へ、例外を投げない。CLIと同一TaskService共有(Mandated)、stdioローカル非公開・認証なし・外部送信なし。 -->

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:20:17Z
**Iteration:** 1

### Strengths

1. **Thin adapter architecture strictly enforced**: McpAdapter contains zero business logic. Every operation delegates directly to TaskService (shared with CLI per project.md Mandated). The §2 result mapping and §3 error normalization confirm this is a presentation-layer adapter, not a reimplementation. This satisfies verification criterion (a).

2. **Tool surface matches FR-H2 exactly**: The §1 registration block lists all 10 operations from requirements Q7=B+C — create/list/get/update/complete/state/search/**delete**/archive/**recurrence_set**. The delete tool is present (FR-H4 soft-delete, no confirm), and recurrence_set is present (the Q7=C explicit choice). Verification criterion (b) satisfied.

3. **Structured JSON I/O with no human formatting**: §2 shows `toStructured` producing {ref, status, due, priority, title} JSON shapes. The prose explicitly notes "OutputFormatter の人間向け整形は使わず、JSON シリアライズを用いる（アダプタ差）." Matches FR-H3; verification criterion (c) satisfied.

4. **Delete returns trash path, no extra confirm**: §1 comment "ソフト削除ゆえ confirm 不要（FR-H4）" and the delete error result in §3 shows `{ ref, status:'deleted', trash }` returning the recovery path. Aligns with requirements Q9=B and FR-I1. Verification criterion (d) satisfied.

5. **Deterministic error handling for AI consumers**: §3 error results are structured — `not-found`, `ambiguous` with candidates array, `invalid-repeat` with reason, `guard-blocked` with blocking list. The prose states "例外を投げず、MCP のツール結果としてエラーを返す（非対話・決定的挙動, FR-H）." The ambiguous case returns candidates so AI can pick without throwing (overconfidence avoidance from FR-D5). Verification criterion (e) satisfied.

6. **stdio local/non-public, no network exposure**: §5 Security boundary confirms "stdio ローカル・非公開（SC 制約）。ネットワーク公開なし・認証なし（ローカル単一ユーザー）。外部送信なし." Acceptable for a local single-user tool as verification criterion (f) notes. No exfiltration risk implied.

7. **Matches component-methods McpAdapter contract**: component-methods.md doesn't explicitly show an `McpAdapter` signature block (it shows C10 TaskService as the shared Core API), but the tool→TaskService mapping table in domain-entities.md matches what component-methods shows for TaskService (`addTask`, `list`, `getByRef`, `updateTask`, `complete`, `changeState`, `search`, `softDelete`, `archive`, `setRecurrence`). The adapter is correctly positioned as a protocol translator, not a new service. Verification criterion (g) satisfied (cross-reference via components.md C10/A2 and services.md S3).

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | business-logic-model.md §1 | Registration block shows tool names as `'marktask.create'`, `'marktask.list'` etc but doesn't specify the MCP SDK `Tool` definition contract (input schema, output schema) — the text says "引数を検証して TaskService を呼び、結果を**構造化 JSON**へ変換" but the explicit JSON schema for each tool is deferred | Acceptable for Standard depth functional-design — the domain-entities.md tool contract table maps args→TaskService→result for all 10 tools, which gives code-generation enough detail. If MCP SDK requires explicit Zod/JSON-schema per tool at registration, code-generation can derive those from the table. Not blocking. |
| 2 | Minor | business-rules.md R7 | "引数検証: 必須引数の欠如・型不正はツール実行前に検証し、構造化エラーで返す" — the validation timing ("実行前") suggests MCP SDK-level input schema validation, but §3 error types in business-logic-model don't show a generic `invalid-input` error kind (only `not-found`, `ambiguous`, `invalid-repeat`, `guard-blocked`, `io`, `config`) | MCP SDK input-schema validation likely returns MCP-protocol-level errors before the tool handler runs, so the design-stated `AppError` union might not need an `invalid-input` case — those errors never reach the tool handler. If input validation does need to be surfaced as a structured tool result (not a protocol error), add `{ error:'invalid-input'; field: string; reason: string }` to the McpError union in domain-entities. Clarify at code-generation whether MCP SDK handles this or tool handler does. Minor inconsistency, not blocking. |

### Summary

The design is **implementable by code-generation without further architectural clarification**. A developer can read the 10-tool registration block, the TaskService delegation pattern, the structured JSON mapping, and the error normalization rules, and write the McpAdapter against @modelcontextprotocol/sdk stdio transport. The adapter is demonstrably thin (verification criterion a), the tool surface is complete (b), I/O is structured JSON (c), delete behavior matches requirements (d), errors are deterministic (e), stdio is local-only (f), and the design traces cleanly to components.md A2 McpAdapter + component-methods C10 TaskService (g).

The two findings are input-schema formalization (MCP SDK Tool definitions) and input-validation error-kind routing — both are code-generation details that don't expose architectural gaps. The functional design has covered the critical decisions: what tools to expose, what TaskService methods they call, what structured results they return, how errors map, and that the adapter carries no logic. The domain-entities tool contract table is precise enough to code from.

**READY to advance to code-generation.** The MCP adapter will be a ~150-line thin translation layer over TaskService with no surprises.
