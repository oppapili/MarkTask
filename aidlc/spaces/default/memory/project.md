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
- タスクファイルの frontmatter スキーマ確定（Q6, rough-mockups）: ファイル名＝参照キー `<作成日>-<slug>.md`（frontmatter に `id`・`title` を持たない, DRY）／状態は5つ（todo/in-progress/done/waiting/cancelled, `inbox` 不採用）／recurrence は `repeat` のみ（`scheduled` 不採用）／frontmatter は Obsidian Bases 対応（`type`/`status` 等でフィルタ）かつ Dataview 互換。 (learned 2026-07-12) <!-- cid:rough-mockups:c3 -->
- delete と archive は別 operation とする（requirements-analysis Q9）: delete=ソフト削除でファイルを `tasks/.trash/` へ移動（誤り/不要の除去・復旧可）、archive=完了/非アクティブの退避（別コマンド・意図が異なる）。ハード削除は提供しない（git がセーフティネット）。ソフト削除ゆえ MCP で delete を公開しても誤削除リスクが緩和され、MCP 側の confirm 必須は課さない。 (learned 2026-07-12) <!-- cid:requirements-analysis:c2 -->
- recurrence 独自簡易記法の MVP サポート範囲を確定（requirements-analysis Q1）: 基本間隔 `every N days/weeks/months/years`／曜日 `every <weekday>`（複数可）／月内日 `every month on <1-31|last>`／キーワード daily・weekly・monthly・yearly／終了条件 `until <YYYY-MM-DD>`・`xN`。次回 due は予定ベース（前回 due に加算, Q2=A）で `last_done` を保持。U5(recurrence) が最重要かつ最リスク Unit。 (learned 2026-07-12) <!-- cid:requirements-analysis:c3 -->
- 設定ファイル形式は YAML に確定（application-design Q5 / ADR-6）: `~/.config/marktask/config.yaml`（XDG）。requirements-analysis の暫定 TOML を上書き。理由＝frontmatter で既に YAML 依存があり、追加パーサ(TOML)を避けて導入障壁を下げる（不要な依存を増やさない方針）。 (learned 2026-07-12) <!-- cid:application-design:c2 -->
- 技術スタック確定（application-design）: TypeScript + bun / CLI=commander / frontmatter=gray-matter+yaml / 日付・recurrence=date-fns / config=YAML / formatter+linter=Prettier+ESLint / 単一パッケージ(src/core|cli|mcp) / テスト=bun:test。選定方針＝不要な依存を増やさず、周辺で主流のツールに合わせて知見の展開・共有・移植性を確保する。 (learned 2026-07-12) <!-- cid:application-design:c3 -->
- Bolt 列を walking-skeleton-first ＋ risk-first ハイブリッドで確定（delivery-planning）: Bolt1=歩く骨格(add/list/done, gated) / Bolt2=メタ+5状態 / Bolt3=recurrence(最リスクを早期) / Bolt4=検索+サブタスク / Bolt5=削除退避+MCP / Bolt6=Obsidian(Could)。逐次実行(solo/AI)。recurrence の Bolt3 前倒しは依存(task-core/state-management)充足済みで DAG 適合。 (learned 2026-07-12) <!-- cid:delivery-planning:c2 -->
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

ALWAYS CLI と MCP サーバはコアロジックを共有する（両者は単一コアの薄いアダプタとして実装する）。 (affirmed 2026-07-12)
ALWAYS フォーマッタとリンタを CI で実行し、フォーマット/リント失敗はマージをブロックする。 (affirmed 2026-07-12)
## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- レビュア（§12a）の指摘は、フォローアップの提案文ではなく質問ファイルの実際の `[Answer]:`（ユーザーの上書き回答）と突き合わせて検証し、正当な指摘のみ反映する。 (learned 2026-07-12) <!-- cid:rough-mockups:c2 -->
- formatter/linter は Prettier + ESLint に確定（application-design Q6, team-practices の保留を確定・Biome 不採用）。理由＝周辺でメジャーに使われており、主流に迎合することで知見の展開・共有・移植を可能にするため。CI で実行し失敗はマージをブロック（既存 Mandated と整合）。 (learned 2026-07-12) <!-- cid:application-design:c4 -->
