<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-12T05:45:00Z — Non-UI initiative (no custom GUI). Per the stage's non-UI branch, "wireframes" become text-UI mockups: CLI command/output samples, the task Markdown file layout, and how tasks render in an Obsidian vault (Dataview/wikilink). "user-flow" captures the create/list/complete/recurrence flows across CLI + MCP + Obsidian. Kept low-fidelity (Ideation concept), deferring exact command flags/schemas to functional-design.

- 2026-07-12T10:00:00Z — §12a reviewer (iteration 1) returned NOT-READY, but its two "critical" findings misread the Q6 answer block: it read the follow-up's *proposal* text, not the user's *override*. Actual answers: Q6(1)「ファイル名はQ2を優先して、idはやめます」→ filename = date-prefix+slug, drop `id` (artifact already correct); Q6(3)「repeatだけあればいいです」→ drop `scheduled`, keep `repeat` only (artifact already correct). Builder did NOT apply findings #1/#3. Applied the genuine ones: added a "スキーマ確定事項" note documenting the deliberate Q6 choices (addresses #2), removed a stale `scheduled` mention in the §2 recurrence example + clarified the completion flow (#4), added a Bases additional-columns note (#5).

## Deviations
- 2026-07-12T06:14:00Z — RESOLVED (Q6=B): filename = date-prefix + slug (e.g. `20260712-書類を提出する.md`) is the reference key; frontmatter `id` DROPPED; no `title` field (DRY, filename carries the title). State model reverted to 5 (drop `inbox`). Recurrence field = `repeat` only; `scheduled` DROPPED. Obsidian Bases is the primary list-view tool (frontmatter must be Bases-filterable via `type`, `status`, etc.), staying Dataview-compatible. Final frontmatter: tags, created, updated, type (task|recurrence), status, priority, project, due, repeat (optional), parent (wikilink, optional).

## Tradeoffs

## Open questions
- 2026-07-12T05:59:00Z — User's Q4 frontmatter schema introduces refinements to reconcile before artifacts: (a) stable unique id as a millisecond timestamp in frontmatter + filename = readable title (DRY), which supersedes Q2's date-prefix+slug filename; (b) a 6th state `inbox` (scope-document had 5 states) — needs scope reconciliation; (c) recurrence field naming collides with `scheduled` (user wrote `scedule: every 1 month`), propose `repeat`; (d) Obsidian **Bases** is the user's primary list-view tool (Q5=X), not Dataview — frontmatter must be Bases-filterable (plain YAML, `type: task|recurrence`), still Dataview-compatible. Raised as follow-up Q6 for confirmation before generating wireframes/user-flow.
- 2026-07-12T05:59:00Z — New frontmatter fields to carry to requirements/functional-design: `id`, `type` (task|recurrence, for Bases filtering), `project` (free-text grouping by origin), `scheduled` (work date ≤ due), `updated`, `parent` (wikilink). Formalize the full schema at requirements-analysis.
