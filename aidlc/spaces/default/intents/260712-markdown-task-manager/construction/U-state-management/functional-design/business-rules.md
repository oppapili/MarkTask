# Business Rules — U-state-management

> Construction / functional-design（unit: U-state-management）。上流参照: `../../../inception/requirements-analysis/requirements.md`（requirements, FR-B）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。

## 状態モデル・遷移ルール

- **R1（5状態）**: `todo | in-progress | done | waiting | cancelled`。`inbox` は不採用（rough-mockups Q6）。
- **R2（自由遷移＋検証）**: 任意の状態間遷移を許可するが、遷移先は必ず5状態のいずれか（不正値はエラー・許容値提示, FR-B3）。MVP では厳格な遷移グラフ制約は課さない（個人運用の柔軟性優先）。
- **R3（updated 必須）**: すべての状態変更で `updated` を現在時刻に更新（FR-B2）。`created` は不変。
- **R4（done は分岐）**: `done` 操作は (a) 親タスクなら U-subtasks の完了ガードを先に評価（未完子があれば `guard-blocked`, FR-G2）、(b) `type=recurrence`＋`repeat` なら U-recurrence の rollForward へ委譲（FR-E4）、(c) それ以外は通常 `done`。
- **R5（委譲境界）**: recurrence 固有の due 再計算・親子ガード判定は本 unit に実装しない（U-recurrence / U-subtasks が所有）。本 unit は遷移の一次ロジックと updated 管理のみ。
- **R6（永続化分離）**: 本 unit は Task（インメモリ）を返すだけで書き込みはしない。永続化は TaskService 経由の Repository.write（原子的, task-core）。

## 対象 stories

US-1.2（状態を進める）, US-4.2（親ガードの状態参照）, US-3.2（recurrence 完了の一次遷移）。
