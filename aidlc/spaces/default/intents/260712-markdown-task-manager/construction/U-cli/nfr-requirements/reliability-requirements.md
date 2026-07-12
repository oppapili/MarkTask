# Reliability Requirements — U-cli

> Construction / nfr-requirements（unit: U-cli, service）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../../../inception/requirements-analysis/requirements.md`（requirements, NFR-1/2）。
> 前提: ローカル CLI。可用性 SLA は非該当（常駐サービスでない）。

## 信頼性要件

- **REL-1（データ保全）**: 書込は core の原子的 temp→rename（NFR-1）。CLI がクラッシュしても部分破損を残さない。
- **REL-2（既存資産の保護）**: frontmatter 非準拠の既存 md を壊さない（NFR-2）。想定外ファイルはスキップ/無視。
- **REL-3（明確な失敗）**: すべての失敗は exit code（0/1/2）＋人間可読メッセージで通知（サイレント失敗禁止, construction guardrail）。
- **REL-4（グレースフル・デグレード）**: 設定未存在は既定値で動作 or 設定を促す（PANIC しない）。曖昧参照は候補提示で回復。
- **REL-5（非破壊操作の回復性）**: delete/archive はソフト（core 経由）で回復可能。

## 非該当

- 可用性 SLA/SLO、フォールト・トレランス（冗長化）、DR は非該当（ローカル単発プロセス）。バックアップは git/ファイルコピーにユーザー委譲。
