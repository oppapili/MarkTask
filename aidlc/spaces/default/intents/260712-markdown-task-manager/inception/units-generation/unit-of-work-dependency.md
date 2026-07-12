# Unit of Work Dependency — MarkTask

> Inception / units-generation 成果物。Unit 間の依存 DAG（**トポロジのみ**・非循環）。実装順/クリティカルパスは delivery-planning が本 DAG を入力に決定する（ここでは決めない）。
> 上流参照: `../application-design/component-dependency.md`, `../application-design/components.md`, `../requirements-analysis/requirements.md`。

## 依存関係（prose）

- **U-task-core**: 依存なし（基盤）。
- **U-state-management**: → U-task-core。
- **U-recurrence**: → U-task-core, U-state-management（完了ロールフォワードで状態遷移を使う）。
- **U-query-search**: → U-task-core。
- **U-subtasks**: → U-task-core, U-state-management（完了ガードで状態を参照）。
- **U-delete-archive**: → U-task-core。
- **U-cli**: → U-task-core, U-state-management, U-recurrence, U-query-search, U-subtasks, U-delete-archive。
- **U-mcp**: → U-task-core, U-state-management, U-recurrence, U-query-search, U-subtasks, U-delete-archive。
- **U-obsidian-interop** 〔Could〕: → U-task-core。

## 統合点（Integration Points）

- 全ドメイン unit は **TaskService ファサード**（型は U-task-core が定義）経由で結線され、アダプタ（cli/mcp）が呼ぶ。契約＝`component-methods.md` の署名（`Result<T,AppError>`）。
- 共有データ＝`tasks/` の Markdown（U-task-core の Repository のみが書込）と `config.yaml`（ConfigManager）。
- cli と mcp は同一 TaskService を共有（挙動一致は結合テストで保証）。

## 並行開発機会（複数のトポロジ順が成立）

- U-task-core → U-state-management の後、**{U-recurrence, U-query-search, U-subtasks, U-delete-archive}** は相互依存なしで**並行実装可**。
- **U-cli** と **U-mcp** は相互依存なし（両者ともドメイン群に依存）→ 並行可。
- U-obsidian-interop(Could) は U-task-core のみに依存し、他と並行可。

## 機械可読 エッジブロック（必須・DAG の正本）

```yaml
units:
  - name: U-task-core
    kind: library
    depends_on: []
  - name: U-state-management
    kind: library
    depends_on: [U-task-core]
  - name: U-recurrence
    kind: library
    depends_on: [U-task-core, U-state-management]
  - name: U-query-search
    kind: library
    depends_on: [U-task-core]
  - name: U-subtasks
    kind: library
    depends_on: [U-task-core, U-state-management]
  - name: U-delete-archive
    kind: library
    depends_on: [U-task-core]
  - name: U-cli
    kind: service
    depends_on: [U-task-core, U-state-management, U-recurrence, U-query-search, U-subtasks, U-delete-archive]
  - name: U-mcp
    kind: service
    depends_on: [U-task-core, U-state-management, U-recurrence, U-query-search, U-subtasks, U-delete-archive]
  - name: U-obsidian-interop
    kind: spec
    depends_on: [U-task-core]
```

<!-- Text fallback: U-task-coreが根。state-managementがtask-coreに依存。recurrence/subtasksはtask-core+state-managementに依存。query-search/delete-archive/obsidian-interopはtask-coreに依存。cli/mcpは全ドメインunit(task-core,state-management,recurrence,query-search,subtasks,delete-archive)に依存。循環なし。 -->

## 非循環の確認

- 全エッジは「下位（基盤）方向」のみ。逆流なし＝**サイクルなし**。トポロジ順の一例: task-core → state-management → (recurrence, query-search, subtasks, delete-archive 並行) → (cli, mcp 並行) 、obsidian-interop は task-core 後いつでも。
