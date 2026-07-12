# Units Generation — Decomposition Plan

Project: **MarkTask**（mvp）。application-design のコンポーネント＋proto-Units（intent-backlog U1〜U9）から分解。
> このステージは**トポロジ（依存 DAG）**のみを決めます。実装順・クリティカルパスは delivery-planning(2.8) の経済判断なので、ここでは決めません。
> 提案プランに問題なければ「Approve Plan」、変えたい所があれば「Revise Plan」で指定してください。

## 分解の方針（提案・確認用）

- **境界戦略**: capability（機能能力）単位。共有 Core（ADR-2）の上に薄い CLI/MCP アダプタ。
- **粒度**: 中粒度（コンポーネントを機能能力に束ねる。個人 mvp で細かすぎない）。
- **deployment**: 単一パッケージ・ローカル（ADR-3, ADR-1）。`service`=実行可能アダプタ, `library`=Core の再利用コード, `spec`=互換仕様。
- **並行性**: 独立 unit は並行実装可（複数のトポロジ順が成立）。

## 提案ユニット（9）

| Unit | kind | 責務 | 対応 proto-Unit/FR |
|---|---|---|---|
| task-core | library | 1タスク=1ファイル基盤: Config, Repository(原子的I/O・ファイル名/ref解決・trash/archive移動primitive), FrontmatterCodec, TaskModel(metadata含むスキーマ) | U1,U3 / FR-A,C |
| state-management | library | 5状態 StateMachine＋遷移use-case | U2 / FR-B |
| recurrence | library | RecurrenceEngine(記法パース+次回due, date-fns)＋完了ロールフォワード | U5 / FR-E |
| query-search | library | filter/sort/検索 | U6 / FR-F |
| subtasks | library | 親子逆引き＋完了ガード | U7 / FR-G |
| delete-archive | library | soft-delete(.trash/)・archive退避 | FR-I |
| cli | service | commander アダプタ＋OutputFormatter＋exit code、全コマンド配線 | U4 / FR-D |
| mcp | service | MCP SDK アダプタ、ツール登録、構造化JSON | U8 / FR-H |
| obsidian-interop | spec | Bases/Dataview/wikilink 互換の検証・サンプル(.base 等) 〔Could〕 | U9 / FR-J |

## 依存 DAG（トポロジのみ・非循環）

- task-core → (なし)
- state-management → task-core
- recurrence → task-core, state-management
- query-search → task-core
- subtasks → task-core, state-management
- delete-archive → task-core
- cli → task-core, state-management, recurrence, query-search, subtasks, delete-archive
- mcp → task-core, state-management, recurrence, query-search, subtasks, delete-archive
- obsidian-interop → task-core 〔Could〕

**並行機会**: task-core→state-management の後、{recurrence, query-search, subtasks, delete-archive} は相互依存なしで並行可。cli と mcp は相互依存なし（両者ともドメイン unit 群に依存）。

---

## 確認ポイント（Revise 時に指定してください）

- Q1. 粒度はこの中粒度（9 unit）でよいか？（より粗く/細かく）
- Q2. `obsidian-interop`(Could) を MVP unit に含めるか、外すか？
- Q3. 依存 DAG の追加/削除はあるか？

## Plan Approval

- A. Approve Plan — この分解（9 unit・上記 DAG）で3成果物を生成
- B. Revise Plan — 変更点を指定（Q1 粒度 / Q2 obsidian-interop の要否 / Q3 DAG 修正 など）
- X. その他

[Answer]:A（Approve Plan）。この9 unit・DAG で生成。obsidian-interop は Could のまま含める。
