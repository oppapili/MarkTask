# Code Generation Plan — U-recurrence（中核・最リスク）

> Construction / code-generation（unit: U-recurrence, library）。上流参照: `../functional-design/business-logic-model.md`, `../functional-design/business-rules.md`, `../functional-design/domain-entities.md`, `../nfr-requirements/tech-stack-decisions.md`, `../../../inception/units-generation/unit-of-work.md`, `../../../inception/requirements-analysis/requirements.md`（FR-E）。
> スタック: TypeScript + bun / **date-fns@4.1.0**（ADR-5, 追加済み）/ bun:test / Prettier + ESLint。実コードは workspace root `src/core/`。Test Strategy=Standard だが本ユニットは最リスクのため**日付境界を厚くテスト**（team-practices R13）。

## 統合コンテキスト（既存コードとの結線）

- `src/core/types.ts`: `Task`・`Result<T,AppError>`・`ok`/`err`/`appError`（kinds に `invalid-repeat` あり）を再利用。
- `src/core/state-machine.ts`: **`CompleteOutcome` 型**（`recurred`/`recurrence-ended`/…）と **`RecurrenceRoller` インタフェース**（`rollForward(task): Result<CompleteOutcome, AppError>`）が既存。U-recurrence の `RecurrenceEngine` は **`RecurrenceRoller` を implements** し、`CompleteOutcome` を `./state-machine.js` から type-only import（seam を満たす）。
- 純粋計算のみ（parse/nextDue/rollForward は I/O なし, R12）。永続化・状態書込は TaskService/task-core が担う。

## 実装ステップ（順次・チェックボックス）

- [x] **Step 1: RecurrenceRule 型と記法パーサ**（`src/core/recurrence.ts` 新規）
  - `RecurrenceRule`（domain-entities 準拠）: `base: {kind:'interval',n,unit} | {kind:'weekly-days',weekdays:number[]} | {kind:'monthly-day',day:number|'last'}`；`end?: {until?:string; count?:number}`。
  - `parse(repeat: string): Result<RecurrenceRule, AppError>`（FR-E1/E2, R1/R2）:
    - 正規化（小文字化・空白圧縮・trim）。
    - 文法: `every N days|weeks|months|years`／`every <weekday(s)>`（mon,tue,wed,thu,fri,sat,sun カンマ区切り, 0=Sun..6=Sat へ写像）／`every month on <1-31|last>`／キーワード `daily/weekly/monthly/yearly`（interval 糖衣）。
    - 終了条件（末尾）: `until <YYYY-MM-DD>`（→end.until）／`x<N>`（→end.count）。両方可。
    - 不正・解釈不能は `err(appError('invalid-repeat', reason + README 記法ヒント))`（握りつぶさない, R2）。
- [x] **Step 2: 次回 due 算出**（`src/core/recurrence.ts`）
  - `stepOnce(rule, from: Date): Date`（date-fns 使用）:
    - interval → `add{Days,Weeks,Months,Years}(from, n)`。
    - weekly-days → from の**翌日以降**で最も近い該当曜日（複数指定は最小の該当日）。from 自身は含めない（strict future, review Finding#3）。
    - monthly-day → 翌月基準、`day==='last'` は `lastDayOfMonth`、数値は `min(day, getDaysInMonth(base))` で**月末 clamp**（R6, うるう年 date-fns 準拠）。
  - `nextDue(rule, prevDue: Date, today = new Date()): Date | null`（R4/R5）:
    - `next = stepOnce(rule, prevDue)`；`while next <= today: next = stepOnce(rule, next)`（missed スキップ）。
    - `rule.end.until` 超過なら `null`（終了, R10）。
- [x] **Step 3: 完了ロールフォワード**（`src/core/recurrence.ts`）
  - `RecurrenceEngine implements RecurrenceRoller`（state-machine の seam）。
  - `rollForward(task: Task): Result<CompleteOutcome, AppError>`（FR-E4/E5, R8/R9/R10）:
    - `parse(task.repeat)`；err は伝播。
    - `xN` 判定: `end.count != null` かつ `<=1` → 今回で終了（`status:done`, `last_done=today`, repeat から `xN` 除去）→ `recurrence-ended`。`>1` → repeat 文字列の N を減算（x3→x2）。
    - `next = nextDue(rule, dateOf(task.due ?? today))`；`null`（until 到達）→ `status:done`,`last_done=today` → `recurrence-ended`。
    - それ以外 → `due=fmt(next)`,`status:'todo'`,`last_done=today`,`updated=nowIso()` → `{ kind:'recurred', task, nextDue: fmt(next) }`。
    - **単一ファイル方式**（新ファイル作らず同一 Task を更新, R8）。入力を破壊せず新 Task を返す（純粋・テスト容易）。
    - xN 文字列操作は補助関数 `stripCount`/`decrementCount`（正規表現）で実装。`type` フィールドの task/recurrence 整合は呼び出し側（TaskService）責務（review Finding#2）だが、recurrence-ended で repeat から xN を除去する点まではここで行う。
- [x] **Step 4: describe**（`src/core/recurrence.ts`）
  - `describe(rule: RecurrenceRule): string` — 人間可読要約（例「毎月 / 残り2回」）。CLI 表示・エラー案内補助。
- [x] **Step 5: バレル エクスポート更新**（`src/core/index.ts` in-place）
  - `RecurrenceEngine`・`parse`・`nextDue`・`describe`（＋補助が公開必要なら）と型 `RecurrenceRule` を再エクスポート（重複禁止, type は `export type`）。
- [x] **Step 6: ユニットテスト（境界厚め, bun:test）**（`src/core/recurrence.test.ts` 新規）
  - parse: 全記法（interval 各 unit・weekday 単一/複数・monthly-day 数値/last・daily〜yearly 糖衣・until・xN・until+xN）＋不正記法エラー。
  - nextDue: 予定ベース加算・**missed スキップ（大幅遅延で未来へ）**・**月末 clamp（every month on 31 → 2月/4月）**・**うるう年**（2/29）・**週跨ぎ**（曜日）・until 超過で null。
  - rollForward: 通常 recurred（due 更新・status=todo・last_done）・xN 減算（x3→x2）・xN 最終（x1→recurrence-ended・repeat から xN 除去）・until 到達（recurrence-ended）・due 未設定フォールバック（today 起点）・不正 repeat エラー・入力非破壊。
  - RecurrenceRoller 整合: `complete(task, { recurrence: new RecurrenceEngine() })`（state-machine）経由で recurred/recurrence-ended が返ることを確認（seam の実結線 smoke test）。
- [x] **Step 7: 検証**
  - `bun test`（既存 136 ＋新規が green）／`bunx tsc --noEmit`／`eslint src/`。sensors（linter/type-check）適合。

## Story トレーサビリティ

| Step | Story / FR |
|---|---|
| Step 1 parse | US-3.1（記法設定）, FR-E1/E2 |
| Step 2 nextDue/stepOnce | FR-E3/E6, OQ-1（missed）, OQ-2（月末/曜日） |
| Step 3 rollForward | US-3.2（完了・次回発生）, FR-E4/E5 |
| Step 6 | team-practices R13（日付境界を厚くテスト） |

## 備考

- 依存は date-fns のみ（ADR-5）。parse/nextDue/rollForward は純粋・I/O なし（R12）。永続化しない（Task を返すのみ）。
- `xN` 残回数は `repeat` 文字列内に保持（別フィールドを増やさない＝スキーマ最小・Dataview 可読, R9）。
- `CompleteOutcome`/`RecurrenceRoller` は state-machine の seam を満たし、done 分岐（U-state-management `complete`）から呼ばれる。
- 完全・実行可能なファイル（プレースホルダ禁止）。エラーは `Result<T,AppError>`（`invalid-repeat` 等）で境界に surface。
