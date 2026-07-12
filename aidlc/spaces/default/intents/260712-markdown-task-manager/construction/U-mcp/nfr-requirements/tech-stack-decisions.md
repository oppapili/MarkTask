# Tech Stack Decisions — U-mcp

> Construction / nfr-requirements（unit: U-mcp, service）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements）。

## 本ユニットの技術選択

| 関心事 | 選択 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript + bun | ADR-1 |
| MCP 実装 | `@modelcontextprotocol/sdk`（stdio transport） | FR-H1。標準 MCP SDK でツール登録・JSON-RPC over stdio |
| トランスポート | stdio（ローカル・非公開） | SC 制約。ネットワークソケットを開かない（SEC-1） |
| 入出力 | 構造化 JSON（自前シリアライズ） | FR-H3。OutputFormatter の人間向け整形は使わない |
| コア呼び出し | TaskService（共有） | project.md Mandated |
| テスト | `bun:test`（CLI との挙動一致結合含む） | team-practices |

## 依存方針

- 追加依存は **@modelcontextprotocol/sdk のみ**。ビジネスロジックは持たず TaskService に委譲。
- ネットワーク公開に切り替える将来変更時は transport 差し替え＋認証追加を伴う（現 MVP は stdio 固定）。
