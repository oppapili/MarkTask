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

### スキーマ確定事項（Q6 で確定した意図的な選択）

以下は Q6 の回答で**意図的に確定**した設計判断であり、Q4 の当初案からの変更点を明示する:

- **ファイル名 = 参照キー**: `<作成日>-<タイトルslug>.md`（Q6(1): 「Q2 を優先」＝日付プレフィックス＋slug）。frontmatter の `id` フィールドは**持たない**（DRY／Q6(1) で明示的に不採用）。
- **状態は 5 つ**: `todo / in-progress / done / waiting / cancelled`。Q4 で検討した `inbox` は Q6(2) で**不採用**（細かく分けて管理し切れないため）。
- **recurrence は `repeat` のみ**: Q6(3) で `scheduled`（作業予定日）は**不採用**とし、繰り返しは `repeat` フィールド一本に集約。
- **frontmatter は Obsidian Bases 前提**: 素の YAML（`type` / `status` 等でフィルタ）、Dataview 互換も維持（Q6(4)）。

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

# repeat 付きタスクを done にすると、同一ファイルの due を次回発生日へ更新し status を todo に戻す（単一ファイル方式・新ファイルは作らない）
$ marktask done 20260712-月次レポート
Recurrence: due 2026-08-01 -> 2026-09-01, status reset to todo (single file, no new file)
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
- **列は任意に追加可**: 上表は主要フィールドのみ。Bases では `tags` / `created` / `updated` / `repeat` / `parent` 等も列・フィルタとして利用可能（この例は中核のタスク管理フィールドのみを表示）。

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


## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-07-12T10:03:43Z
**Iteration:** 2

### Strengths

- **スキーマ確定事項セクション**: 新しく追加された §1 の「スキーマ確定事項」サブセクションは、Q6 の選択を明確に文書化し、Q4 の当初案からの変更を透明化している。これにより、後段の functional-design で参照キーの方式や状態モデルの意図を追跡できる。
- **Q&A との整合性**: Q6(1) の「ファイル名は Q2 を優先、id はやめます」を正確に反映—ファイル名 `<作成日>-<タイトルslug>.md` がそのまま参照キーとなり、frontmatter の `id` フィールドは存在しない。Q6(2) の「やっぱり5状態」を反映—`inbox` は削除され、`todo / in-progress / done / waiting / cancelled` の5状態で一貫している。Q6(3) の「repeat だけあればいいです」を正確に反映—`scheduled` フィールドは削除され、frontmatter には `repeat` のみ。
- **コンセプト境界の遵守**: アーティファクト全体が Ideation レベルの範囲を守り、implementation detail（具体的な引数パース・同名ファイル衝突のハンドリング・recurrence 記法の BNF 等）を functional-design に延期している。§2 の CLI 出力は「既定=テーブル、`--format` で切替」と記載し、具体的な切替文法は後段に委ねている。
- **上流トレース**: §1 の冒頭と user-flow.md の冒頭で `intent-statement.md`, `scope-document.md`, `intent-backlog.md` への参照を明記している（`upstream-coverage` センサーの要件を満たす）。
- **アクセシビリティ**: §1 に「プレーンテキストのため screen reader/エディタ非依存。frontmatter は素の YAML で機械可読」という一行注記。§4 も Obsidian Bases での見え方にテキストフォールバックを提供。

### Findings

_（なし — この iteration ですべての Critical / Major 指摘が解決）_

### Summary

Iteration 1 で指摘した Q&A 回答の literal 読み取り不整合は完全に解消された。スキーマ確定事項セクションは、意図的な選択と変更理由を明示し、後段の implementation confusion を予防している。コア UX フロー（create → list → start → done + recurrence + wikilink 親子）のモックアップは完全であり、Obsidian Bases での運用イメージも明瞭。非 UI イニシアチブの text-UI wireframe として、次段階（Inception）に渡すに足る実装可能なコンセプトである。

**READY** と判定。
