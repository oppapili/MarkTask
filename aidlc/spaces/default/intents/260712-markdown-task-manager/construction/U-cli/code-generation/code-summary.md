# Code Summary — U-cli（統合キーストーン）

> Construction / code-generation（unit: U-cli, service）。実コードは workspace root（`src/core/` に共有 TaskService、`src/cli/` に CLI アダプタ＋OutputFormatter）。上流参照: `./code-generation-plan.md`, `../functional-design/*`, `../../../inception/requirements-analysis/requirements.md`（FR-D）。

## 生成/変更ファイル

- `src/core/task-service.ts`（新規, 250 行）— **CLI/MCP 共有オーケストレーション**（project.md Mandated）。`TaskService(repo)` が QueryService/DeleteArchiveService/RecurrenceEngine を内包。メソッド: addTask（repeat→type=recurrence, R11）/list/search/getByRef（listRefs→resolveRef→read）/updateTask（メタ更新＋R11 type 双方向整合＋updated）/changeState（transition→write）/**completeTask**/softDelete/archive/getConfig/setConfig。全メソッド `Result` 返却・throw なし。
- `src/core/config.ts`（更新）— `writeConfig(config)`（XDG に YAML 原子的書込）・`setConfigValue(key,value)`（未知キーは config エラー）を追記。
- `src/cli/output.ts`（新規, 207 行）— OutputFormatter。記号 `●◐✓◷⊘`（色は TTY かつ !--no-color、記号＋文字で色なしでも判別可）、renderList（table: status/due/priority/title 切り詰め・limit）/renderCompact/renderTask/renderMessage（✓/✗＋"ref status: X -> Y"）、日付は絶対＋相対（date-fns, --relative）、toJson（安定キー）。外部 color 依存なし（ANSI 内蔵）。
- `src/cli/index.ts`（スタブ→実装, 520 行）— commander CLI。`marktask`/`mt`。コマンド add/list/show/update/start/done/wait/cancel/state/search/delete/archive/config。各ハンドラは TaskService を呼ぶだけ（薄いアダプタ）。`run(argv): Promise<number>` で exit code をテスト可能化。
- `src/core/index.ts`（更新）— TaskService＋入力型を再エクスポート。
- `package.json`（更新）— `bin: { marktask, mt }` 追加。
- `src/core/task-service.test.ts`（新規, 27）・`src/cli/output.test.ts`（新規, 25）。

## 主要な実装判断

- **complete 結線（キーストーン）**: `completeTask` が snapshot=`repo.list()` をロードし `complete(task, { subtasks: asSubtaskGuard(snapshot), recurrence: RecurrenceEngine })` を呼ぶ。**guard-blocked は永続化せず**返し、それ以外は `repo.write` で永続化。recurrence/subtasks の seam がここで初めて実結線（依存性逆転の解消点）。`--force` 時は subtasks を渡さずガード回避。
- **R11 type 整合**: updateTask で repeat 付与→`recurrence`・除去→`task`。completeTask の recurrence-ended で repeat 除去済みなら `type='task'` に整合してから write。
- **薄いアダプタ（R1, project.md Mandated）**: CLI/OutputFormatter はビジネス判断・I/O を持たず、全ロジックは TaskService/コア。U-mcp が同一 TaskService を再利用でき挙動一致。
- **exit code（R8）/ ambiguous（R9）**: 0/1/2 マップ、曖昧参照は候補提示（自動決定しない）。`--json` は JSON のみ stdout、delete/archive は即実行＋復旧ヒント（R7）。
- **run(argv) パターン**: プロセス終了を戻り値で表現しユニットテスト可能に。

## テスト結果（検証済み）

- **`bun test`: 306 pass / 0 fail**（新規 +52、既存 254 を維持）。task-service.test（27, 一時ディレクトリの実 Repository で addTask/list/search/getByRef/updateTask R11 双方向/changeState/completeTask 全分岐（completed/recurred/recurrence-ended/guard-blocked/force）/softDelete/archive/config、complete が永続化し guard-blocked は非永続化を検証）／output.test（25, 記号/切り詰め/no-color/相対日付/toJson）。
- **`bunx tsc --noEmit`: エラーなし**、**`eslint src/`: 違反なし**。
- **手動 E2E スモーク**: 一時 tasksDir で `add`/`list`/`show`/`done`（simple・recurrence・guard-blocked・--force）/`delete`/`search --json`/`config --list` が疎通。

## プランからの逸脱

- complete メソッド名を `completeTask` とした（core に `complete`（state-machine）が既存のため衝突回避・意図明確化）。CLI `done` ハンドラが呼ぶ。それ以外の逸脱なし（Step 1〜7 実装, 全チェックボックス `[x]`）。

## Review

**Reviewer:** aidlc-architecture-reviewer-agent
**Verdict:** READY
**Date:** 2026-07-14T15:07:59Z
**Iteration:** 1

### Strengths

- **薄いアダプタ規律の厳守（R1, project.md Mandated）**: 各ハンドラは parse→TaskService→render の3行。ビジネス判断・I/O は CLI に無し。TaskService はコア（U-mcp と共有）。
- **コマンド網羅（R2, FR-D2）**: add/list/show/update/start/done/wait/cancel/state/search/delete/archive/config＋marktask/mt。各が TaskService メソッドに 1:1。done は `--force` 対応。
- **completeTask 結線（キーストーン）**: snapshot→`asSubtaskGuard`＋`RecurrenceEngine`→`complete(task,deps)`、guard-blocked は非永続化、他は write、`--force` はガード回避。依存性逆転の解消点。
- **R11 type 双方向整合**: addTask/updateTask/completeTask(recurrence-ended) で repeat↔type 同期。テスト確認。
- **exit code（R8）/ambiguous（R9）**: not-found/ambiguous/guard-blocked/invalid-repeat→1、config→2、ambiguous は候補提示。--json は JSON のみ、delete/archive 即実行＋復旧ヒント。
- **OutputFormatter（R3/R4/R5/R6）**: 記号色は TTY/--no-color/NO_COLOR ゲート・色なしでも判別可、table/compact、絶対＋相対日付、切り詰め、安定キー JSON、外部 color 依存なし。
- **テスト充実（新規52・既存254 green）**: complete 全分岐＋永続化 vs guard-blocked 非永続化＋force、output 単体。`run(argv)` で exit code テスト可能。
- **依存追加は commander のみ**、`Result<T,AppError>` 全面、shebang/bin 完備。クロスユニット結線点は全て既存エクスポートに解決。

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | output.ts RenderOpts | `--json` は format enum でなく別経路（早期 JSON）である旨のコメント不足 | 型コメントに追記推奨。実装は正しい。 |
| 2 | Minor | index.ts delete/archive | ✓/✗ メッセージ接頭辞が --no-color を経由せず常時モノクロ | 意図（接頭辞は常時モノクロ）を明記推奨。ユーザ許容範囲。 |

### Summary

**そのままデプロイ可能**。薄いアダプタ規律を構造的に強制、コマンド 14 種が FR-D2 に 1:1。completeTask がサブタスクガード＋recurrence エンジンを初結線し依存性逆転戦略が機能。guard-blocked 非永続化はテスト済み。R11 双方向、exit code 正確、OutputFormatter はアクセシブル・TTY 対応・安定 JSON。テストは重要分岐（永続化 vs 非永続化・force・4 outcome）を網羅。2 Finding はドキュメント明確化のみ。命名逸脱（completeTask）は衝突回避で妥当。検証 306/0・tsc/lint クリーン・E2E スモーク通過。U-mcp は同一 TaskService を再利用でき挙動一致。**READY — advance to build-and-test.**
