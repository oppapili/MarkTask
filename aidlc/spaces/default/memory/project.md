# Project-Level Rules

> Project-specific overrides and corrections. Overrides aidlc-team.md
> and aidlc-org.md. Populated by practices-discovery and the
> self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project deviates from team-wide practice in a
> stable, durable way (e.g., "this monorepo project rebases even though
> our team default is squash"; "this legacy project skips the test
> floor because the existing suite is unsalvageable and we accept
> that").

## Way of Working

<!-- Project-specific override. Example: -->
<!-- This monorepo project rebases instead of squash-merging because -->
<!-- the per-package commit history is the audit trail we depend on -->
<!-- for partial-rollback decisions. Override applies to this project -->
<!-- only. -->

## Walking Skeleton

<!-- Project-specific override. Example: -->
<!-- This project skips the walking skeleton because we're rewriting -->
<!-- an existing service in-place — there's no greenfield bootstrap -->
<!-- to gate. -->

## Testing Posture

<!-- Project-specific override. -->

## Deployment

<!-- Project-specific override. -->

## Code Style

<!-- Project-specific override. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

- Obsidianを第一級の連携先とする。タスクのMarkdownファイルはObsidian vault内で自然に扱え、wikilink（[[...]]）でタスクのメモを既存のナレッジノートと相互リンクできること。 (learned 2026-07-12) <!-- cid:intent-capture:c2 -->
- MVPの主要インタフェースは CLI ＋ Obsidian互換のMarkdownファイル形式（frontmatter＋wikilink）＋ MCP（Model Context Protocol）サーバ（生成AIがツールとして操作可能）。独自GUI（デスクトップ/Webアプリ）は作らない。 (learned 2026-07-12) <!-- cid:intent-capture:c4 -->
## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

- recurrence（繰り返しタスク）はMVPスコープに含める。表現方式はfrontmatterに繰り返しルールを書く単一ファイル方式を志向し、完了ごとに新ファイルを生成する方式は採らない（命名衝突と履歴分断を避けるため）。 (learned 2026-07-12) <!-- cid:intent-capture:c3 -->
- recurrenceの繰り返しルールは独自の簡易記法で表現し、Dataviewで読めるfrontmatterフィールドとして保持する。記法はREADMEに明記してユーザに分かりやすくする。Obsidian Tasksプラグインの記法互換はMVP対象外（将来検討）。 (learned 2026-07-12) <!-- cid:feasibility:c2 -->
## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
