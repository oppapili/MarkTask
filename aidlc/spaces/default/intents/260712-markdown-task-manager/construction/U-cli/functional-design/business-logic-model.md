# Business Logic Model — U-cli

> Construction / functional-design（unit: U-cli, service）。上流参照: `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/units-generation/unit-of-work-story-map.md`, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-D）, `../../../inception/application-design/components.md`（components）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/application-design/services.md`（services）。
> 対象: CLI アダプタ（commander）＋ OutputFormatter。**薄いアダプタ**（ロジックは TaskService, project.md Mandated）。refined-mockups の DX 仕様を実装。

## 1. コマンド配線（commander, FR-D1,D2）

```
program(name='marktask', alias='mt')
  .command('add <title>').option(--due --priority --tags --project --repeat --parent)
      -> taskService.addTask(input) -> render
  .command('list').option(--status --due --priority --tag --project --format --relative --archived --sort --limit --json)
      -> taskService.list(filter,sort) -> renderList
  .command('show <ref>').option(--json)         -> taskService.getByRef -> renderTask
  .command('update <ref>').option(...meta...)   -> taskService.updateTask -> render
  .command('start|done|wait|cancel <ref>')      -> taskService.changeState / complete -> render
  .command('state <ref> <value>')               -> taskService.changeState -> render
  .command('search <query>').option(--json)     -> taskService.search -> renderList
  .command('delete <ref>')                      -> taskService.softDelete -> render(復旧ヒント)
  .command('archive <ref>')                     -> taskService.archive -> render
  .command('config').option(--set --get --list) -> taskService.getConfig/setConfig -> render
```
- 各ハンドラは **TaskService を呼ぶだけ**。ビジネス判断はしない。

## 2. done ハンドラの結果分岐（CompleteOutcome → 出力）

```
res = taskService.complete(ref)
switch res.kind:
  'completed'        -> ✓ status -> done
  'recurred'         -> ✓ (recurring) due -> nextDue, status -> todo, last_done
  'recurrence-ended' -> ✓ (recurring) ended (until/xN), status -> done
  'guard-blocked'    -> ✗ 未完子一覧を提示 (exit 1)   # --force で上書き時は changeState('done')
```

## 3. 出力整形 OutputFormatter（refined-mockups / design-system-mapping）

```
renderList(tasks, opts): テーブル(status記号+色/due絶対+相対/priority/title 切り詰め) or compact or json
renderTask(task, opts): frontmatter+本文
renderMessage(msg): ✓/✗ 接頭辞、状態遷移 "ref status: X -> Y"
color: opts.color = isTTY() && !--no-color
```

## 4. 結果→exit code マッピング（interaction-spec）

```
Ok -> exit 0
Err(kind):
  not-found | ambiguous(候補提示) | guard-blocked | invalid-repeat -> exit 1
  config(未設定/使用法)                                            -> exit 2
```
- `ambiguous` は候補一覧を stderr/stdout に提示（FR-D5, overconfidence 回避）。

## 5. 入出力・非対話（FR-D4）

- 破壊的でない操作はプロンプトなしで完結。delete/archive はソフトゆえ即実行＋復旧ヒント（Q4=A）。
- stdout=結果、stderr=エラー/警告。`--json` 指定時は JSON のみを stdout（人間向け装飾なし）。

<!-- Text fallback: U-cliはcommanderでadd/list/show/update/start|done|wait|cancel/state/search/delete/archive/configを配線し各ハンドラはTaskServiceを呼ぶだけ。doneはCompleteOutcomeで分岐表示、OutputFormatterがtable/compact/json+記号色+日付+切り詰めを整形、色はTTY&&!--no-color。結果はexit code(0/1/2)へマップ、ambiguousは候補提示。非対話・ソフト操作は即実行+復旧ヒント。 -->

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T13:17:30Z
**Iteration:** 1

### Strengths

1. **Thin adapter discipline rigorously enforced**: Every command handler in §1 follows the pattern "parse args → call TaskService → render result." No business logic, no direct file I/O, no state management in the CLI layer. The design satisfies project.md Mandated constraint ("CLI と MCP はコアロジックを共有する") with demonstrable thinness. This is exactly the architecture components.md prescribed.

2. **Complete FR-D2 command set coverage**: All 14 commands from requirements are present (add/list/show/update/start/done/wait/cancel/state/search/delete/archive/config plus `mt` alias). Each maps to its TaskService method without gaps. Cross-reference to component-methods.md TaskService API confirms every command has a corresponding service operation.

3. **CompleteOutcome branching is correct and complete**: §2 done handler maps all four outcome kinds (completed/recurred/recurrence-ended/guard-blocked) to distinct output behaviors. The `recurred` branch correctly updates due→nextDue and status→todo, matching U-state-management contract. Guard-blocked behavior (present未完子一覧, exit 1) is explicit and includes the --force carve-out. This matches component-methods.md CompleteOutcome type exactly.

4. **DX requirements from refined-mockups fully honored**: §3 OutputFormatter implements all design-system-mapping rules — status symbol+color with color-only non-dependence (accessibility), --no-color/TTY detection, absolute+relative date併記, table columns status/due/priority/title with truncation, --json for machine-readable output. The rendering rules trace directly to refined-mockups Q1/Q2/Q3/Q5 answers. No invented behavior.

5. **Exit code mapping and ambiguous-ref handling are sound**: §4 maps Result<T> error kinds to exit codes 0/1/2 per design-system-mapping §6. The ambiguous case explicitly presents candidates to stderr/stdout (FR-D5, overconfidence avoidance) rather than auto-selecting. This is the correct interpretation of the requirement.

6. **Non-interactive UX correctly implemented**: §5 confirms destructive-but-reversible operations (delete/archive) execute immediately with recovery hints, satisfying refined-mockups Q4=A (delete/archive はソフトゆえ即実行＋復旧ヒント). stdout/stderr separation and --json formatting ensure script-friendly behavior.

7. **OutputFormatter placement is architecturally correct**: The design places OutputFormatter in U-cli (presentation layer for human output) rather than in Core, matching component-methods.md declaration. MCP will use structured JSON from TaskService directly, while CLI uses this formatter — clean separation of concerns.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | business-logic-model.md §2 | done handler shows --force carve-out ("--force で上書き時は changeState('done')") but this flag is not listed in §1 command signature or domain-entities.md command table | Confirm in code-generation: does `done` command accept optional `--force` flag to bypass parent guard? If yes, add to §1 signature. If no, remove the carve-out from §2. The guard-blocked outcome is already well-defined; --force is a UX convenience that needs explicit wire-up. |
| 2 | Minor | domain-entities.md RenderOpts | RenderOpts.format shows 'table' \| 'compact' \| 'json', but design-system-mapping §5 and refined-mockups Q3 answer suggest --json is a separate flag, not a format enum value | Clarify: is --json a boolean flag that bypasses rendering (TaskService → raw JSON), or is it a format:'json' value passed to OutputFormatter? Current component-methods.md shows OutputFormatter.toJson as separate from renderList, suggesting --json should be a top-level boolean that skips the formatter entirely. Recommend: RenderOpts.format = 'table' \| 'compact' only; --json exits early before calling OutputFormatter. |

### Summary

The functional design is **implementable without architectural guidance beyond this document**. A developer can write the commander wiring in §1, implement the CompleteOutcome switch in §2, build the OutputFormatter methods in §3, map exit codes in §4, and honor the stdout/stderr/TTY rules in §5 without guessing core intent. The thin-adapter constraint is architecturally enforced, not just documented. Command coverage is complete. Cross-references to shared contracts (TaskService API, CompleteOutcome type, design-system-mapping rules, FR-D requirements) are valid and consistent.

The two findings are wiring clarifications (--force flag presence, --json flag vs format enum) that will resolve naturally during code-generation when the developer writes the actual commander .command() signatures and option parsing. Neither finding exposes architectural unsoundness — they are signature-level details the implementation will pin down. The design is sufficiently complete for a developer to proceed.

**READY to advance to nfr-requirements.**
