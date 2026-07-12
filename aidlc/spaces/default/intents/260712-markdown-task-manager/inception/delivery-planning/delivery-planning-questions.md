# Delivery Planning — Strategic Questions & Proposed Bolt Sequence

Project: **MarkTask**（mvp）。DAG（unit-of-work-dependency）を Bolt 列（経済的な実装順）に落とします。walking-skeleton-first は確定済み。team-formation は SKIP なので全 Bolt は AI（aidlc-developer-agent）が実行。
> 記号（A〜E, X）。既定でよければ「おまかせ」。

## 提案 Bolt 列（確認用・Revise 可）

| Bolt | 内容（Units） | 種別 | DoD / 確信仮説 |
|---|---|---|---|
| **Bolt 1** 🚶 歩く骨格 | U-task-core(最小) ＋ U-state-management(最小) ＋ U-cli(最小) | walking skeleton・gated | `marktask add/list/done` の薄い E2E が通る＝「1ファイル形式・保存先・CLIコア・状態更新」の土台が動く |
| **Bolt 2** メタ＋状態 | U-task-core(完全) ＋ U-state-management(完全) ＋ U-cli 拡充 | 通常 | メタデータ(due/priority/tags/project)・5状態が揃う |
| **Bolt 3** ⚠️ recurrence | U-recurrence | 通常（最リスク早期） | 記法パース＋予定ベース次回due＋完了ロールフォワードが破綻なく動く |
| **Bolt 4** 検索＋サブタスク | U-query-search ＋ U-subtasks | 通常 | フィルタ/検索＋親子完了ガードが動く |
| **Bolt 5** 削除/退避＋MCP | U-delete-archive ＋ U-mcp | 通常 | soft-delete/archive、MCP フル操作面が CLI と同一挙動 |
| **Bolt 6** Obsidian〔Could〕 | U-obsidian-interop | 任意 | Bases/wikilink 互換の検証・サンプル |

---

## Q1. 実装順ヒューリスティックは？

- A. walking-skeleton-first ＋ risk-first ハイブリッド（骨格を Bolt1、recurrence を早期に）
- B. value-first（価値の高い機能から）
- C. strict topological（DAG 順そのまま）
- D. おまかせ（推奨: A）
- X. その他

[Answer]:A.

---

## Q2. Bolt 粒度は？

- A. capability を束ねた Bolt（骨格は薄い縦切り、その後は関連 Unit をまとめる）＝上表
- B. 1 Unit = 1 Bolt（細かく）
- C. おまかせ（推奨: A）
- X. その他

[Answer]:A.

---

## Q3. Bolt の実行は逐次 or 並行？

- A. 逐次（solo / AI 実行なので単純・確実）
- B. 並行バッチ（依存のない Bolt を同時に）
- C. おまかせ（推奨: A 逐次）
- X. その他

[Answer]:A.

---

## Q4. 最優先で潰すリスクは？

- A. recurrence（独自記法パース＋日付算出）＝中核かつ最リスク
- B. ファイル I/O 安全性（原子的書込・既存MD非破壊）
- C. MCP 連携
- D. おまかせ（推奨: A を Bolt3 で早期に。B は Bolt1 骨格で基礎を通す）
- X. その他

[Answer]:D.

---

## Q5. 外部依存（API/データ/承認/外部チーム）は？

- A. なし（完全ローカル・AI 完結）
- B. あり（下に指定）
- X. その他

[Answer]:B.
既存データとして、TaskとRecurrenceを表現したMarkdownがある。これを読み込んで動けるとよい。非互換部分はAIにメンテして直してもらうから、気にしないで。むしろフォーマットは今回提言したものに寄せたいと思ってるくらい。
## Task 
title: kiroのサブスク開始についてエンディングノートに記載
---
id: 20260712T09494676
tags: []
created: 2026-07-12T09:49:46
updated: 2026-07-12T14:56
type: task
status: inbox
priority: medium
project:
due: 2026-07-12
scheduled: 2026-07-12
---
kiro Proを契約中。$20。

## Recurrence
title: 🔁冬服クリーニング
---
id: 20260628T13530457
tags: []
created: 2026-06-28T13:53:04
updated: 2026-06-28T13:53
type: recurrence
schedule: every 1 year
next: 2027-04-30
---

