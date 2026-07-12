# Unit of Work — Story Map — MarkTask

> Inception / units-generation 成果物。user stories を実装 unit に対応付け、全 story 割当・全 unit に story があることを検証。
> 上流参照: `../user-stories/stories.md`（stories）, `../requirements-analysis/requirements.md`, `./unit-of-work.md`。

## Story → Unit マッピング

| Story | 主 Unit | 補助 Unit（横断） |
|---|---|---|
| US-1.1 タスク作成 | U-task-core | U-cli（配線） |
| US-1.2 状態を進める | U-state-management | U-task-core, U-cli |
| US-1.3 一覧で未完確認 | U-query-search | U-task-core, U-cli |
| US-2.1 メタデータ更新 | U-task-core | U-cli |
| US-3.1 繰り返し設定 | U-recurrence | U-task-core, U-cli |
| US-3.2 繰り返し完了/次回発生 | U-recurrence | U-state-management, U-task-core, U-cli |
| US-4.1 サブタスク作成/親子リンク | U-subtasks | U-task-core, U-cli |
| US-4.2 親完了ガード | U-subtasks | U-state-management, U-cli |
| US-5.1 フィルタ/検索 | U-query-search | U-task-core, U-cli |
| US-6.1 MCP ツール操作 | U-mcp | 全ドメイン unit（コア共有） |
| US-6.2 MCP 安全な削除 | U-mcp | U-delete-archive |
| US-7.1 ソフト削除 | U-delete-archive | U-task-core, U-cli |
| US-7.2 archive 退避 | U-delete-archive | U-task-core, U-cli |
| US-8.1 Obsidian ナレッジ相互参照 | U-obsidian-interop | U-task-core |
| US-T.1 データ安全性 | U-task-core | （全 unit が Repository 経由で享受） |
| US-T.2 設定 | U-task-core (Config) | U-cli (config コマンド) |
| US-T.3 別マシン再現 | U-obsidian-interop/packaging相当 | U-cli, U-mcp（README/bun install） |

## unit 内の story 実装順（unit 内のみ・Bolt 順ではない）

- **U-task-core**: US-T.2(設定) → US-1.1(作成) → US-2.1(メタ更新) → US-T.1(原子的書込は全体基盤)。
- **U-state-management**: US-1.2(遷移) → US-4.2 の状態参照。
- **U-recurrence**: US-3.1(記法パース) → US-3.2(完了ロールフォワード)。
- **U-subtasks**: US-4.1(リンク) → US-4.2(ガード)。
- **U-query-search**: US-1.3(list) → US-5.1(filter/search)。
- **U-delete-archive**: US-7.1(delete) → US-7.2(archive)。
- **U-cli**: 各コマンドを対応 story に合わせ配線（walking skeleton の add/list/done が最初）。
- **U-mcp**: US-6.1 → US-6.2。
- **U-obsidian-interop**: US-8.1（＋ US-T.3 の README 検証）。

## カバレッジ検証

- **全 story 割当**: US-1.1〜US-8.1 ＋ 横断 US-T.1〜T.3 をすべて unit に割当済み（上表）。未割当なし。
- **全 unit に story**: 9 unit すべてに 1 つ以上の story が対応（U-task-core は複数の基盤 story を保持）。孤立 unit なし。
- **cross-cutting**: US-T.1(データ安全性) は U-task-core が担保し全 unit が Repository 経由で享受。US-6.x(MCP) は全ドメイン unit を横断（コア共有）。
