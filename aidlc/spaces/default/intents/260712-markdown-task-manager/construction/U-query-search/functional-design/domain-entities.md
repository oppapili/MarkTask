# Domain Entities — U-query-search

> Construction / functional-design（unit: U-query-search）。上流参照: `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/requirements-analysis/requirements.md`（requirements）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。
> 新規の永続エンティティはなし。クエリ用の値オブジェクトを定義（Task は task-core が所有）。

## 値オブジェクト

```ts
interface TaskFilter {
  status?: Status[];
  dueBefore?: string;      // YYYY-MM-DD
  priority?: Priority[];
  tags?: string[];         // すべて含む（部分集合）
  project?: string;
  includeArchived?: boolean; // 既定 false
}

interface Sort {
  key: 'due' | 'priority' | 'created' | 'status';
  dir: 'asc' | 'desc';
  nullsLast?: boolean;     // due 未設定を末尾へ
}
```

- 既定: `Sort = { key:'due', dir:'asc', nullsLast:true }`。

## 関係

```
QueryService --reads--> TaskRepository.list()/listArchived()   (task-core)
QueryService --produces--> Task[]   (整形は OutputFormatter/アダプタ)
```

- QueryService は Task を**読むだけ**（書き込み・移動はしない）。副作用なし＝ユニットテストしやすい。

## Coverage

- US-1.3（list 既定 due 昇順・trash/archive 除外）, US-5.1（filter/search）。

<!-- Text fallback: 新規永続エンティティなし。TaskFilter(status/dueBefore/priority/tags/project/includeArchived)とSort(key/dir/nullsLast)を値オブジェクトとして定義。既定ソートはdue昇順・未設定末尾。QueryServiceはtask-coreのlistを読みTask[]を返すのみ(整形はアダプタ)。 -->
