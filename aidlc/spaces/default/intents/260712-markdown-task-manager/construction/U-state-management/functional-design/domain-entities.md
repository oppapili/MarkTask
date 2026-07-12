# Domain Entities — U-state-management

> Construction / functional-design（unit: U-state-management）。上流参照: `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/requirements-analysis/requirements.md`（requirements）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。
> 新規の永続エンティティなし。Status 値オブジェクトと遷移を扱う（Task は task-core 所有）。

## Status（値オブジェクト）

```ts
type Status = 'todo' | 'in-progress' | 'done' | 'waiting' | 'cancelled';
```

## 状態ライフサイクル（概念図）

```
        +----> in-progress ----+
        |                      v
 todo --+----> waiting ----> done        (recurrence の done は todo へ戻る＝U-recurrence)
        |                      ^
        +----> cancelled ------+
```
- 遷移は原則自由（R2）。矢印は代表的な流れ。recurrence タスクの `done` は同一ファイルで `todo` に戻り due が次回へ（U-recurrence が担当）。
- 親タスクの `done` は全子完了が条件（U-subtasks のガード）。

<!-- Text fallback: Statusは5値の値オブジェクト。遷移は原則自由でupdatedを更新。recurrenceのdoneはtodoへ戻る(U-recurrence)、親のdoneは全子done条件(U-subtasks)。新規永続エンティティなし、Taskはtask-core所有。 -->

## CompleteOutcome（done の結果・TaskService が組み立てる）

```ts
type CompleteOutcome =
  | { kind: 'completed'; task }
  | { kind: 'recurred'; task; nextDue }       // U-recurrence
  | { kind: 'recurrence-ended'; task }         // U-recurrence
  | { kind: 'guard-blocked'; blocking };       // U-subtasks
```

## 依存・境界

- StateMachine は Task を受け取り Task を返す純粋関数寄り（副作用なし・厚くテスト, team-practices）。
- done の分岐で U-recurrence / U-subtasks に委譲（TaskService が deps を注入）。永続化は task-core。

## Coverage

- US-1.2（遷移）, US-3.2（recurrence 完了の一次遷移）, US-4.2（親ガード連携）。
