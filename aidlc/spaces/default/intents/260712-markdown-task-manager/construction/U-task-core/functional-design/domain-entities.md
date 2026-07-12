# Domain Entities — U-task-core

> Construction / functional-design（unit: U-task-core）。上流参照: `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/requirements-analysis/requirements.md`（requirements）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。
> エンティティ・属性・関係・ライフサイクル。

## Task（中核エンティティ）

| 属性 | 型 | 由来 | 備考 |
|---|---|---|---|
| ref | string | ファイル名 stem | 参照キー兼タイトル（永続化しない・導出） |
| title | string | ref から導出 | frontmatter に持たない |
| body | string | 本文 | 自由記述 Markdown |
| tags | string[] | frontmatter | |
| created | ISO datetime | frontmatter | 生成時自動・不変 |
| updated | ISO datetime | frontmatter | 変更ごと更新 |
| type | `task`\|`recurrence` | frontmatter | Bases フィルタ用 |
| status | Status(5) | frontmatter | 既定 `todo` |
| priority | `low`\|`medium`\|`high` | frontmatter | 既定 `medium` |
| project | string | frontmatter | 任意 |
| due | date | frontmatter | 任意 |
| repeat | string | frontmatter | recurrence 記法（U-recurrence が解釈） |
| parent | wikilink | frontmatter | サブタスク親（U-subtasks が解釈） |
| last_done | date | frontmatter | recurrence 最終完了日 |
| raw | map | frontmatter 全体 | 未知フィールド温存（INV2） |

- **物理表現**: `tasksDir/<ref>.md`（frontmatter＋本文）。
- **ライフサイクル位置**: 生成(todo) → 状態遷移(U-state-management) → soft-delete で `trashDir/` へ / archive で `archiveDir/` へ移動（U-delete-archive）。task-core は生成・読取・書込・移動の primitive を提供。

## Config（設定エンティティ）

| 属性 | 型 | 既定 |
|---|---|---|
| tasksDir | path | `./tasks` |
| trashDir | path | `tasks/.trash` |
| archiveDir | path | `archive` |
| (拡張) | — | 将来の表示/挙動設定 |

- 物理表現: `~/.config/marktask/config.yaml`（XDG）。

## 値オブジェクト / 補助型

- **Status**: `todo | in-progress | done | waiting | cancelled`（値オブジェクト・5状態）。
- **Result<T>**: `{ok:true,value} | {ok:false,error:AppError}`（全公開メソッドの戻り, ADR-9）。
- **AppError**: `not-found | ambiguous | invalid-repeat | guard-blocked | config | io`（kind 判別）。
  - task-core が生成するのは `not-found` / `ambiguous` / `config` / `io`（`invalid-repeat` は U-recurrence、`guard-blocked` は U-subtasks）。

## 関係

```
Config 1 --- resolves paths ---> TaskRepository
TaskRepository 1 --- reads/writes N ---> Task(.md)
TaskRepository --- uses ---> FrontmatterCodec (decode/encode)
Task --- validated by ---> TaskModel
Task 0..1 --- parent(wikilink) ---> Task   (関係の解釈は U-subtasks)
```

<!-- Text fallback: 中核はTaskエンティティ(ref/title/body＋frontmatter属性群＋raw)。物理はtasksDir/<ref>.md。ConfigはXDG YAMLでtasks/trash/archiveパスを保持。Status/Result/AppErrorが補助型。RepositoryがCodecでTaskを読み書きしTaskModelが検証、parentはTask間の任意関係(解釈はU-subtasks)。 -->

## Coverage（U-task-core が支える stories）

- US-1.1（作成）, US-2.1（メタ更新）, US-T.1（データ安全性）, US-T.2（設定）。他ユニットの多くが本 Task/Repository を土台に成立。
