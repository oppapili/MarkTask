# Code Summary — U-recurrence（中核・最リスク）

> Construction / code-generation（unit: U-recurrence, library）。実コードは workspace root `src/core/`。上流参照: `./code-generation-plan.md`, `../functional-design/*`, `../../../inception/requirements-analysis/requirements.md`（FR-E）。

## 生成/変更ファイル

- `src/core/recurrence.ts`（新規, 495 行）— RecurrenceEngine 一式。依存は date-fns@4.1.0 のみ、純粋計算・I/O なし（R12）。
  - **型**: `RecurrenceRule`（`base: interval | weekly-days | monthly-day`＋`end?: {until?, count?}`）, `RecurrenceBase`, `RecurrenceEnd`。
  - **parse(repeat): Result<RecurrenceRule, AppError>**（FR-E1/E2）— 正規化＋文法解析（`every N days/weeks/months/years`／`every <weekday(s)>` mon..sun→0..6／`every month on <1-31|last>`／daily〜yearly 糖衣／`until <date>`・`x<N>`）。不正は `invalid-repeat`（reason＋README 誘導）。
  - **stepOnce(rule, from): Date**（date-fns: add{Days,Weeks,Months,Years}／weekly-days は翌日以降の最近該当曜日（strict future）／monthly-day は翌月基準で `last`=月末・数値は月末 clamp）。
  - **nextDue(rule, prevDue, today?): Date | null**（FR-E3/E6）— 予定ベース加算＋`while next<=today` の missed スキップ、`until` 超過は null。
  - **RecurrenceEngine implements RecurrenceRoller**（state-machine の seam）: **rollForward(task): Result<CompleteOutcome, AppError>**（FR-E4/E5, R8/R9/R10）— 単一ファイル方式で新 Task を返す（入力非破壊）。xN 減算（x3→x2）・xN 最終（x1→recurrence-ended・xN 除去）・until 到達（recurrence-ended）・通常（recurred: due 更新・status=todo・last_done・updated）。due 未設定は today 起点。
  - **describe(rule): string** — 人間可読要約（CLI 表示・エラー案内）。
  - 補助: `stripCount`/`decrementCount`（xN 文字列操作, 正規表現）。
- `src/core/index.ts`（更新）— `RecurrenceEngine`・`nextDue`・`stepOnce`・`stripCount`・`decrementCount` と型 `RecurrenceRule`/`RecurrenceBase`/`RecurrenceEnd` を再エクスポート。`parse`/`describe` は **`parseRepeat`/`describeRepeat`** の別名で公開（名前衝突回避）。
- `src/core/recurrence.test.ts`（新規, 738 行, bun:test）— 73 テスト（境界厚め）。

## 主要な実装判断

- **date-fns@4.1.0 を追加**（ADR-5）。recurrence の月末 clamp・うるう年・週跨ぎ・月加算を raw Date で誤りやすいため、決定済みスタックに沿って導入。バージョンはピン留め。
- **seam 整合**: `RecurrenceEngine` は U-state-management の `RecurrenceRoller` を implements し、`CompleteOutcome` を `./state-machine.js` から type-only import。`complete(task, { recurrence: new RecurrenceEngine() })` で done 分岐から呼ばれる。
- **単一ファイル方式（R8）**: 新ファイルを作らず同一 Task の due/status/last_done/(必要なら repeat の xN) を更新。純粋・入力非破壊で厚くテスト。
- **xN はスキーマ最小（R9）**: 残回数を `repeat` 文字列内に保持（別フィールドを増やさず Dataview 可読）。
- **type 整合は呼び出し側責務**（review Finding#2）: recurrence-ended での repeat からの xN 除去まではここで実施、`type` の task/recurrence トグルは TaskService（U-cli）に委ねる。

## テスト結果（検証済み）

- **`bun test`: 209 pass / 0 fail**（新規 +73、既存 136 を維持）。境界網羅: parse 全記法＋不正7ケース／nextDue missed スキップ・月末 clamp（Feb 28/29・Apr 30）・うるう年・週跨ぎ・until null／rollForward 通常・xN 減算・xN 最終・until 到達・due 未設定フォールバック・不正/空/undefined repeat エラー・入力非破壊／seam smoke（complete 経由 recurred/recurrence-ended）。
- **`bunx tsc --noEmit`: エラーなし**、**`eslint src/`: 違反なし**。sensors（linter/type-check）適合。
- 決定論: today 依存テストは明示 `today` 引数または過去 due 固定で日付非依存化。

## プランからの逸脱

- **バレル別名**: `parse`→`parseRepeat`、`describe`→`describeRepeat` として barrel 公開（汎用名の将来衝突回避）。`./recurrence.js` 直 import は非別名。
- **追加エクスポート**: `stepOnce`/`stripCount`/`decrementCount`/`RecurrenceBase`/`RecurrenceEnd` をテスト容易性・再利用のため公開。
- 上記以外の逸脱なし（Step 1〜7 実装, 全チェックボックス `[x]`）。

## Review

**Reviewer:** aidlc-architecture-reviewer-agent
**Verdict:** READY
**Date:** 2026-07-14T14:41:27Z
**Iteration:** 1

### Strengths

- **記法網羅（R1/R2）**: FR-E1 全パターン（interval 各 unit・weekday 0-6 写像・monthly-day 1-31/last・daily〜yearly 糖衣・until・xN・複合）。不正は README 誘導付き `invalid-repeat`（握りつぶさない）。
- **日付境界の厳密性（R6/R7）**: 月末 clamp は `getDaysInMonth`＋`Math.min`（naive setDate 不使用）→ Feb 28/29・Apr 30。曜日は strict-future（同日は +7 wrap）。うるう年は date-fns。テストで検証。
- **予定ベース＋missed スキップ（R4/R5）**: `while next<=today` で未来へ。大幅遅延テスト固定。until 超過は null（R10）。
- **純粋な単一ファイル rollForward（R8/R9/R10/R12）**: 新 Task 返却・入力非破壊・I/O/永続化なし。xN 減算（x3→x2）・xN 最終（recurrence-ended＋xN 除去）・until 到達・due 未設定 today フォールバック。CompleteOutcome は C10/domain-entities 一致。
- **seam 整合**: RecurrenceEngine implements RecurrenceRoller、CompleteOutcome を type-only import（循環回避）。`complete(task,{recurrence:new RecurrenceEngine()})` smoke test で確認。
- **依存は date-fns のみ（ADR-5）**。`Result<T,AppError>` 全面、throw なし。
- **決定論的な境界厚めテスト（73件）**: today/日付固定。plan 逸脱（barrel 別名・追加エクスポート）は許容。

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | recurrence.ts:293 | weekly-days のコメントが実装（strict-after＋wrap）とやや不一致 | コメント表現の明確化のみ。ロジックは正しい。 |
| 2 | Minor | recurrence.ts:456-465 | rollForward は recurrence-ended で xN 除去するが `type` の recurrence→task トグルはしない（R11 は呼び出し側責務と明記済み） | 許容。TaskService(U-cli) が type 整合を担う。docstring に注記推奨。 |
| 3 | Minor | recurrence.ts:271-280 | weekday 同日 wrap 挙動（+7）のコメント補足余地 | 許容。R7「翌日以降」に一致、コメント明確化のみ。 |

### Summary

RecurrenceEngine は **production-ready・実装可能**。FR-E(E1-E6)・R1-R12・OQ-1(missed skip)/OQ-2(月末/曜日) をコードで正しく解決。パーサは全 MVP パターン＋invalid-repeat、日付演算は date-fns で月末 clamp/うるう年/strict-future 曜日、nextDue の missed スキップで過去日無限生成を防止、rollForward は純粋・非破壊の単一ファイル方式で xN/until 終了を CompleteOutcome に整合。RecurrenceRoller seam は state-machine と smoke test で結線確認。境界テスト厚め（73件・決定論）。3 件の Finding はコメント/docstring 明確化のみでロジックは健全。date-fns のみ（ADR-5）。type トグルの TaskService 委譲は関心分離として妥当。**READY to deploy.**
