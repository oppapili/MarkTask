# MarkTask

Markdown-based task manager designed for Obsidian vaults. Each task is a single `.md` file with YAML frontmatter — naturally browsable, linkable with `[[wikilinks]]`, and queryable via Dataview.

## Interfaces

- **CLI** — `marktask` command (coming soon)
- **MCP Server** — Model Context Protocol for AI tool integration (coming soon)
- **Obsidian** — Tasks live as regular `.md` files in your vault

## Task File Format

```markdown
---
type: task
status: todo
priority: medium
tags:
  - work
created: "2026-07-12T10:00:00Z"
updated: "2026-07-12T10:00:00Z"
---
# Task body

Any markdown content here.
```

Filename is the reference key: `<YYYYMMDD>-<slug>.md` (e.g., `20260712-buy-milk.md`).

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type check
bunx tsc --noEmit

# Lint
bun run lint

# Format
bun run format
```

## Configuration

Config lives at `~/.config/marktask/config.yaml` (XDG). Defaults:

```yaml
tasksDir: ./tasks
trashDir: tasks/.trash
archiveDir: archive
```

## Obsidian

Tasks are plain `.md` files, so they work directly inside an Obsidian vault:

- **Bases / Dataview**: filter and list tasks by `type` / `status` / `priority` / `due` / `project`.
- **Wikilinks**: link task bodies to knowledge notes with `[[...]]`; subtasks reference a parent via `parent: "[[<parent-ref>]]"`.
- **Soft delete**: `delete` moves a file to `tasks/.trash/` (a dotfolder), so it drops out of normal listings but stays recoverable.

See `examples/obsidian/` for a sample `Tasks.base`, sample task/recurrence/subtask files, and a walkthrough. (Recurrence syntax is documented under Task File Format / the recurrence unit — e.g. `repeat: every 1 month`.)

## License

MIT
