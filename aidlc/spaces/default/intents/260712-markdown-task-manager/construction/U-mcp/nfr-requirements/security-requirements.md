# Security Requirements — U-mcp

> Construction / nfr-requirements（unit: U-mcp, service）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-H）。
> 前提: **stdio ローカル・非公開**の MCP サーバ（ネットワーク非露出, SC 制約）。

## セキュリティ要件

- **SEC-1（ネットワーク非露出ゆえ認証なしが妥当）**: MCP は stdio トランスポートのみでネットワークソケットを開かない。ローカルの単一ユーザーが起動する子プロセスであり、リモートから到達不能。**したがって認証・認可は設けない**（設ける対象がない）。⚠️ 将来ネットワーク公開（TCP/HTTP transport 等）に変える場合は、この前提が崩れるため認証・認可・TLS を必須で再設計すること（現 MVP では非該当）。
- **SEC-2（引数検証）**: ツール引数は実行前に検証（必須欠如・型不正は構造化エラーで拒否, business-rules R7）。TaskModel/TaskService の検証を通す。
- **SEC-3（決定的・非対話）**: 例外を投げず構造化エラー結果を返す。曖昧参照は候補を返す（AI が選び直せる, FR-D5）。
- **SEC-4（破壊的操作の回復性）**: delete はソフト削除（回復可能）ゆえ追加 confirm を課さない（FR-H4）。ハード削除・一括破壊操作を公開しない。
- **SEC-5（コア共有の一貫性）**: CLI と同一 core を叩くため、CLI 側のパス安全・入力検証（SEC）がそのまま効く。MCP 独自の危険経路を作らない。
- **SEC-6（秘密・外部送信なし）**: 認証情報を扱わない。外部ネットワークへ送信しない（ローカル完結）。

## テスト観点

- ツール引数検証、構造化エラー（ambiguous 候補）、delete のソフト動作、CLI と MCP の挙動一致（結合テスト）。


## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:55:07Z
**Iteration:** 1

### Strengths

1. **No-auth rationale explicitly documented (SEC-1)**: Security requirements state "MCP は stdio トランスポートのみでネットワークソケットを開かない。ローカルの単一ユーザーが起動する子プロセスであり、リモートから到達不能。**したがって認証・認可は設けない**（設ける対象がない）." This correctly justifies no authentication by the stdio/local-only transport constraint. The future-network caveat is present: "⚠️ 将来ネットワーク公開（TCP/HTTP transport 等）に変える場合は、この前提が崩れるため認証・認可・TLS を必須で再設計すること（現 MVP では非該当）." Verification criterion (b) satisfied — no-auth is not a silent omission; it's an explicit decision with documented rationale and future-upgrade warning.

2. **Input validation before execution (SEC-2)**: "ツール引数は実行前に検証（必須欠如・型不正は構造化エラーで拒否, business-rules R7）。TaskModel/TaskService の検証を通す." Aligns with business-rules.md R7 and Construction phase guardrail (silent failures forbidden). Verification criterion (b) satisfied.

3. **Deterministic, non-interactive error handling (SEC-3)**: "例外を投げず構造化エラー結果を返す。曖昧参照は候補を返す（AI が選び直せる, FR-D5）." Matches functional-design business-logic-model §3 error normalization and requirements FR-D4/D5 overconfidence avoidance. The MCP server does not throw exceptions that would crash the process; it surfaces structured error results. Verification criterion (b) satisfied.

4. **Soft-delete with no-confirm justified by recoverability (SEC-4)**: "delete はソフト削除（回復可能）ゆえ追加 confirm を課さない（FR-H4）。ハード削除・一括破壊操作を公開しない." Matches requirements Q9=B (soft delete, trash path, MCP no-confirm) and reliability-requirements.md REL-3. The documented rationale is "ソフト削除ゆえ" — the confirm is skipped because deletion is reversible. Verification criterion (b) satisfied.

5. **Shared core consistency with CLI (SEC-5)**: "CLI と同一 core を叩くため、CLI 側のパス安全・入力検証（SEC）がそのまま効く。MCP 独自の危険経路を作らない." Implements project.md Mandated rule ("ALWAYS CLI と MCP はコアロジックを共有"). The MCP adapter does not reimplement logic or bypass CLI's validation layer. Verification criterion (b) satisfied.

6. **No secrets, no external network transmission (SEC-6)**: "認証情報を扱わない。外部ネットワークへ送信しない（ローカル完結）." Consistent with stdio local-only constraint and scope-document SC boundaries. Verification criterion (b) satisfied.

7. **Performance targets reasonable for local stdio MCP**: performance-requirements.md PERF-1 "各 MCP ツールは対応する core 操作と同等のレイテンシ（単一ファイル操作は即時、list/search は数千件で実用速度, NFR-3）" — tool latency equals core-op latency because the adapter is thin. PERF-2 "JSON シリアライズ＋stdio 往復のオーバーヘッドは無視できる範囲" — reasonable for local transport. PERF-3 "サーバは常駐するがインメモリ状態を持たない（ファイルが正）" — stateless by design. Verification criterion (a) satisfied.

8. **Scalability appropriate for single-client stdio**: scalability-requirements.md SCALE-2 "単一のローカル AI クライアントを想定。多数同時接続・水平スケールは非対象。" SCALE-3 "インメモリ状態を持たず、ファイルが正。プロセス再起動で状態が失われない。" Stateless single-client model is correct for the stdio MCP server context. Verification criterion (c) satisfied.

9. **Reliability: atomic writes, structured errors, process robustness**: reliability-requirements.md REL-1 "書込は core の原子的 temp→rename（NFR-1）。MCP 経由でも部分破損を残さない." REL-2 "失敗は例外でなく構造化エラー結果で返す（AI が判定可能）。サイレント失敗禁止（construction guardrail）." REL-4 "不正リクエストでサーバが落ちない（ツールハンドラで捕捉し構造化エラー化）。1 ツール失敗が他に波及しない." REL-5 "CLI と同一 core を共有し、同一入力に同一結果（結合テストで担保, team-practices）." Verification criterion (d) satisfied — bad requests don't crash the server, CLI/MCP behavior parity is explicit, SLA N/A is acknowledged ("可用性 SLA/SLO・冗長化・DR は非該当（ローカル stdio・常駐だが単一プロセス）").

10. **Tech-stack thin adapter: @modelcontextprotocol/sdk stdio only**: tech-stack-decisions.md "MCP 実装: `@modelcontextprotocol/sdk`（stdio transport）" and "依存方針: 追加依存は **@modelcontextprotocol/sdk のみ**。ビジネスロジックは持たず TaskService に委譲。" Verification criterion (e) satisfied.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | security-requirements.md SEC-2 | Argument validation prose says "ツール引数は実行前に検証（必須欠如・型不正は構造化エラーで拒否, business-rules R7）" but doesn't specify whether validation happens at MCP SDK input-schema level (protocol error before tool handler runs) or inside the tool handler (structured error result). The functional-design business-logic-model §3 error union doesn't include a generic `invalid-input` error kind, suggesting MCP SDK input-schema validation handles this as a protocol-level rejection. | Clarify at code-generation whether MCP SDK input-schema validation (Zod/JSON-schema per tool) prevents malformed requests from reaching the tool handler, OR whether the tool handler must validate and return `{ error:'invalid-input', field, reason }`. If the former (preferred), add a note to SEC-2 that input-schema validation is MCP SDK-level. If the latter, add `invalid-input` to the McpError union in functional-design domain-entities. Not blocking — the validation happens either way; this is a code-generation clarification. |
| 2 | Minor | reliability-requirements.md REL-4 | "不正リクエストでサーバが落ちない（ツールハンドラで捕捉し構造化エラー化）" — the NFR doc doesn't specify the exception-catching boundary (global MCP server handler vs per-tool try/catch). If an unhandled exception escapes a tool handler, does the MCP SDK process crash or does the protocol-level error handler catch it? | Document the exception boundary in code-generation: either wrap each tool handler in try/catch and return structured error, OR rely on MCP SDK's global error handler to convert unhandled exceptions to MCP error responses without crashing the process. Both are acceptable; the choice affects whether REL-4 is implemented per-tool or globally. Not blocking — the NFR states the requirement ("サーバが落ちない"); code-generation chooses the mechanism. |

### Summary

All five NFR artifacts are **complete and implementable** for a local stdio MCP server. The critical security decision — no authentication — is explicitly justified by the stdio/non-network transport constraint (SEC-1) and flagged with a future-network-upgrade caveat, satisfying the orchestrator's verification criterion. The other security requirements (input validation, deterministic errors, soft-delete no-confirm, shared-core consistency, no secrets/exfil) are present, testable, and traceable to functional-design business-rules and requirements.md. Performance targets are reasonable (tool latency ~ core-op latency, stateless). Scalability correctly scopes to single-client stdio (no multi-tenant, no horizontal scale). Reliability covers atomic writes, structured errors, process robustness, and CLI/MCP behavior parity. Tech-stack is thin adapter over @modelcontextprotocol/sdk stdio with no additional dependencies.

The two findings are input-validation boundary clarification (MCP SDK schema vs tool-handler validation) and exception-catching boundary (per-tool vs global handler) — both are code-generation implementation details, not architectural gaps. The NFR layer has made the critical decisions: what to validate, what errors to return, that the server must not crash on bad input, and that behavior must match CLI. A developer can implement the MCP adapter from these five documents without architectural guidance.

**READY to advance to NFR Design.**
