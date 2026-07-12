# Rough Mockups — Wireframes (Text-UI) — MarkTask

> Ideation / rough-mockups 成果物。非UIイニシアチブのため「画面」ではなく **CLI出力・タスクファイルのレイアウト・Obsidian(Bases)での見え方** を低忠実度でスケッチする。
> 上流参照: `../intent-capture/intent-statement.md`, `../scope-definition/scope-document.md`, `../scope-definition/intent-backlog.md`
> 注: これはコンセプト確認用の概略。正式なコマンド仕様・スキーマは functional-design で確定する。

## 1. タスクファイルのレイアウト（1タスク=1Markdownファイル）

ファイル名が参照キー兼タイトル（DRY）: `<作成日>-<タイトルslug>.md`
例: `tasks/20260712-書類を提出する.md`

```markdown
---
tags: []
created: 2026-07-12T19:35:55
updated: 2026-07-12T19:36:00
type: task            # task | recurrence  （Obsidian Bases のフィルタ用）
status: todo          # todo | in-progress | done | waiting | cancelled
priority: medium      # low | medium | high
project:              # 任意。何起因の作業かを束ねる自由文字列
due: 2026-08-07
repeat:               # 任意。recurrence の独自簡易記法（例: every 1 month）
parent:               # 任意。サブタスク時に親を wikilink（例: "[[20260701-申請対応]]"）
---

## メモ
ここに自由記述。手順・参照・関連ノートへの wikilink（[[ナレッジノート]]）など。
```

<!-- Text fallback: タスクは1ファイル1タスク。ファイル名=作成日+タイトルslugで参照キー兼タイトル。frontmatterにtags/created/updated/type/status/priority/project/due/repeat/parentを持ち、本文は自由記述。 -->

- **アクセシビリティ/UX 注記**: プレーンテキストのため screen reader/エディタ非依存。frontmatter は素の YAML で機械可読（Bases/Dataview 双方が読める）。

## 2. CLI 出力モックアップ（`marktask` サブコマンド ＋ 短縮 `mt`）

### タスク作成
```
$ marktask add "書類を提出する" --due 2026-08-07 --priority high --tags work
Created  tasks/20260712-書類を提出する.md  (status: todo)
```

### 一覧（既定=テーブル, `--format` で切替）
```
$ marktask list
STATUS        DUE         PRIO    TITLE
todo          2026-08-07  high    書類を提出する
in-progress   2026-07-15  medium  設計レビュー
waiting       -           low     返信待ちの件
3 tasks (1 todo, 1 in-progress, 1 waiting)

$ marktask list --status todo --format compact
20260712-書類を提出する   todo   書類を提出する
```

### 状態変更・完了
```
$ marktask start 20260712-書類を提出する
Updated  status: todo -> in-progress

$ marktask done 20260712-書類を提出する
Updated  status: in-progress -> done
```

### 検索
```
$ marktask search "レビュー"
in-progress   2026-07-15  medium  設計レビュー   (tasks/20260710-設計レビュー.md)
1 match
```

### recurrence（繰り返し）
```
$ marktask add "月次レポート" --due 2026-08-01 --repeat "every 1 month"
Created  tasks/20260712-月次レポート.md  (status: todo, repeat: every 1 month)

# 完了すると同一ファイルの due/scheduled が次回発生日へ更新される（単一ファイル方式）
$ marktask done 20260712-月次レポート
Updated  status: done -> (recurrence) next due: 2026-09-01, status: todo
```

<!-- Text fallback: CLIは marktask add/list/start/done/search 等のサブコマンド。listは既定テーブル、--formatで切替。recurrenceは完了時に同一ファイルのdueを次回へ更新。 -->

## 3. MCP 経由（生成AIツール）モックアップ

stdio ローカル・非公開。AI エージェントが以下のようなツールを呼ぶ:
```
tool: marktask.create   args: { title, due, priority, tags, repeat? }   -> { file, status }
tool: marktask.list     args: { status?, due_before?, tag? }            -> [ {file, status, due, priority, title} ]
tool: marktask.update   args: { ref, fields }                           -> { file, updated }
tool: marktask.complete args: { ref }                                   -> { file, status }
tool: marktask.search   args: { query }                                 -> [ ... ]
```
（CLI とコアロジックを共有。詳細な操作面は application-design で確定）

## 4. Obsidian / Bases での見え方（スケッチ）

vault 内 `tasks/` に置かれた各タスクファイルを Obsidian **Bases** でDB的に一覧:

```
+---------------------------------------------------------------+
| Base: Tasks   (filter: type = task, status != done)           |
+------------+-------------+----------+-------------+------------+
| title      | status      | priority | due         | project    |
+------------+-------------+----------+-------------+------------+
| 書類を提出 | todo        | high     | 2026-08-07  | 総務       |
| 設計レビュー| in-progress | medium   | 2026-07-15  | MarkTask   |
+------------+-------------+----------+-------------+------------+
```

- **wikilink 相互参照**: タスク本文から `[[ナレッジノート]]` で知識ノートへ、逆リンク（backlink）でノート側からタスクを辿れる。サブタスクは `parent: "[[親タスク]]"` で親子接続。
- **タグ/フォルダ整理**: `tags` とフォルダ（`tasks/` 配下）で分類。

<!-- Text fallback: Obsidian BasesでタスクファイルをDB的に一覧（type/statusでフィルタ、title/status/priority/due/project列）。本文のwikilinkでナレッジと相互参照、parentで親子接続、tags/フォルダで整理。 -->

## 5. 情報アーキテクチャ（概念）

```
vault/
  tasks/                         <- 設定可能（既定 tasks/）
    20260712-書類を提出する.md    <- 1タスク=1ファイル
    20260712-月次レポート.md       <- repeat 付き（単一ファイル）
    20260710-設計レビュー.md
  notes/                         <- 既存ナレッジ（wikilinkで相互参照）
```

参照キー = ファイル名。状態/メタは frontmatter。本文は自由記述＋wikilink。
