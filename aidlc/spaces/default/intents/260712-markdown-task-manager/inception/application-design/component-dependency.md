# Component Dependency — MarkTask

> Inception / application-design 成果物。依存マトリクス・通信パターン・データフロー・共有資源。
> 上流: `../requirements-analysis/requirements.md`（requirements）, `../practices-discovery/team-practices.md`（team-practices）, `./components.md`。

## 依存マトリクス（行 → 列 に依存）

| ↓依存元 / 列→ | Config | Repo | Codec | Model/SM | Recur | Query | Subtask | Del/Arc | Output | TaskSvc |
|---|---|---|---|---|---|---|---|---|---|---|
| CLI (A1) | | | | | | | | | ✓ | ✓ |
| MCP (A2) | | | | | | | | | (json) | ✓ |
| TaskService (C10) | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| Repository (C2) | ✓ | | ✓ | | | | | | | |
| Query (C6) | | ✓ | | | | | | | | |
| Subtask (C7) | | ✓ | | | | | | | | |
| Del/Arc (C8) | ✓ | ✓ | | | | | | | | |
| Recurrence (C5) | | | | | | | | | | |
| Codec (C3) | | | | | | | | | | |

- 外部ライブラリ: Codec→`gray-matter`/`yaml`、Recurrence→`date-fns`、CLI→`commander`、MCP→`@modelcontextprotocol/sdk`、Config→`yaml`。
- **RecurrenceEngine と FrontmatterCodec は他 Core に依存しない**（純粋度が高い＝厚くテスト）。

## 通信パターン

- すべて**同期・インプロセス関数呼び出し**（単一プロセス）。非同期/イベントは使わない。
- I/O は Repository に集約（ファイルシステムが唯一の副作用境界）。
- アダプタ→TaskService→ドメインの一方向依存（循環なし）。表示はアダプタ層で適用（CLI=OutputFormatter, MCP=JSON シリアライズ）。

## データフロー（例: `marktask done <ref>`）

```
CLI(commander) --ref--> TaskService.complete
  -> Repository.resolveRef + readByRef ---> Codec.decode ---> Task
  -> (repeat?) Recurrence.nextDue(prevDue)     (親?) Subtask.canComplete
  -> StateMachine.transition
  -> Codec.encode -> Repository.write (temp->rename, 原子的)
  -> CompleteOutcome --> OutputFormatter.renderMessage --> stdout / exit code
```
<!-- Text fallback: CLIがTaskService.completeを呼び、RepositoryがresolveRef/readByRef、Codecがdecode、repeatならRecurrence.nextDue、親ならSubtask.canComplete、StateMachineで遷移、Codec.encodeしてRepositoryが原子的write、結果をOutputFormatterが整形して出力。 -->

## 共有資源

- **ファイルシステム `tasks/`（SSoT）**: Repository のみが書き込む。`.trash/`・archive も Repository が管理。
- **設定 `~/.config/marktask/config.yaml`**: ConfigManager が唯一の読み書き主体。
- 共有インメモリ状態は持たない（プロセス毎に再構築、ファイルが真実）。

## 循環依存チェック

- レイヤ: アダプタ → TaskService → ドメイン（→外部lib）。逆方向なし＝**循環なし**。Repository→Codec は下位方向で健全。
