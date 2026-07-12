# Scalability Requirements — U-mcp

> Construction / nfr-requirements（unit: U-mcp, service）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../../../inception/requirements-analysis/requirements.md`（requirements, NFR-3）。
> 前提: stdio ローカル・単一 AI クライアント。

## スケーラビリティ要件

- **SCALE-1（データ規模）**: 数千件のタスク（NFR-3）。core の O(n) 走査に準じる。
- **SCALE-2（クライアント）**: 単一のローカル AI クライアントを想定。多数同時接続・水平スケールは非対象。
- **SCALE-3（状態レス）**: インメモリ状態を持たず、ファイルが正。プロセス再起動で状態が失われない。
- **SCALE-4（成長）**: 大規模化時は core のインデックス/キャッシュ改善で対応（可逆, ADR-4）。MCP アダプタは変更最小。

## 非該当

- 水平スケール・負荷分散・多テナント・接続プールは非該当（ローカル単一クライアント stdio）。
