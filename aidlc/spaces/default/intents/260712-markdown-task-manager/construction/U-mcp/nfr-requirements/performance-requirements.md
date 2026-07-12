# Performance Requirements — U-mcp

> Construction / nfr-requirements（unit: U-mcp, service）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements, NFR-3）。
> 前提: stdio ローカル・非公開の MCP サーバ。単一 AI クライアント。

## 性能要件（目安）

- **PERF-1（ツール応答）**: 各 MCP ツールは対応する core 操作と同等のレイテンシ（単一ファイル操作は即時、list/search は数千件で実用速度, NFR-3）。
- **PERF-2（stdio オーバーヘッド）**: JSON シリアライズ＋stdio 往復のオーバーヘッドは無視できる範囲。大きな結果（全件 list）でも構造化 JSON を素直に返す。
- **PERF-3（常駐）**: サーバは常駐するがインメモリ状態を持たない（ファイルが正）。起動は軽量に保つ。

## 非該当

- 高スループット/同時多数リクエストは非対象（単一ローカル AI クライアント）。数値 SLA 検証はスコープ外。
