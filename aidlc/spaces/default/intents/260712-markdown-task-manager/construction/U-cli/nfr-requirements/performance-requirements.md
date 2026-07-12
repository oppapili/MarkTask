# Performance Requirements — U-cli

> Construction / nfr-requirements（unit: U-cli, service）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../functional-design/business-rules.md`（business-rules）, `../../../inception/requirements-analysis/requirements.md`（requirements, NFR-3）。
> 前提: ローカル・単一ユーザー・1コマンド=1プロセス（常駐しない）。

## 性能要件（目安・厳密 SLA は非スコープ）

- **PERF-1（起動）**: `marktask <cmd>` の起動〜応答は体感で待たされない（bun 起動＋数千件走査で概ね 1 秒未満を目安）。
- **PERF-2（list/search）**: 数千件のタスクでも `list`/`search` が実用速度（QueryService の O(n) 走査, NFR-3）。ページングなし全件でも `less` 等に流せる。
- **PERF-3（単発操作）**: add/done/update 等の単一ファイル操作は I/O 1〜数回で完了（原子的書込のオーバーヘッドは許容）。
- **PERF-4（プロセスモデル）**: 常駐しないため、起動コストを増やす重い初期化（大きな依存ロード）を避ける。

## 備考

- 数値 SLA の厳密検証（performance-validation）はスコープ外。上記は設計目安。将来ボトルネックはキャッシュ等で可逆に改善可能（ADR-4）。
