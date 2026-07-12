# Rough Mockups — Clarifying Questions

Project: **MarkTask** — 非UI（CLI＋Markdownファイル＋MCP＋Obsidian）。UIモックの代わりに CLI出力・ファイルレイアウト・Obsidian表示をスケッチします。
> 記号（A〜E, X）で回答。複数選択可は `A, C`。既定案でよければその旨だけでOK。

---

## Q1. CLI コマンド体系は？

- A. サブコマンド方式（`marktask add`, `marktask list`, `marktask done` …）
- B. 短縮エイリアス重視（`mt a`, `mt ls`, `mt done`）＋フルコマンド併用
- C. おまかせ（推奨: A ＋ 短縮エイリアス `mt` も用意）
- X. その他（自由記述）

[Answer]:A.

---

## Q2. タスクIDの方式は？（ファイル名／参照に使う）

- A. 日付プレフィックス＋slug（例: `20260712-buy-milk.md`）
- B. 連番（例: `0007.md`）
- C. 短いハッシュ/ULID（例: `01J9XR....md`）
- D. タイトル slug のみ（例: `buy-milk.md`）
- E. おまかせ（推奨: A）
- X. その他（自由記述）

[Answer]:A.

---

## Q3. `list` の既定出力フォーマットは？

- A. テーブル（状態／期限／優先度／タイトル）
- B. チェックボックス風（`[ ] タイトル (due, prio)`）
- C. コンパクト1行（`id  状態  タイトル`）
- D. おまかせ（推奨: A、`--format` で切替可）
- X. その他（自由記述）

[Answer]:D.

---

## Q4. タスクファイルのテンプレート（既定案でよいですか？）

既定案:
```
---
title: 買い物へ行く
status: todo            # todo/in-progress/done/waiting/cancelled
due: 2026-07-20
priority: medium
tags: [home]
repeat: weekly          # recurrence（任意, 独自簡易記法）
parent: "[[親タスク]]"   # サブタスク時（任意, wikilink）
created: 2026-07-12
---

## メモ
自由記述…
```

- A. この既定案でOK
- B. 修正したい（下の X で指定）
- X. その他（フィールドの追加/削除/改名を指定）

[Answer]:B.フロントマターは以下のようにしたい。
---
id: 20260705T19355593 # システム内で一位になるような年月日時分秒ミリ秒
tags: []
created: 2026-07-05T19:35:55
updated: 2026-07-05T19:36
type: task # Baseでのフィルタリング用。task or recurrence。
status: inbox # inbox/todo/in-progress/done/waiting/cancelled 作成仕立てで期日考えてないものはinbox。
priority: medium
project: # 任意文字列。何起因で作業下かを束ねる。
due: 2026-08-07
scheduled: 2026-08-07 # いつ作業予定か。due以前であること。
parent: "[[親タスク]]"
scedule: every 1 month # recurrence。任意。独自簡易記法。
---

タイトルはファイル名でよい。（DRYにしたい。）

---

## Q5. Obsidian での主な使い方（見せ方）で重視するものは？（複数選択可）

- A. Dataview クエリでタスク一覧・期限順に集計
- B. wikilink でタスク⇔ナレッジノートの相互参照
- C. タグ／フォルダでの整理
- D. 特にこだわらない（互換性が保てればよい）
- X. その他（自由記述）

[Answer]:B.C.X.でBaseでの一覧参照。


---

## Q6.（フォローアップ）前設問の整合確認 — 重要

以下の解釈で進めてよいですか？

- **(1) ファイル名とID**: Q2「ファイル名=日付+slug」と Q4「id は frontmatter のミリ秒タイムスタンプ／タイトルはファイル名(DRY)」を整合。→ **ファイル名＝人間可読タイトル（例 `買い物へ行く.md`）、一意な参照IDは frontmatter の `id`（例 `20260705T19355593`）** とする（Q4 を優先、ファイル名に日付プレフィックスは付けない）。
- **(2) 状態モデル**: Q4 で `inbox` が加わり **6状態（inbox / todo / in-progress / done / waiting / cancelled）** になります。scope-document は5状態でしたが、**6状態に更新**してよいですか？
- **(3) recurrence フィールド名**: `scheduled`（作業予定日, due以前）と `scedule: every 1 month`（繰り返し）が紛らわしいため、繰り返しは **`repeat`（独自簡易記法, 例 `every 1 month`）** に改名し、`scheduled` は予定日として残す。
- **(4) 一覧ビュー**: Q5 で Obsidian **Bases** 参照を重視 → frontmatter は Bases で扱える素の YAML（`type` などでフィルタ）とし、Dataview とも互換を保つ。

- A. すべてOK（この解釈で進める）
- B. 一部修正（下の X で指定）
- X. その他（具体的に）

[Answer]:B.
(1)ファイル名はQ2を優先して、idはやめます。
(2)やっぱり5状態にしておきます。あんまり分けて管理できてないし。
(3)repeatだけあればいいです。
(4)OK。


---

## Q7.（運用）レビュア復旧方法の選択
§12a のレビュア（aidlc-product-lead-agent）のサブエージェント起動が回線由来で2回失敗。進め方を選択:

- A. Retry（再試行）— もう一度サブエージェント起動を試す
- B. Run inline — 私が Product Lead 観点で独立レビューを実施し `wireframes.md` に `## Review` を追記（§11 正規フォールバック, 推奨）
- C. Skip and revisit — レビューを省略して承認ゲートへ
- X. その他

[Answer]:
