# Code Summary — U-query-search

> Construction / code-generation（unit: U-query-search, library）。実コードは workspace root `src/core/`。上流参照: `./code-generation-plan.md`, `../functional-design/*`, `../nfr-requirements/tech-stack-decisions.md`, `../../../inception/requirements-analysis/requirements.md`（FR-F）。

## 生成/変更ファイル

- `src/core/query.ts`（新規）— クエリ層。
  - 値オブジェクト: `TaskFilter`（status/dueBefore/priority/tags/project/includeArchived）, `Sort`（key/dir/nullsLast）, `DEFAULT_SORT = { key:'due', dir:'asc', nullsLast:true }`（domain-entities.md 準拠）。
  - 純粋関数: `matches(task, filter)`（AND 合成 R2・未指定は恒真）, `filterTasks(tasks, filter)`, `sortTasks(tasks, sort=DEFAULT_SORT)`（安定ソート・nullsLast・priority 意味順・created 副キー R5）, `searchTasks(tasks, query)`（title+body 大小無視部分一致 R6・0件は空配列）。
  - `QueryService`（薄いオーケストレータ）: `list(filter?, sort?)`（母集合 = `repo.list()` ＋ `filter.includeArchived` 時 `repo.listArchived()` 連結 → filter → sort）, `search(query)`（`repo.list()` → searchTasks）。副作用なし・`Result<Task[], AppError>` で I/O エラー伝播。
- `src/core/repository.ts`（in-place 追記）— 列挙 API を補完（結線ギャップ解消）。
  - `list(): Promise<Result<Task[]>>` — `listRefs()` → 各 ref を `read()` → `Task[]`。個別 decode 失敗は `io` エラーで fail-fast（silent skip しない, construction guardrail）。
  - `listArchived(): Promise<Result<Task[]>>` — `archiveDir` を走査（存在しなければ `ok([])`）、各 `.md` を decode。`includeArchived` 指定時のみ呼ばれる。
- `src/core/index.ts`（更新）— `QueryService`・純粋関数（`matches`/`filterTasks`/`sortTasks`/`searchTasks`）・`DEFAULT_SORT`・型（`TaskFilter`/`Sort`）を再エクスポート。
- `src/core/query.test.ts`（新規, bun:test）— 49 テスト。

## 主要な実装判断

- **単一 I/O 境界の維持（INV4）**: フィルタ/ソート/検索本体は `Task[]` を受ける純粋関数として実装し、ファイル列挙は task-core の `TaskRepository` に閉じた。QueryService は repo から母集合をロードして純粋関数を合成する薄いアダプタ。副作用ゼロで最大限テスト容易。
- **結線ギャップの解消**: 現行 Repository は `listRefs()`＋`read()` のみで `list()`/`listArchived()` 未実装だったため、functional-design の擬似コード `repo.list()`/`repo.listArchived()` を満たすメソッドを in-place 追記（重複ファイル禁止, brownfield 修正）。
- **DB 非依存の O(n) 走査（R8, ADR-4, NFR-3）**: インデックス DB を持たず標準 Array 操作で解決。数千件で実用速度。将来ボトルネック化時にキャッシュ追加可（可逆）。外部依存の追加ゼロ。
- **境界セマンティクス**: `dueBefore` は `t.due != null && t.due <= f.dueBefore`（`<=` 包含, R4）。`tags` は部分集合一致（R3）。`priority` ソートは high>medium>low の意味順、`status` ソートは in-progress>todo>waiting>done>cancelled の意味順。同値は `created` 昇順を副キーに安定化。
- **表示分離（R7）**: QueryService は `Task[]` を返すのみ。列・記号・色・`--json` 整形は OutputFormatter/アダプタ（U-cli/U-mcp）の責務。

## テスト結果（検証済み）

- **`bun test`: 112 pass / 0 fail**（新規 +49、既存 63 を維持）。`query.test.ts` の内訳（6 describe）:
  - `matches`: 未指定＝全通過、status/priority 配列包含、dueBefore 境界（`<=` 包含・due 未設定は除外）、tags 部分集合（全含む/一部欠け）、project 一致、複数条件 AND。
  - `filterTasks`: フィルタ適用・空フィルタ。
  - `sortTasks`: due 昇順＋nullsLast（未設定末尾）、priority 意味順、created 副キー安定性、dir=desc、DEFAULT_SORT、status 意味順。
  - `searchTasks`: title ヒット・body ヒット・大小無視・部分一致・0 件空配列・空クエリ。
  - `QueryService`: list（filter/sort/includeArchived 連結）・search・I/O エラー伝播。
  - `TaskRepository.list() / listArchived()`: 列挙→decode の happy path・空ディレクトリ・archive 未存在時の空配列。
- **`bunx tsc --noEmit`: エラーなし**、**`eslint src/`: 違反なし**。sensors（linter/type-check）に適合。

## プランからの逸脱

- なし。プランの Step 1〜7 をすべて実装（全チェックボックス `[x]`）。
- 補足: 本セッションでは前セッション生成済みのコードを検証したところ、`node_modules` 未インストールにより test/tsc/lint が一時的に失敗していた。`bun install` で解消し、上記のとおり green を確認した（コード自体の修正は不要）。

## Review

**Reviewer:** aidlc-architecture-reviewer-agent
**Verdict:** READY
**Date:** 2026-07-14T14:13:20Z
**Iteration:** 1

### Strengths

- **Faithful implementation of functional design flows (business-logic-model.md)**: `list(filter, sort)` orchestrates `repo.list()` → `includeArchived` opt-in → `filterTasks(matches)` → `sortTasks`；`search(query)` は normalize → 部分一致 → 既定ソート。純粋関数（`matches`/`filterTasks`/`sortTasks`/`searchTasks`）は擬似コードのシグネチャ・意味を忠実に実装（逸脱・独自機能なし）。
- **Business rules R1-R8 を正しい意味で実装**: R2 AND 合成（未指定は no-op）、R3 tags 部分集合、R4 dueBefore `<=` 包含（null 除外）、R5 due 昇順 nullsLast＋created 安定副キー、R6 大小無視検索・0 件空配列、R1 trash/archive 既定除外＋includeArchived opt-in、R7 表示分離、R8 DB 非依存 O(n)。
- **単一 I/O 境界（INV4）を厳守**: QueryService はファイルシステム import ゼロ、列挙は `TaskRepository.list()`/`listArchived()` に委譲。純粋関数は `Task[]` に対し副作用なし。新規 `list()`/`listArchived()` は decode 失敗で fail-fast（silent skip なし）・`Result<T,AppError>`。
- **外部依存の追加ゼロ（tech-stack-decisions）**: 標準 Array/String 操作のみ。dueBefore は ISO 文字列辞書順比較で date-fss 不要。ADR-4（インデックス DB なし・インメモリ走査）を尊重。
- **テストは Standard 戦略に適合し全エッジケースを網羅**: query.test.ts 49 テスト（matches 16 / filterTasks 3 / sortTasks 8 / searchTasks 7 / QueryService 6 / TaskRepository.list-listArchived 9）。全 R に ≥1 テスト。境界 `<=`・tags 部分集合欠け・nullsLast false・0 件・archive 未存在を検証。全体 112 pass / 0 fail。
- **完全・実行可能で placeholder/secret なし**: 全ファイル production-ready、JSDoc 完備、TODO/FIXME なし。I/O エラーは `Result<T,AppError>`（ADR-9）で境界に surface。バレルエクスポート完備。

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | src/core/query.ts:117,138-139 | `nullsLast` 既定 true を `sort.nullsLast !== false` の二重否定で表現。挙動は正しい（test で検証済み）が可読性がやや低い | mvp では許容。将来 `sort.nullsLast ?? true` に整理可。実装ブロッカーではない。 |
| 2 | Minor | src/core/query.ts:72-100 `matches` | 6 条件を逐次 `if` で評価。可読だがフィルタ増加時は predicate 配列 `.every()` へリファクタ余地 | mvp では許容（現状 FR-F1 の 6 条件は完全集合）。8 条件超で次イテレーションに検討。早すぎる抽象化は不要。 |

### Summary

U-query-search の code-generation 出力は **そのまま実装・デプロイ可能な production-ready** 状態。functional-design の忠実な翻訳で、全 business rule（R1-R8）の意味が正しく、全フロー（list/search）が擬似コードに一致し、全エッジケース（null 処理・0 件・decode エラー）をテストで網羅。QueryService は境界を尊重（fs アクセスゼロ／整形ロジックゼロ／状態変更ゼロ）。エラー処理は明示的（I/O は `Result<T,AppError>`、検索 0 件は空配列）。インメモリ走査は mvp スケール（NFR-3 数千件）に適切かつ可逆（ADR-4）。2 件の Finding はコード可読性の提案でバグ・構造欠陥・実装ブロックではない。検証は網羅的（112 tests pass、tsc clean、eslint clean）。追記した `TaskRepository.list()`/`listArchived()` がプランで特定された結線ギャップを解消。クロスユニット契約検証: task-core の `TaskRepository`・共有型（`Task`/`Result`/`AppError`）を正しく消費し `Task[]` を返す（component-methods C6）。sibling ユニット読取りなし。FR-F1〜F4 を充足。

**READY to advance to build-and-test.**
