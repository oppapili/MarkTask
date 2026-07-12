# Unit of Work — MarkTask

> Inception / units-generation 成果物。実装可能な Unit へ分解（トポロジのみ。実装順・クリティカルパスは delivery-planning が決定）。
> 上流参照: `../application-design/components.md`, `../application-design/component-methods.md`, `../application-design/services.md`, `../application-design/component-dependency.md`, `../application-design/decisions.md`, `../requirements-analysis/requirements.md`, `../user-stories/stories.md`。
> 方針: capability 単位・中粒度／単一パッケージ・ローカル（ADR-3）／独立 unit は並行可。

## Units

### U-task-core  (kind: library, complexity: L)
- **責務/オーナー**: 1タスク=1 Markdown ファイル基盤。ConfigManager, TaskRepository（原子的 temp→rename 書込・ファイル名 `<YYYYMMDD>-<slug>` 生成・衝突回避・ref 解決[完全一致→部分一致→候補]・trash/archive 移動 primitive・列挙）, FrontmatterCodec（gray-matter+yaml, 本文/未知フィールド保持）, TaskModel（frontmatter スキーマ＋metadata フィールド）。
- **deployment**: embedded（Core ライブラリ, 単一パッケージ内 `src/core/**`）。
- **実装ノート**: すべての I/O の単一境界。NFR-1(原子的)・NFR-2(既存MD非破壊) をここで担保。TaskService ファサードの型もここで定義。
- **対応**: U1,U3 / FR-A, FR-C, FR-D5, NFR-1, NFR-2, NFR-4。

### U-state-management  (kind: library, complexity: S)
- **責務**: 5状態 StateMachine と遷移 use-case（start/done(非recurrence)/wait/cancel/state）。`updated` 更新。
- **deployment**: embedded。**対応**: U2 / FR-B。

### U-recurrence  (kind: library, complexity: L)  ← 最重要/最リスク
- **責務**: RecurrenceEngine。`repeat` 記法パース（間隔/曜日/月内日/キーワード/終了条件）＋次回 due 算出（予定ベース）＋完了時ロールフォワード（due 更新・todo 復帰・last_done 記録・終了条件で done 確定）。date-fns 使用。
- **deployment**: embedded。**実装ノート**: 純粋関数中心・厚くユニットテスト（team-practices）。OQ（大幅遅延時のロールフォワード規則, 曜日/月末算出）は functional-design で確定。**対応**: U5 / FR-E。

### U-query-search  (kind: library, complexity: M)
- **責務**: QueryService。filter（status/due/priority/tags/project）・全文検索・ソート（既定 due 昇順）。`.trash/`・archive 除外。
- **deployment**: embedded。**対応**: U6 / FR-F。

### U-subtasks  (kind: library, complexity: M)
- **責務**: SubtaskService。親子逆引き（`parent` wikilink）＋完了ガード（全子 done まで親 done 不可・再帰）。`list --parent`。
- **deployment**: embedded。**対応**: U7 / FR-G。

### U-delete-archive  (kind: library, complexity: S)
- **責務**: DeleteArchiveService。`delete`=ソフト削除（`tasks/.trash/`）・`archive`=退避（別 operation・非破壊）。
- **deployment**: embedded。**対応**: FR-I。

### U-cli  (kind: service, complexity: M)
- **責務**: commander アダプタ。全サブコマンド（add/list/show/update/start/done/state/search/delete/archive/config, `mt` エイリアス）を TaskService に配線。OutputFormatter（table/compact・記号+色・`--no-color`・日付絶対+相対・`--json`）・exit code(0/1/2)。
- **deployment**: standalone（`marktask` 実行可能・`src/cli/**`）。**対応**: U4 / FR-D, refined-mockups DX。

### U-mcp  (kind: service, complexity: M)
- **責務**: MCP SDK アダプタ（stdio ローカル）。ツール登録（create/list/get/update/complete/state/search/delete/archive/recurrence_set）→ TaskService → 構造化 JSON。delete はソフトゆえ confirm なし。
- **deployment**: standalone（MCP サーバ・`src/mcp/**`）。**対応**: U8 / FR-H。

### U-obsidian-interop  (kind: spec, complexity: S) 〔Could〕
- **責務**: frontmatter が Obsidian Bases/Dataview で読め、本文 wikilink が backlink で機能することの検証・サンプル（`.base` 等）・README 記載。コードよりも互換仕様・検証中心。
- **deployment**: spec（同梱ドキュメント/サンプル）。**対応**: U9 / FR-J（Could）。

## サマリ

- **unit 数**: 9（library×6, service×2, spec×1）。complexity: L×2(task-core, recurrence), M×4, S×3。
- **kind による Construction 設計適用**: `library`/`service` はロジックを持つのでフル設計、`spec`(obsidian-interop) は業務ロジックモデル不要（互換仕様中心）。
- 実装順・並行バッチは delivery-planning が DAG（unit-of-work-dependency.md）から決定。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T11:57:41Z
**Iteration:** 1

### Strengths

1. **Decomposition matches approved plan exactly**: 9 units at capability-medium granularity as affirmed in Q&A Answer A. Each unit has clear ownership (library=Core reusable code, service=deployed adapter, spec=compatibility validation). Unit boundaries reflect application-design components cleanly — U-task-core bundles the foundational C1+C2+C3+C4, while capability-specific units (U-recurrence, U-query-search, U-subtasks) each own a single concern. No god-units, no orphaned fragments.

2. **YAML edge block is present, well-formed, and ACYCLIC**: The required fenced `yaml` block in unit-of-work-dependency.md declares all 9 units with explicit `kind` tags and `depends_on` arrays. Topological analysis confirms no cycles: U-task-core (root) → U-state-management → second tier {U-recurrence, U-query-search, U-subtasks, U-delete-archive, U-obsidian-interop} → adapters {U-cli, U-mcp}. Every name in `depends_on` resolves to a declared unit. No self-dependencies. The graph is a valid DAG ready for delivery-planning's Bolt sequencing.

3. **Strict topology discipline — no premature sequencing**: The dependency doc explicitly states "トポロジのみ・非循環" and "実装順・クリティカルパスは delivery-planning が DAG から決定（ここでは決めない）." The prose describes **what can depend on what**, not what should ship first — exactly the contract between 2.7 and 2.8. Parallel opportunities are identified (4 domain units independent after state-management, cli+mcp independent of each other) without prescribing a single "recommended build order." Textbook separation of concerns.

4. **Complete story coverage with no orphans**: unit-of-work-story-map.md maps all 17 stories (US-1.1 through US-8.1 plus US-T.1/T.2/T.3) to their implementing units. Every unit has ≥1 story. Cross-cutting stories (US-T.1 data safety, US-6.1 MCP surface) correctly identify primary vs supplemental units. The coverage matrix validates that every user-facing workflow traces to an implementation unit and every unit justifies its existence with story assignments. No orphaned stories, no story-less units.

5. **Integration points are explicit and testable**: TaskService facade (type defined in U-task-core, used by U-cli/U-mcp) provides the single contract surface. Shared filesystem SSoT (`tasks/`) is owned exclusively by U-task-core Repository. Config isolation via ConfigManager. The "統合点" section in dependency doc pins these boundaries — a developer can implement units in isolation and compose at the facade. Result<T,AppError> pattern (from ADR-9) ensures no hidden error channels.

6. **Complexity estimates are honest and defensible**: U-task-core and U-recurrence marked L (largest, most risk — atomic writes + date-fns recurrence parsing). U-cli/U-mcp/U-query-search/U-subtasks marked M (orchestration, filtering, recursion). U-state-management/U-delete-archive/U-obsidian-interop marked S (simple transitions, file moves, spec validation). The relative sizing matches the scope of each unit's responsibility. U-recurrence flagged as "最重要/最リスク" with explicit test mandate — appropriate acknowledgment of complexity.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | unit-of-work.md U-recurrence | "OQ（大幅遅延時のロールフォワード規則, 曜日/月末算出）は functional-design で確定" — rollforward edge cases (past-due tasks, weekday clamping, month-end handling) deferred to next stage | Acceptable deferral for Standard mvp depth. The unit responsibility ("次回 due 算出（予定ベース）＋完了時ロールフォワード") is clear enough for Construction to proceed; the algorithm details (how many intervals to skip on multi-week delay, how to clamp February 30→28) are functional-design's job to nail down. Not blocking. |
| 2 | Minor | unit-of-work-dependency.md prose | U-obsidian-interop 〔Could〕 dependency is listed consistently but the unit's actual implementation scope (validation, samples, README) vs no-op stub is not pinned | For delivery-planning: confirm whether obsidian-interop ships as a real validation Bolt or as a documentation stub in MVP. If Could priorities shift, this unit can be safely skipped without breaking dependencies — it has no downstream dependents. Recommend flagging at delivery-planning as a "defer-candidate" if budget is tight. |

### Summary

The decomposition is **implementable without further architectural guidance**. A developer can read the 9 unit definitions, understand the DAG (via the YAML edge block), and begin implementing U-task-core knowing that U-state-management will be its first consumer. The dependency topology is sound (acyclic, all references valid). Story coverage is complete (every story maps, every unit justifies itself). Integration contracts are explicit (TaskService facade, Repository SSoT). The discipline to avoid premature sequencing is exemplary — 2.7 delivered exactly what 2.8 needs (a valid DAG), no more, no less.

The two findings are legitimate deferrals (recurrence algorithm edge cases to functional-design) and planning decisions (obsidian-interop priority clarification at delivery-planning). Neither exposes architectural unsoundness. The units can ship in any topological order — multiple valid Bolt sequences exist because the parallelism is genuine, not forced.

**READY to advance to delivery-planning.** The Bolt orchestrator will consume this DAG and choose the economic sequencing (walking skeleton first, risk-first or value-first for remaining units).
