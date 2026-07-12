# Component Methods — MarkTask

> Inception / application-design 成果物。各コンポーネントの公開メソッドの署名・入出力型・エラー方針。詳細な業務ルールは functional-design で確定。
> 上流: `../requirements-analysis/requirements.md`（requirements）, `../user-stories/stories.md`（stories）, `../practices-discovery/team-practices.md`（team-practices）。TypeScript 想定の擬似署名。

## 共通型（抜粋）

```ts
type Status = 'todo' | 'in-progress' | 'done' | 'waiting' | 'cancelled';
type Priority = 'low' | 'medium' | 'high';
type TaskType = 'task' | 'recurrence';

interface Task {
  ref: string;              // ファイル名 stem（参照キー, 例 "20260712-書類を提出する"）
  title: string;            // ref から導出（frontmatter に持たない）
  body: string;             // 自由記述本文
  tags: string[];
  created: string; updated: string;   // ISO
  type: TaskType;
  status: Status;
  priority?: Priority;
  project?: string;
  due?: string;             // YYYY-MM-DD
  repeat?: string;          // recurrence 記法
  parent?: string;          // wikilink 文字列
  last_done?: string;       // YYYY-MM-DD
  raw: Record<string, unknown>; // 未知フィールド保持(NFR-2)
}

type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };
type AppError =
  | { kind: 'not-found'; ref: string }
  | { kind: 'ambiguous'; ref: string; candidates: string[] }
  | { kind: 'invalid-repeat'; input: string; reason: string }
  | { kind: 'guard-blocked'; parent: string; blocking: string[] }
  | { kind: 'config'; message: string }
  | { kind: 'io'; message: string };
```
> エラーは例外を投げず `Result<T>` で返す方針（境界を跨ぐ失敗を明示）。I/O 例外は Repository 内で捕捉し `io` エラーに正規化。

## C1. ConfigManager
```ts
load(): Result<Config>;
get(key: string): string | undefined;
set(key: string, value: string): Result<void>;   // 原子的書込
resolvePaths(): { tasksDir: string; trashDir: string; archiveDir: string };
```

## C2. TaskRepository
```ts
create(task: Task): Result<Task>;                 // ファイル名生成+衝突回避, 原子的書込
readByRef(ref: string): Result<Task>;
write(task: Task): Result<Task>;                  // temp->rename
list(): Result<Task[]>;                           // .trash/・archive を除外
resolveRef(input: string): Result<string>;        // 完全一致→部分一致→ambiguous
moveToTrash(ref: string): Result<string>;         // -> tasks/.trash/
moveToArchive(ref: string): Result<string>;       // -> archiveDir
childrenOf(parentRef: string): Result<Task[]>;    // parent 逆引き
```
- エラー: `not-found` / `ambiguous` / `io`。

## C3. FrontmatterCodec
```ts
decode(raw: string, ref: string): Result<Task>;   // gray-matter+yaml, 未知フィールド保持
encode(task: Task): string;                        // frontmatter+body を再構成
```
- エラー: 破損 YAML は `io`（ただし frontmatter 無しは正常扱い＝既知フィールド空）。

## C4. TaskModel & StateMachine
```ts
validate(task: Task): Result<Task>;
transition(task: Task, to: Status): Result<Task>;  // updated 更新
assertValidStatus(s: string): Result<Status>;
```

## C5. RecurrenceEngine
```ts
parse(repeat: string): Result<RecurrenceRule>;     // 独自簡易記法
nextDue(rule: RecurrenceRule, prevDue: Date): Date | null;  // 予定ベース, null=終了(until/xN)
describe(rule: RecurrenceRule): string;            // README/エラー案内用
```
- エラー: `invalid-repeat`（reason に理由）。日付演算は date-fns（`addMonths`/`nextDay`/`lastDayOfMonth` 等）。

## C6. QueryService
```ts
list(filter: TaskFilter, sort?: Sort): Result<Task[]>;   // 既定 due 昇順
search(query: string): Result<Task[]>;                   // 本文+タイトル
```
```ts
interface TaskFilter { status?: Status[]; dueBefore?: string; priority?: Priority[]; tags?: string[]; project?: string; includeArchived?: boolean }
```

## C7. SubtaskService
```ts
children(parentRef: string): Result<Task[]>;
canComplete(parentRef: string): Result<{ ok: boolean; blocking: Task[] }>;  // 再帰
```

## C8. DeleteArchiveService
```ts
softDelete(ref: string): Result<{ ref: string; trashPath: string }>;
archive(ref: string): Result<{ ref: string; archivePath: string }>;
```

## C9. OutputFormatter
```ts
renderList(tasks: Task[], opts: RenderOpts): string;   // table/compact, 記号+色, 切り詰め
renderTask(task: Task, opts: RenderOpts): string;
renderMessage(msg: Message): string;                   // ✓/✗ 接頭辞, 状態遷移表示
toJson(data: unknown): string;                         // --json
```
```ts
interface RenderOpts { color: boolean; relative: boolean; format: 'table'|'compact'; width: number }
```

## C10. TaskService（共有 Core API — 両アダプタが呼ぶ）
```ts
addTask(input: AddInput): Result<Task>;
updateTask(ref: string, patch: MetaPatch): Result<Task>;
changeState(ref: string, to: Status): Result<Task>;
complete(ref: string): Result<CompleteOutcome>;   // recurrence 更新 or 親ガード判定を内包
list(filter: TaskFilter, sort?: Sort): Result<Task[]>;
search(query: string): Result<Task[]>;
softDelete(ref: string): Result<...>;
archive(ref: string): Result<...>;
setRecurrence(ref: string, repeat: string | null): Result<Task>;
getConfig(): Config;
```
```ts
type CompleteOutcome =
  | { kind: 'completed'; task: Task }
  | { kind: 'recurred'; task: Task; nextDue: string }
  | { kind: 'recurrence-ended'; task: Task }
  | { kind: 'guard-blocked'; blocking: Task[] };   // 親ガード
```
- エラー方針: すべて `Result`。アダプタ（CLI/MCP）が `AppError.kind` を exit code / MCP エラー結果へマッピング。
