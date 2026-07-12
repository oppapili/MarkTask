# Domain Entities — U-mcp

> Construction / functional-design（unit: U-mcp）。上流参照: `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-H）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。
> ドメインエンティティは持たない（アダプタ）。MCP ツールの入出力契約を定義。

## MCP ツール契約

| tool | args | -> TaskService | 返却(構造化) |
|---|---|---|---|
| marktask.create | title, due?, priority?, tags?, project?, repeat?, parent? | addTask | {ref, status, ...} |
| marktask.list | status?, due_before?, priority?, tag?, project?, archived? | list | {tasks:[...], count} |
| marktask.get | ref | getByRef | {ref, ...fields, body} |
| marktask.update | ref, fields | updateTask | {ref, updated} |
| marktask.complete | ref | complete | {kind, ref, status, nextDue?, blocking?} |
| marktask.state | ref, value | changeState | {ref, status} |
| marktask.search | query | search | {tasks:[...], count} |
| marktask.delete | ref | softDelete | {ref, status:'deleted', trash} |
| marktask.archive | ref | archive | {ref, status:'archived', archive} |
| marktask.recurrence_set | ref, repeat\|null | setRecurrence | {ref, repeat} |

## エラー結果（構造化・共通）

```ts
type McpError =
  | { error:'not-found'; ref }
  | { error:'ambiguous'; candidates: string[] }
  | { error:'invalid-repeat'; reason }
  | { error:'guard-blocked'; blocking: string[] }
  | { error:'io'|'config'; message };
```

## 依存・境界

- **TaskService**（唯一の呼び先, CLI と共有）。**@modelcontextprotocol/sdk**（stdio transport）。ビジネスロジック・ファイル I/O は持たない。
- 表示整形（記号/色/table）は使わず JSON シリアライズ（AI 消費用）。

<!-- Text fallback: U-mcpはドメインエンティティを持たないアダプタ。MCPツール(create/list/get/update/complete/state/search/delete/archive/recurrence_set)を各TaskServiceメソッドに対応づけ構造化JSONを返す。エラーはMcpError構造化(ambiguousは候補)。TaskService共有・MCP SDK(stdio)依存、I/Oや表示整形は持たない。 -->

## Coverage

- US-6.1（MCP 操作）, US-6.2（安全削除）。CLI と同一 TaskService でコア共有（挙動一致・結合テスト）。
