# Components — MarkTask

> Inception / application-design 成果物。コンポーネント名・責務・公開インタフェース・境界を定義。
> 上流参照: `../requirements-analysis/requirements.md`（requirements, FR/NFR）, `../user-stories/stories.md`（stories）, `../practices-discovery/team-practices.md`（team-practices）。
> 骨格（project.md Mandated）: **CLI と MCP は単一 Core の薄いアダプタ**。スタック（application-design-questions.md）: TypeScript+bun / commander / gray-matter+yaml / date-fns / config=YAML / Prettier+ESLint / 単一パッケージ / bun:test。

## レイヤと配置

- `src/core/**` … ドメイン＋アプリケーションサービス（唯一の真の実装）。
- `src/cli/**` … commander アダプタ（人間向け, OutputFormatter 経由）。
- `src/mcp/**` … MCP SDK アダプタ（AI 向け, 構造化 JSON）。
- テスト `bun:test`（コア重点）。

## Core コンポーネント

### C1. ConfigManager
- **責務**: XDG `~/.config/marktask/config.yaml` を読み書きし、vault/tasks ディレクトリ・trash/archive パスを解決（FR-A3, NFR-4）。
- **公開 API**: `load()`, `get(key)`, `set(key, value)`, `resolvePaths()`。
- **境界**: 設定の唯一の情報源。他コンポーネントはパスをここから受け取る。

### C2. TaskRepository
- **責務**: `tasks/` の Markdown ファイル I/O。作成・読取・更新・列挙・移動（trash/archive）。**原子的書込（temp→rename）**（NFR-1）。ファイル名生成 `<YYYYMMDD>-<slug>.md` と衝突回避（FR-A1/A4）。参照解決（完全一致→部分一致→候補）（FR-D5）。
- **公開 API**: `create`, `readByRef`, `write`, `list`, `resolveRef`, `moveToTrash`, `moveToArchive`, `childrenOf`。
- **境界**: ファイルシステムに触れる唯一の層。frontmatter の意味解釈は持たず、FrontmatterCodec に委譲。

### C3. FrontmatterCodec
- **責務**: Markdown（frontmatter＋本文）↔ `Task` の相互変換（gray-matter + yaml）。既存本文・未知フィールドを保持（NFR-2）。frontmatter 非準拠ファイルは壊さず既知フィールドのみ解釈。
- **公開 API**: `decode(raw): Task`, `encode(task): string`。

### C4. TaskModel & StateMachine
- **責務**: `Task` 型（frontmatter スキーマ: tags/created/updated/type/status/priority/project/due/repeat/parent/last_done）とスキーマ検証。5状態 `todo/in-progress/done/waiting/cancelled` の遷移規則（FR-B1..B3）。
- **公開 API**: `validate(task)`, `transition(task, toStatus): Task`, `assertValidStatus`。

### C5. RecurrenceEngine（中核）
- **責務**: `repeat` 独自簡易記法のパース（`every N days/weeks/months/years`・`every <weekday(s)>`・`every month on <n|last>`・`daily/weekly/monthly/yearly`・`until`/`xN`）と**次回 due 算出（予定ベース）**（FR-E1..E6）。日付演算は date-fns。
- **公開 API**: `parse(repeat): RecurrenceRule`, `nextDue(rule, prevDue): Date | null`（null=終了）, `describe(rule)`。
- **境界**: 純粋関数中心（副作用なし）。厚くユニットテスト（team-practices Testing Posture）。

### C6. QueryService
- **責務**: フィルタ（status/due/priority/tags/project）・全文検索・ソート（既定 due 昇順）（FR-F1..F4）。`.trash/`・archive を既定で除外。
- **公開 API**: `list(filter, sort)`, `search(query)`。

### C7. SubtaskService
- **責務**: 親子解決（`parent` wikilink の逆引き）と**完了ガード（全子 done まで親 done 不可, 再帰）**（FR-G1..G4）。
- **公開 API**: `children(parentRef)`, `canComplete(parentRef): {ok, blocking[]}`。

### C8. DeleteArchiveService
- **責務**: `delete`=ソフト削除（`tasks/.trash/` へ移動）と `archive`=退避（archive 場所へ移動）を**別 operation**として提供。非破壊（FR-I1..I4）。
- **公開 API**: `softDelete(ref)`, `archive(ref)`。

### C9. OutputFormatter
- **責務**: 結果を table/compact/json に整形。status 記号＋色（色のみ非依存）・`--no-color`/非TTY自動オフ・日付（絶対＋相対）・exit code 規約（design-system-mapping 準拠）。
- **公開 API**: `renderList`, `renderTask`, `renderMessage`, `toJson`。

### C10. TaskService（アプリケーションサービス / ファサード）
- **責務**: ユースケースを合成する**共有 Core API**。両アダプタはこれだけを呼ぶ。create/update/changeState/complete（recurrence＋親ガードを内包）/list/search/delete/archive/setRecurrence/getConfig。
- **公開 API**: 下記 component-methods.md 参照。
- **境界**: ドメインコンポーネント（C2–C8）を編成。表示（C9）はアダプタ側で適用（MCP は構造化データ、CLI はテキスト）。

## アダプタ

### A1. CliAdapter（commander）
- **責務**: サブコマンド（add/list/show/update/start/done/state/search/delete/archive/config, `mt` エイリアス）を TaskService に委譲。OutputFormatter で整形。exit code を設定。
- **境界**: ビジネスロジックを持たない薄い層（team-practices/Mandated）。

### A2. McpAdapter（MCP SDK, stdio）
- **責務**: MCP ツール（create/list/get/update/complete/state/search/delete/archive/recurrence_set）を TaskService に委譲し、構造化 JSON を返す（FR-H1..H4）。delete はソフト削除ゆえ追加 confirm なし。
- **境界**: CLI と同一 TaskService を共有（コア共有 Mandated）。ローカル stdio・非公開。

## 境界とオーナーシップ（要約）

- ファイル I/O は **C2 のみ**。frontmatter 解釈は **C3 のみ**。日付/recurrence 演算は **C5 のみ**。表示整形は **C9 のみ**。ユースケース編成は **C10 のみ**。
- アダプタ（A1/A2）はロジックを持たず C10 を呼ぶだけ。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-07-12T11:40:32Z
**Iteration:** 1

### Strengths

1. **Clean layered architecture with enforced boundaries**: The design satisfies the Mandated constraint (CLI and MCP share a single Core via TaskService) with demonstrably thin adapters. The single I/O boundary (C2 Repository only) and pure components (C3 Codec, C5 RecurrenceEngine) create testable, predictable behavior. This is a textbook layered design.

2. **Complete FR/NFR traceability**: Every major requirement maps to a specific component with clear ownership:
   - FR-E (recurrence) → C5 RecurrenceEngine with date-fns (ADR-5)
   - FR-G (parent guard) → C7 SubtaskService with recursive checking
   - FR-I (delete/archive separation) → C8 DeleteArchiveService
   - FR-H (MCP surface) → A2 McpAdapter with stdio
   - NFR-1 (atomic writes) → C2 Repository temp→rename
   - FR-A3 (config) → C1 ConfigManager with XDG YAML
   
   No orphaned requirements, no god-components.

3. **No circular dependencies**: Dependency matrix confirms unidirectional flow: Adapters (A1/A2) → TaskService (C10) → Domain components (C1-C9) → external libs. The Repository→Codec dependency is downward and sound. Acyclic graph verified.

4. **Comprehensive ADRs with trade-off reasoning**: All 9 ADRs include Context/Decision/Consequences/Alternatives Rejected/Reversibility as required by inception guardrails. ADR-6 explicitly documents the TOML→YAML supersession (requirements FR-A3 tentatively said `config.toml`, Q5 answer chose YAML, ADR-6 records this override with rationale). Reversibility assessment is honest (ADR-2/4 marked "low" for intentional architecture choices, ADR-3/6/7 marked "high" for swappable details).

5. **Error handling at all boundaries**: Result<T, AppError> pattern (ADR-9) ensures no silent failures. I/O exceptions caught in Repository and normalized. Adapters map `AppError.kind` to exit codes (CLI) or structured JSON errors (MCP). Construction guardrail satisfied.

6. **Stack choices honor Q&A**: TypeScript+bun (Q1), commander (Q2), gray-matter+yaml (Q3), date-fns (Q4), YAML config (Q5), Prettier+ESLint (Q6), single-package (Q7), bun:test (Q8) — all cross-referenced in components.md header and decisions.md.

7. **Appropriate depth for Standard mvp**: Detailed business rules (OQ-1 rollforward, OQ-2 weekday edge cases) legitimately deferred to functional-design. Component responsibilities are clear enough to implement without guessing core boundaries.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | component-methods.md C5 | RecurrenceEngine.parse / nextDue signatures show `RecurrenceRule` but the type definition is not shown (internal detail). The pure-function claim in components.md is architecturally sound but the OQ-1 (rollforward) and OQ-2 (weekday clamp) edge cases are deferred | Confirm in functional-design that `nextDue` handles past-due rollforward deterministically (e.g., "add interval until future" vs "single step"). Not blocking — the API contract is clear, implementation detail can be nailed down next stage |
| 2 | Minor | decisions.md ADR-6, components.md C1 | ConfigManager mentions XDG `~/.config/marktask/config.yaml` but requirements Assumption says "vault 相対のプロジェクト設定を許すかは application-design で検討" — this was not explicitly decided in the ADRs | Acceptable omission for mvp Standard depth (vault-relative config is a Could enhancement). If requirements FR-A3 XDG path is the MVP baseline, this is fine. Flag as deferred refinement if project-level config becomes a later need |

### Summary

The design is **implementable without architectural guidance beyond this document**. A developer can map each FR to a component, understand the data flow (Repository reads→Codec decodes→Services orchestrate→Repository atomically writes), and implement the thin adapters over TaskService without guessing. The single-Core mandate is architecturally enforced, not just documented. Circular dependencies are absent. Error boundaries are explicit. ADRs document trade-offs honestly. The two findings are edge-case clarifications that functional-design will resolve — they do not expose architectural unsoundness.

**READY to advance to functional-design.**
