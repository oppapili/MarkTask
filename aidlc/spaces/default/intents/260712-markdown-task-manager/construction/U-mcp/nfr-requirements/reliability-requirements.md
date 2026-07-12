# Reliability Requirements — U-mcp

> Construction / nfr-requirements（unit: U-mcp, service）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../../../inception/requirements-analysis/requirements.md`（requirements, NFR-1/2）。
> 前提: stdio ローカル・非公開。

## 信頼性要件

- **REL-1（データ保全）**: 書込は core の原子的 temp→rename（NFR-1）。MCP 経由でも部分破損を残さない。
- **REL-2（決定的エラー）**: 失敗は例外でなく構造化エラー結果で返す（AI が判定可能）。サイレント失敗禁止（construction guardrail）。
- **REL-3（回復性）**: delete はソフト（回復可能）。誤操作・AI の誤呼び出しでもデータを失わない（US-6.2）。
- **REL-4（プロセス頑健性）**: 不正リクエストでサーバが落ちない（ツールハンドラで捕捉し構造化エラー化）。1 ツール失敗が他に波及しない。
- **REL-5（挙動一致）**: CLI と同一 core を共有し、同一入力に同一結果（結合テストで担保, team-practices）。

## 非該当

- 可用性 SLA/SLO・冗長化・DR は非該当（ローカル stdio・常駐だが単一プロセス）。
