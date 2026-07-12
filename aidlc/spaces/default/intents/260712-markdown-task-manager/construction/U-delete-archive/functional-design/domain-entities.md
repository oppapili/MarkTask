# Domain Entities — U-delete-archive

> Construction / functional-design（unit: U-delete-archive）。上流参照: `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/requirements-analysis/requirements.md`（requirements）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。
> 新規エンティティは持たない。Task（task-core 定義）に対する「場所」操作を扱う。

## 扱う対象

- **Task**（task-core の中核エンティティ）: 本 unit は Task の**格納場所**を変える（内容・status は変えない）。
- **格納場所（Location）**: `tasksDir`（活動）/ `trashDir=tasks/.trash`（削除）/ `archiveDir`（退避）。Config（task-core）が解決。

## 結果型

```ts
type DeleteOutcome = { ref: string; trashPath: string; restoreHint: string };
type ArchiveOutcome = { ref: string; archivePath: string };
// いずれも Result<T, AppError> で返す（AppError: not-found | ambiguous | io）
```

## 関係・ライフサイクル位置

```
Task(tasksDir) --softDelete--> Task(trashDir)      # 復旧可
Task(tasksDir) --archive-----> Task(archiveDir)    # 退避（status 不変）
```

- ライフサイクル上、delete/archive は「活動集合からの退出」を表す。復帰は手動（mv/git）または将来の restore/unarchive（MVP 対象外）。

## 依存

- **task-core**: `resolveRef`, `moveToTrash`, `moveToArchive`, `Config.resolvePaths`（唯一の I/O 境界）。本 unit はロジック（どこへ・どの意図で移すか）のみを担い、物理移動は task-core に委譲。

<!-- Text fallback: 新規エンティティなし。Taskの格納場所(tasksDir/trashDir/archiveDir)を変える操作を扱う。DeleteOutcome/ArchiveOutcomeをResultで返す。softDeleteは.trash/へ(復旧可)、archiveはarchiveDirへ(status不変)。物理移動はtask-coreのmoveプリミティブに委譲。 -->
