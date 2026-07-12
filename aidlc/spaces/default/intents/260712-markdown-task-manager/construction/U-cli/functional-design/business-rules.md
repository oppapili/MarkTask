# Business Rules — U-cli

> Construction / functional-design（unit: U-cli）。上流参照: `../../../inception/requirements-analysis/requirements.md`（requirements, FR-D）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。refined-mockups の DX 決定（Q1〜Q5）を実装。

## ルール

- **R1（薄いアダプタ）**: CLI はビジネスロジックを持たず TaskService を呼ぶだけ（project.md Mandated: CLI と MCP はコア共有）。
- **R2（コマンド体系）**: `marktask <cmd>`＋短縮 `mt`（FR-D1）。コマンド: add/list/show/update/start/done/wait/cancel/state/search/delete/archive/config（FR-D2）。
- **R3（既定 list）**: 既定はテーブル、`--format compact|json` で切替。列= status/due/priority/title（Q5）。長い title は端末幅で切り詰め、件数は全件（`--limit` 可）。
- **R4（出力スタイル, Q1）**: status は記号＋色。色は TTY かつ `--no-color` 未指定時のみ。記号＋文字で色なしでも判別可（アクセシビリティ）。
- **R5（日付, Q3）**: 既定は絶対＋相対併記、`--relative` で相対のみ。
- **R6（機械可読, Q2）**: `--json` を主要コマンドに用意。JSON のみを stdout に出す（装飾なし・安定キー）。
- **R7（確認 UX, Q4）**: delete/archive はソフトゆえ即実行し、結果に復旧/参照方法を1行添える。プロンプトに依存しない（非対話）。
- **R8（exit code）**: 0=成功 / 1=業務エラー（未検出・曖昧・ガード・不正 repeat）/ 2=設定・使用法。
- **R9（曖昧参照）**: `ambiguous` は候補一覧を提示して選ばせる（自動決定しない, FR-D5）。
- **R10（エラー表示）**: `✗ ` 接頭辞＋人間可読の理由＋次アクション。stderr へ。

## 対象 stories

US-1.1〜1.3, US-2.1, US-3.x（表示分岐）, US-5.1, US-7.1/7.2（CLI 側）, US-T.2（config）。
