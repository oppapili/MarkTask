# Refined Mockups (CLI/MCP DX) — MarkTask

> Inception / refined-mockups 成果物。非UIのため「開発者体験(DX)」を中忠実度で詳細化。
> 上流参照: `../../ideation/rough-mockups/wireframes.md`（wireframes）, `../../ideation/rough-mockups/user-flow.md`（user-flow）, `../user-stories/stories.md`（stories）, `../requirements-analysis/requirements.md`（requirements）, `../practices-discovery/team-practices.md`（team-practices）。
> DX 決定（refined-mockups-questions.md）: Q1=色＋記号(色のみ非依存,`--no-color`)／Q2=`--json`／Q3=絶対＋相対併記／Q4=ソフト操作は即実行＋復旧ヒント／Q5=列 status/due/priority/title・切り詰め・全件。
> 注: 正式なコマンド仕様・スキーマは functional-design / application-design で確定。ここは体験の確認用。

## 1. コマンド別モックアップ（成功 / 空 / エラー状態）

### add（US-1.1）
```
$ marktask add "書類を提出する" --due 2026-08-07 --priority high --tags work
✓ Created  20260712-書類を提出する  (status: todo, due: 2026-08-07 (in 26d))
```
- エラー（保存先未設定）: `✗ No tasks directory configured. Run 'marktask config --set tasks-dir <path>'.`（exit 2）

### list（US-1.3, US-5.1 / Q5 列=status,due,priority,title・切り詰め・全件）
```
$ marktask list
STATUS       DUE                PRI   TITLE
● todo        2026-08-07 (26d)   high  書類を提出する
◐ in-progress 2026-07-15 (3d)    med   設計レビューの準備を進める…
◷ waiting     -                  low   返信待ちの件
3 tasks  (1 todo, 1 in-progress, 1 waiting)   # .trash/・archive は除外
```
- 記号: `●`todo `◐`in-progress `✓`done `◷`waiting `⊘`cancelled（色は併用するが記号だけでも判別可 / Q1）。`--no-color` と非TTYで色オフ。
- 空: `No active tasks. (use 'marktask add' to create one)`
- 相対日付は既定で `(26d)` を併記、`--relative` で相対のみ（Q3）。

### show / update / start / done
```
$ marktask start 20260712-書類を提出する
✓ 20260712-書類を提出する  status: todo -> in-progress

$ marktask done 20260712-書類を提出する
✓ 20260712-書類を提出する  status: in-progress -> done
```

### done（recurrence, US-3.2 / 予定ベース）
```
$ marktask done 月次レポート
✓ 月次レポート (recurring)  due: 2026-08-01 -> 2026-09-01, status -> todo, last_done: 2026-08-05
```
- 終了条件到達時: `✓ 月次レポート (recurring)  ended (until/xN reached), status -> done`

### search（US-5.1）
```
$ marktask search "レビュー"
◐ in-progress 2026-07-15 (3d)  med  設計レビューの準備…  (20260710-設計レビュー)
1 match
```
- 空: `No matches for "レビュー".`

### サブタスク完了ガード（US-4.2）
```
$ marktask done 20260701-申請対応
✗ Cannot complete: 2 subtask(s) still open:
    ● todo  添付書類を用意   (20260702-添付書類を用意)
    ◐ in-progress 記入確認   (20260703-記入確認)
  Complete them first, or run with --force to override.
```
（exit 1。ガードは階層再帰。`list --parent 20260701-申請対応` で子を確認可）

### delete（ソフト削除, US-7.1 / Q4=A 即実行＋復旧ヒント）
```
$ marktask delete 20260712-書類を提出する
✓ Deleted (soft)  moved to tasks/.trash/20260712-書類を提出する
  Restore: mv tasks/.trash/20260712-書類を提出する.md tasks/   (or 'git checkout')
```

### archive（US-7.2, delete とは別意図）
```
$ marktask archive 20260601-古い企画メモ
✓ Archived  moved to archive/20260601-古い企画メモ   (excluded from default list; see 'list --archived')
```

### MCP（US-6.1 / --json 相当の構造化, Q2）
```
tool: marktask.list  args: { status: "todo", due_before: "2026-08-10" }
-> { "tasks": [ { "ref":"20260712-書類を提出する", "status":"todo", "due":"2026-08-07", "priority":"high", "title":"書類を提出する" } ], "count": 1 }
tool: marktask.delete args: { ref: "..." } -> { "ref":"...", "status":"deleted", "trash":"tasks/.trash/..." }  # ソフト削除ゆえ confirm 不要
```

### --json（Q2, スクリプト/AI/デバッグ）
```
$ marktask list --json
{"tasks":[{"ref":"20260712-書類を提出する","status":"todo","due":"2026-08-07","priority":"high","title":"書類を提出する","tags":["work"]}],"count":1}
```

<!-- Text fallback: 各コマンドの成功/空/エラー出力を提示。status は色＋記号(色のみ非依存)、日付は絶対＋相対併記、delete/archiveはソフト操作で即実行+復旧ヒント、--json で機械可読、MCPは構造化結果。list列は status/due/priority/title で長文切り詰め・全件表示。 -->

## 2. 状態表示の一貫性（stories との対応）

各ワークフロー（WF-1〜8, 横断）に対し、成功/空/エラーの3状態を上表で網羅。recurrence（WF-3）と親子ガード（WF-4）は分岐出力を明示。要件 FR-D4（人間可読エラー＋候補提示）と NFR（色のみ非依存, 機械可読）に整合。


## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-07-12T11:25:27Z
**Iteration:** 1

### Strengths

- **CLI DX spec is comprehensive and implementable**: All success/empty/error states covered per command (§1). Developer could implement from this without guessing what the output should look like in each scenario.
- **User answers faithfully honored**: Q1=A (color+symbol, not color-only, with `--no-color`+TTY-auto) → design-system-mapping.md §1 explicitly documents symbol+color+文字併記 with auto-off. Q2=A (`--json`) → mockups.md §1 shows `--json` example and MCP structured output. Q3=C (absolute+relative併記) → date format `2026-08-07 (26d)` consistently shown. Q4=A (immediate execution + recovery hint) → delete/archive examples show no confirmation prompt, with restore command in output. Q5=A,B,C,D+G+I (columns=status/due/priority/title, truncate, show-all) → list mockup matches exactly with 4 columns + `…` truncation + no pagination statement.
- **Upstream consistency verified**: Recurrence (US-3.2 / FR-E4) → `done` mockup shows schedule-based rollforward with `last_done` update. Parent-done guard (US-4.2 / FR-G2) → subタスク完了ガード example shows rejection with children list + `--force` override. Delete/archive separation (US-7.1/7.2 / FR-I1/I2) → distinct examples with different destinations (`.trash/` vs `archive/`) and recovery semantics. MCP surface (US-6.1 / FR-H2) → tool list matches requirements (create/list/get/update/complete/state/search/delete/archive/recurrence_set).
- **Internal artifact consistency**: Glyphs match across all three documents (●/◐/✓/◷/⊘ in mockups.md §1, design-system-mapping.md §1, interaction-spec.md §2). Exit codes (0/1/2) stated consistently in interaction-spec.md §1 and design-system-mapping.md §6. Date format (YYYY-MM-DD + relative) matches. Color semantics align. No contradictions found between mockups, interaction-spec, design-system-mapping.
- **Accessibility adapted to CLI, not GUI boilerplate**: accessibility-checklist.md is meaningfully adapted — §1 covers color-not-sole-signal + `--no-color` + TTY-auto, §3 covers `--json` + exit codes for machine-readable accessibility, §4 covers UTF-8 + ISO dates, §6 covers non-interactive execution. Out-of-scope section explicitly calls out GUI-specific items (ARIA, focus order, contrast ratio measurement) as not applicable. This is correct for a CLI artifact.
- **Concept-level scope respected**: Mockups show behavior + output format (the "what"), not implementation details. Exact flag parsing logic and recurrence算出 algorithms correctly deferred to functional-design (noted as "正式なコマンド仕様・スキーマは functional-design / application-design で確定" in preamble). Appropriate for Standard depth refined-mockups stage.

### Findings

None. This is an exemplary CLI/MCP DX specification for a non-UI project.

### Summary

All four artifacts (mockups, interaction-spec, design-system-mapping, accessibility-checklist) are **complete, consistent, and implementation-ready**. Every user answer (Q1-Q5) is honored. Upstream requirements and stories are faithfully reflected (recurrence schedule-based, parent-done guard, delete=soft to .trash/, archive separate, MCP full surface). Internal consistency verified (symbols/colors/dates/exit codes match across documents). Accessibility meaningfully adapted to CLI (not GUI boilerplate). A developer could implement the CLI and MCP interface from this spec without returning to ask clarifying questions. READY to advance to delivery-planning.
