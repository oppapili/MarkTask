# Domain Entities — U-subtasks

> Construction / functional-design（unit: U-subtasks）。上流参照: `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/requirements-analysis/requirements.md`（requirements, FR-G）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。
> 新規の永続エンティティなし。Task 間の親子関係（wikilink）を解釈する。

## 親子関係（Task ⇔ Task）

```
Child.parent = "[[<Parent.ref>]]"      # frontmatter（task-core スキーマ）
Parent <--(逆引き: children)-- Child*  # SubtaskService が repo.list から算出
```
- 関係は子側の `parent` フィールド一方向で表現。親側は自分の子を明示保持しない（逆引きで求める＝DRY・整合の単一情報源）。
- 多階層：Child 自身が別の子の Parent になり得る（再帰）。

## ガード判定の結果型

```ts
type GuardResult = { ok: boolean; blocking: Task[] };   // blocking = 未完(todo/in-progress/waiting)の子孫
// Result<GuardResult, AppError> で返す（AppError: io）
```

## 状態と完了扱い（OQ-4）

| 子の status | 親完了への影響 |
|---|---|
| done | 完了扱い（妨げない） |
| cancelled | 完了扱い（妨げない・意図的中止） |
| todo / in-progress / waiting | ブロッキング（親を done にできない） |

## 依存・境界

- **task-core**: `Repository.list`（逆引き母集合）, `resolveRef`。本 unit は書込・状態変更をしない（読取＋判定のみ）。
- **U-state-management**: 親 `done` 時に本 unit の `canComplete` を呼ぶ（TaskService が結線）。

<!-- Text fallback: 新規永続エンティティなし。親子は子のparent="[[親]]"一方向で表現し、childrenは逆引きで算出(単一情報源)。多階層は再帰。GuardResult{ok,blocking}を返す。完了扱いはdone/cancelled、todo/in-progress/waitingはブロッキング(OQ-4)。読取のみで副作用なし、task-core.listに依存、親doneガードはU-state-managementから呼ばれる。 -->

## Coverage

- US-4.1（親子リンク）, US-4.2（完了ガード）。requirements OQ-4（waiting/cancelled とガード）を本設計で確定。
