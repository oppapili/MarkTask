# Business Rules — U-obsidian-interop (spec)

> Construction / functional-design（unit: U-obsidian-interop, kind: **spec**〔Could〕）。spec ゆえ business-logic-model は対象外（produces_kinds）。互換仕様・検証ルール中心。
> 上流参照: `../../../inception/requirements-analysis/requirements.md`（requirements, FR-J）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。

## 互換仕様ルール（frontmatter が Obsidian で読めること）

- **R1（素の YAML）**: frontmatter は Obsidian が解釈できる素の YAML であること。独自構文・非標準タグを frontmatter に持ち込まない（task-core のスキーマを維持）。
- **R2（Bases フィルタ可能）**: `type`（task|recurrence）・`status`・`priority`・`due`・`project`・`tags` が Obsidian **Bases** のプロパティとして列・フィルタに使えること。少なくとも `type`/`status` でのフィルタが成立する。
- **R3（Dataview 互換）**: 同じ frontmatter フィールドが Dataview クエリからも参照可能であること（キー名は Dataview 慣習に反しない小文字・アンダースコアなしを基本）。
- **R4（wikilink 相互参照）**: 本文中の `[[ノート]]` が Obsidian の backlink として機能し、`parent: "[[<ref>]]"` が親子リンクとして解決すること（vault 内にファイルが存在する前提）。
- **R5（隠しディレクトリ）**: `tasks/.trash/` はドット始まりで Obsidian の通常表示・Bases 集計から自然に除外されること（活動タスクのみが見える）。

## 検証（この spec unit が担保するもの）

- **V1**: サンプル `Tasks.base`（Bases 定義）を同梱し、`type = task and status != done` 等のフィルタで活動タスク一覧が表示できることを実 vault で確認する。
- **V2**: 代表タスク（task 1件・recurrence 1件・親子1組）を用意し、Dataview テーブルと backlink 往復が動くことを確認する。
- **V3**: README に「Obsidian で開く手順」「Bases/Dataview サンプル」「wikilink 運用」を記載する。

## 非機能・境界

- **R6（コード最小）**: 本 unit は主に仕様・サンプル・ドキュメントであり、恒久的な実行コードを持たない（spec）。ロジックが要る場合は task-core/query-search 側に置き、本 unit は互換性の契約と検証に徹する。
- **R7（Could）**: MVP 予算次第で後回し/スタブ可（bolt-plan Bolt6）。互換は「新スキーマが Obsidian でそのまま読める」ことで既に大半が成立している。

## 対象 stories

US-8.1（Obsidian ナレッジ相互参照）, US-T.3（README 手順の一部）。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T21:58:19Z
**Iteration:** 1

### Strengths

1. **Spec unit scoped correctly — no runtime logic leakage**: The design correctly recognizes this as a **compatibility specification** (kind: spec) with no permanent executable code. R6 explicitly states "本 unit は主に仕様・サンプル・ドキュメントであり、恒久的な実行コードを持たない（spec）。ロジックが要る場合は task-core/query-search 側に置き" — logic stays in task-core/query-search (U-task-core, U-query-search per unit-of-work.md), this unit holds the contract. The domain-entities mapping table confirms "データの正は task-core の Markdown。クエリ実装は Obsidian（Bases/Dataview）側が担い、MarkTask は互換 frontmatter を出力し続ける責務を負う" — clean boundary between spec (this unit) and implementation (task-core).

2. **Frontmatter→Bases/Dataview mapping consistent with decided schema**: The business-rules.md R2/R3 fields (type/status/priority/due/project/tags) match requirements.md FR-A2 frontmatter table exactly. The domain-entities mapping table correctly identifies `(title=ファイル名)` as display name, consistent with requirements FR-A1 "ファイル名 `<YYYYMMDD>-<slug>` が参照キー兼タイトル（frontmatter に `id`/`title` を持たない＝DRY）" and the decided schema from project.md (Q6, rough-mockups). No `id` field listed — correct per the decision. The mapping to Bases columns (type/status=filter + column, priority/due=column + sort, project=grouping, tags=filter) is implementable without ambiguity.

3. **Wikilink parent semantics correctly deferred to U-subtasks**: R4 acknowledges wikilink functionality ("本文中の `[[ノート]]` が Obsidian の backlink として機能し、`parent: "[[<ref>]]"` が親子リンクとして解決すること"), but the domain-entities boundary note clarifies "親子（U-subtasks が意味論を担保）" — this unit only asserts **display compatibility** (the link renders and backlinks work), while the **completion guard logic** (FR-G2 "全子 done まで親 done 不可") lives in U-subtasks per unit-of-work.md U7 "SubtaskService。親子逆引き（`parent` wikilink）＋完了ガード". Clean separation — U-obsidian-interop owns "wikilink renders", U-subtasks owns "wikilink semantics enforce guard". No duplication, no gap.

4. **Hidden directory exclusion explicitly noted**: R5 "tasks/.trash/ はドット始まりで Obsidian の通常表示・Bases 集計から自然に除外されること（活動タスクのみが見える）" documents the `.trash/` exclusion behavior as a natural consequence of Obsidian's dotfile handling, consistent with requirements FR-I1 "ソフト削除: ファイルを `tasks/.trash/` へ移動" and FR-I3 "既定 `list`/`search` は `.trash/` と archive を除外". The spec acknowledges both the MarkTask-side filtering (task-core's responsibility per FR-I3) and the Obsidian-side filtering (Bases doesn't show dotfiles by default) — the interop verification confirms these align.

5. **Could/deferrable stance appropriately acknowledged**: R7 "MVP 予算次第で後回し/スタブ可（bolt-plan Bolt6）。互換は「新スキーマが Obsidian でそのまま読める」ことで既に大半が成立している" correctly captures the Could priority from unit-of-work.md "U-obsidian-interop (kind: spec, complexity: S) 〔Could〕" and acknowledges the MVP risk — the core compatibility is **already delivered by the schema design in task-core**, so this unit's value is validation + documentation + samples, not foundational. If Bolt6 gets cut, the system still works with Obsidian (just without curated samples/instructions). Honest prioritization.

6. **Requirements traceability confirmed**: R1-R7 and V1-V3 trace to FR-J (Obsidian/Bases 連携) and requirements.md explicitly lists FR-J1 "タスク本文の `[[...]]` でナレッジノートと相互参照でき、Obsidian の backlink で往復できる（ファイル形式互換のみで成立）" and FR-J2 "タスク群を Obsidian Bases で DB 的に一覧できる素の frontmatter を保つ（`type`/`status` 等でフィルタ）". The "対象 stories" section correctly cites US-8.1 (Obsidian ナレッジ相互参照) and US-T.3 (README 手順の一部) per unit-of-work-story-map mapping. No orphaned rules, no unmapped requirements.

7. **Validation deliverables are concrete and testable**: V1/V2/V3 specify actionable validation criteria — V1 "サンプル `Tasks.base`（Bases 定義）を同梱し、`type = task and status != done` 等のフィルタで活動タスク一覧が表示できることを実 vault で確認する" gives a reproducible test (load the sample vault, open Bases with the bundled `.base`, confirm the view renders active tasks). V2 "代表タスク（task 1件・recurrence 1件・親子1組）を用意し、Dataview テーブルと backlink 往復が動くことを確認" provides concrete sample data and success criteria. A code-generation agent can implement these checks without guessing.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | business-rules.md V1 | "フィルタで活動タスク一覧が表示できることを実 vault で確認する" — verification step is manual ("実 vault で確認"), not automated | Acceptable for a spec unit at Standard mvp depth. The validation is inherently integration-level (requires a real Obsidian vault) and the team's testing posture is "コア重点（ファイル I/O・状態遷移・recurrence パーサ・次回発生日）にユニットテストを厚く、周辺は薄くする" (team.md). Obsidian interop is peripheral validation, not core logic. If future iterations add automated tests (e.g., a CI step that checks `.base` syntax validity), that's a bonus; for MVP Could, manual verification is sufficient. Not blocking. |
| 2 | Minor | domain-entities.md "同梱サンプル" | Artifact list mentions "Tasks.base" and "サンプルタスク" but doesn't specify sample filenames or exact frontmatter content | Expected for functional-design stage — the artifact **types** are defined (Bases definition file, sample task files), the exact filenames and content are code-generation's job to produce. The domain-entities table already pins the required frontmatter schema (type/status/priority/due/project/tags mapping) which is sufficient for code-generation to create conforming samples. Not a design gap, just a natural stage boundary. |

### Summary

The functional design for **U-obsidian-interop** is **complete and implementable**. A code-generation agent can produce: (1) a `Tasks.base` Bases definition with filters on `type`/`status` and columns for `status`/`due`/`priority`/`title`/`project`, (2) sample task Markdown files (one `type: task`, one `type: recurrence`, one parent-child pair) with conforming frontmatter, (3) README section documenting Obsidian vault setup + Bases/Dataview usage + wikilink workflow. The design correctly scopes this as a **validation & documentation unit** with no permanent runtime logic — all logic stays in task-core/query-search per unit boundaries. The frontmatter→Obsidian mapping is consistent with the decided schema (no `id`/`title` in frontmatter, filename=title). Wikilink semantics are appropriately delegated to U-subtasks (this unit only verifies link rendering). The Could stance is honest (core compatibility already delivered by schema, this unit adds polish). Requirements trace cleanly to FR-J and US-8.1/T.3. The two findings are intentional design choices (manual validation per team testing posture, artifact details deferred to code-generation) that do not block implementation.

**READY to proceed to NFR design.** The spec is sound — the missing artifact is the stage's product (produces_kinds confirms `spec` units produce `business-rules` + `domain-entities` but NOT `business-logic-model` — exactly what's present).
