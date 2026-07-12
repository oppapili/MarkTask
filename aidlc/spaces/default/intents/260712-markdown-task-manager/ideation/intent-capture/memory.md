<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-12T04:42:00Z — Derived a 7-question set (Standard depth) rather than the stage's 4 example questions; the user's description already fixes the core concept (1 task = 1 Markdown file, free-form Markdown as the selling point), so questions focus on differentiation, target user, primary usage mode (CLI/GUI/API), and storage/sync — informed by the workspace steering signals (open formats, Git/Markdown-friendly, API-first, CLI-capable, data-as-user-asset).
- 2026-07-12T04:56:00Z — Obsidian is a first-class integration target, not just a generic editor. Task Markdown files must live naturally inside an Obsidian vault, and the product should leverage wikilinks (`[[...]]`) so a task's notes connect bidirectionally to knowledge notes. Interpreting "GUI" (Q5=E) as largely satisfied by Obsidian-vault compatibility rather than a bespoke GUI we build; primary interfaces are CLI + Obsidian-compatible file format, with API for automation. To confirm at scope-definition.
- 2026-07-12T04:56:00Z — Recurrence management is now explicitly IN the MVP scope (Q7). The earlier open question resolves to "in scope"; the remaining design question is HOW recurrence is represented in a Markdown-first / Obsidian-compatible model (e.g., frontmatter rule + generated instances).

## Deviations
- 2026-07-12T05:03:00Z — Custom GUI is explicitly OUT for the MVP (user override at Q8). Primary interfaces are CLI + Obsidian-compatible Markdown file format + an MCP (Model Context Protocol) server so generative-AI agents can use MarkTask as a tool. This departs from the earlier "GUI as one of several equal surfaces" reading of Q5=E; MCP replaces a bespoke GUI/API surface as the automation/AI interface. Aligns with steering principles (CLI-capable, API-first, automatable, open formats).

## Tradeoffs
- 2026-07-12T04:51:00Z — Core value is free-form Markdown per-task (Q1=C), but the user flagged that Markdown-based storage makes recurring-task (recurrence) management weak. Tension between "plain Markdown files as source of truth" and structured recurrence scheduling; carry into scope-definition/requirements as a design decision (e.g., frontmatter-encoded recurrence rules vs. a generated-instance model).

## Open questions
- 2026-07-12T05:03:00Z — Recurrence is IN MVP scope and the user leans toward encoding the repeat rule in frontmatter on a single task file (not per-instance file generation, to avoid filename collisions and to keep accumulated history referenceable). Exact schema (rule syntax, how the "next occurrence" and completion history are represented, interaction with state/metadata) to be pinned at requirements-analysis / functional-design.
- 2026-07-12T05:03:00Z — MCP server scope: which operations to expose as MCP tools/resources, and whether MCP + CLI share one core library. To be shaped at scope-definition / application-design.
