# Business Rules — U-mcp

> Construction / functional-design（unit: U-mcp）。上流参照: `../../../inception/requirements-analysis/requirements.md`（requirements, FR-H）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。

## ルール

- **R1（薄いアダプタ・コア共有）**: MCP はロジックを持たず TaskService を呼ぶだけ。CLI と同一コアを共有（project.md Mandated）。挙動一致を結合テストで担保。
- **R2（公開ツール, Q7=B+C）**: create/list/get/update/complete/state/search/**delete**/archive/recurrence_set のフル操作面（FR-H2）。
- **R3（構造化 I/O）**: 入力はツール引数（JSON）、出力は構造化 JSON（file/ref/status/主要フィールド）。人間向け装飾は付けない（FR-H3）。
- **R4（delete は confirm 不要, FR-H4）**: delete はソフト削除（回復可能）ゆえ、MCP からの呼び出しに追加確認を課さない。結果に trash パス（復旧経路）を含める。
- **R5（決定的エラー）**: 失敗は例外でなく構造化エラー結果で返す。`ambiguous` は候補配列を返し、AI が選び直せる（overconfidence 回避 / FR-D5）。
- **R6（ローカル非公開）**: stdio ローカルのみ。ネットワーク公開・認証・外部送信なし（SC 制約・ローカル単一ユーザー）。
- **R7（引数検証）**: 必須引数の欠如・型不正はツール実行前に検証し、構造化エラーで返す（サイレント失敗禁止, construction guardrail）。

## 対象 stories

US-6.1（MCP ツール操作）, US-6.2（MCP 安全削除）。
