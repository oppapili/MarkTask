# Rough Mockups — User Flows — MarkTask

> Ideation / rough-mockups 成果物。主要な利用フロー（ハッピーパス）を低忠実度でスケッチ。
> 上流参照: `../intent-capture/intent-statement.md`, `../scope-definition/scope-document.md`, `../scope-definition/intent-backlog.md`

## Flow 1: タスクの作成 → 消化（コア happy path）

```
[思いついた作業]
      |
      v
marktask add "…" --due --priority --tags
      |
      v
tasks/<作成日>-<title>.md 生成 (status: todo)
      |
      v
marktask list  ---> 未完タスクを確認
      |
      v
marktask start <ref>  (status: in-progress)
      |
      v
作業 … 本文にメモ/[[ナレッジ]]リンクを追記
      |
      v
marktask done <ref>   (status: done)
```

<!-- Text fallback: add→ファイル生成(todo)→list確認→start(in-progress)→作業・メモ→done。 -->

## Flow 2: recurrence（繰り返し）

```
marktask add "月次レポート" --due 2026-08-01 --repeat "every 1 month"
      |
      v
tasks/…-月次レポート.md (status: todo, repeat: every 1 month)
      |
      v
marktask done <ref>
      |
      +--> repeat あり? --Yes--> 同一ファイルの due を次回発生日へ更新, status: todo に戻す
      |                          (単一ファイル方式。新ファイルは作らない)
      +--> repeat なし? --No---> status: done で確定
```

<!-- Text fallback: repeat付きタスクはdone時に同一ファイルのdueを次回へ更新しtodoへ戻す。repeatなしはdoneで確定。 -->

## Flow 3: サブタスク（wikilink 親子）

```
親タスク: tasks/20260701-申請対応.md
      |
      v
marktask add "添付書類を用意" --parent "[[20260701-申請対応]]"
      |
      v
子タスク: frontmatter parent = "[[20260701-申請対応]]"
      |
      v
Obsidian で親⇔子を wikilink/backlink で往復。list --parent <ref> で子を絞り込み
```

## Flow 4: 生成AI（MCP 経由）

```
[AIエージェント] --stdio--> [MarkTask MCP サーバ]
      |  marktask.create / list / update / complete / search
      v
コアロジック（CLIと共通）--> tasks/ の Markdown を読み書き
      |
      v
結果を構造化して AI に返す（file, status, …）
```

<!-- Text fallback: AIはMCP(stdio)経由でcreate/list/update/complete/searchを呼び、CLIと共通のコアがtasks/のMarkdownを操作、構造化結果を返す。 -->

## Flow 5: Obsidian 閲覧・集計

```
vault を Obsidian で開く
      |
      v
Base "Tasks"（type=task, status!=done でフィルタ）で一覧・並び替え
      |
      v
タスク本文の [[…]] からナレッジノートへ / backlink でノートからタスクへ
```

## Decision Points / Error Paths（主な分岐・エラー）

- `add` 時に同名ファイルが既存 → 作成日+title が衝突する稀ケースは連番サフィックス等で回避（詳細は functional-design）。
- `<ref>` が一意に定まらない/存在しない → 明示的エラーで候補提示（overconfidence を避ける）。
- `repeat` の記法が不正 → 解析エラーを分かりやすく提示（記法は README に明記）。
- 保存先ディレクトリ未設定 → 既定 `tasks/` を使用、または設定を促す。

## Notes（後段への引き継ぎ）

- 参照キー＝ファイル名（`id` フィールドは持たない, DRY）。状態は5状態。recurrence は `repeat` フィールドのみ。
- 完了時の recurrence 更新（次回 due の算出と status 戻し）の正確な挙動は functional-design で確定。
- Obsidian Bases のビュー定義（`.base`）を同梱するかは refined-mockups / application-design で検討。
