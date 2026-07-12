# Domain Entities — U-obsidian-interop (spec)

> Construction / functional-design（unit: U-obsidian-interop, kind: spec〔Could〕）。上流参照: `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/requirements-analysis/requirements.md`（requirements）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。
> 新規ドメインエンティティは持たない。task-core の Task を Obsidian の各機構へ「見せる」マッピングを規定する spec。

## Task → Obsidian Bases 列マッピング

| frontmatter | Bases 列/フィルタ | 用途 |
|---|---|---|
| type | フィルタ（task \| recurrence） | 一覧の母集合を絞る |
| status | 列＋フィルタ | `status != done` で活動タスク |
| priority | 列＋ソート | 優先度表示 |
| due | 列＋ソート | 期限順 |
| project | 列＋グループ | 起因で束ねる |
| tags | フィルタ | タグ分類 |
| (title=ファイル名) | 表示名 | 参照キー兼タイトル |

## Task ⇔ Note 関係（wikilink）

```
Task.body --[[KnowledgeNote]]--> Note        # 本文からナレッジへ
Note <--backlink-- Task                      # Obsidian が逆リンクを提供
Task.parent = "[[ParentTask]]" --> ParentTask # 親子（U-subtasks が意味論を担保）
```

## 同梱サンプル（成果物イメージ）

- `Tasks.base` — Bases 定義（`type=task, status!=done` の活動ビュー、列= status/due/priority/title/project）。
- サンプルタスク: `<vault>/tasks/` に task/recurrence/親子の代表例（README から参照）。

## 境界

- 本 unit は **表示・互換の契約**のみ。データの正は task-core の Markdown。クエリ実装は Obsidian（Bases/Dataview）側が担い、MarkTask は互換 frontmatter を出力し続ける責務を負う（task-core スキーマの不変性）。

<!-- Text fallback: 新規エンティティなし。TaskのfrontmatterをObsidian Basesの列/フィルタ(type/status/priority/due/project/tags)へ、本文wikilinkをbacklinkへ、parentを親子リンクへマッピングするspec。同梱物はTasks.baseとサンプルタスク。実装はObsidian側、MarkTaskは互換frontmatter出力の契約を保つ。 -->
