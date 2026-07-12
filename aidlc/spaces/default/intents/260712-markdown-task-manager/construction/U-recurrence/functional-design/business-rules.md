# Business Rules — U-recurrence

> Construction / functional-design（unit: U-recurrence）。上流参照: `../../../inception/requirements-analysis/requirements.md`（requirements, FR-E）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。

## 記法ルール（FR-E1, E2）

- **R1（サポート記法）**: `every N days/weeks/months/years`／`every <weekday(s)>`（mon..sun, カンマ区切り複数）／`every month on <1-31|last>`／キーワード `daily/weekly/monthly/yearly`／終了 `until <YYYY-MM-DD>`・`x<N>`。
- **R2（不正記法）**: 解釈不能は `invalid-repeat`（reason ＋ README 記法へ誘導）。曖昧に握りつぶさない。
- **R3（README 明記）**: 記法は README に明記（Decided: 独自簡易記法, Dataview 可読）。Obsidian Tasks 記法互換は対象外。

## 次回発生ルール

- **R4（予定ベース）**: 次回は前回 `due` を起点に加算（Q2=A）。`due` 未設定時は today 起点。
- **R5（missed スキップ, OQ-1 確定）**: 算出結果が今日以下なら、今日より後になる最初の発生日まで加算を繰り返す（過去日を延々と出さない）。
- **R6（月末 clamp, OQ-2）**: `every month on 31` 等は当該月の日数に丸める。`last` は各月末日。
- **R7（曜日, OQ-2）**: `every <weekdays>` は起点の翌日以降で最も近い該当曜日。複数指定は最小の該当日。

## 完了・終了ルール（FR-E4, E5）

- **R8（単一ファイル）**: 完了時に新ファイルを作らず同一ファイルの `due`/`status`(→todo)/`last_done`(=完了日) を更新（命名衝突・履歴分断の回避, Decided）。
- **R9（xN カウンタ）**: `x<N>` は残り発生回数。完了ごとに `repeat` 文字列内の N を減算（x3→x2）。N==1 の完了で終了＝`status:done`＋`repeat` から `xN` を除去（`recurrence-ended`）。
- **R10（until 終了）**: 次回が `until` を超えたら発生させず `status:done` 確定（`recurrence-ended`）。
- **R11（type 整合）**: `repeat` を持つタスクは `type: recurrence`。`repeat` 解除時は `type: task` に戻す（U-cli/TaskService の setRecurrence 経由）。

## 境界

- **R12（純粋計算）**: parse/nextDue/rollForward は I/O を持たない純粋関数（副作用なし）。永続化・状態書込は TaskService/task-core、状態遷移一次処理は U-state-management。
- **R13（テスト厚め）**: 日付境界（月末・うるう年・週跨ぎ・大幅遅延・until/xN 境界）をユニットテストで厚く（team-practices Testing Posture）。

## 対象 stories

US-3.1（記法設定）, US-3.2（完了と次回発生）。
