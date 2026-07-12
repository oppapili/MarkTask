# Scalability Requirements — U-cli

> Construction / nfr-requirements（unit: U-cli, service）。上流参照: `../functional-design/business-logic-model.md`（business-logic-model）, `../../../inception/requirements-analysis/requirements.md`（requirements, NFR-3）。
> 前提: 単一ユーザー・ローカル。水平スケール/多者同時アクセスは非対象。

## スケーラビリティ要件

- **SCALE-1（データ規模）**: タスク数 数千件を実用範囲とする（NFR-3）。list/search は core の O(n) 走査で対応。
- **SCALE-2（並行性）**: 単一ユーザーの逐次実行を前提。複数プロセス同時書込は想定しない（万一の競合は原子的 rename で最後の書きが勝つ・破損はしない, NFR-1）。
- **SCALE-3（プロセス）**: 1コマンド=1プロセスでスケール概念は最小。常駐/接続プールは持たない。
- **SCALE-4（成長対応）**: 将来数万件規模が必要になれば、core にインデックス/キャッシュを足して対応（可逆, ADR-4）。CLI 側の変更は最小で済む設計。

## 非該当

- 水平スケール・負荷分散・オートスケール・多テナントは非該当（ローカル単一ユーザー）。
