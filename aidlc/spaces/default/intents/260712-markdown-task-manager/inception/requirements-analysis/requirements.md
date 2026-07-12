# Requirements — MarkTask (MVP)

> Inception / requirements-analysis 成果物。上流参照: `../../ideation/intent-capture/intent-statement.md`（intent-statement）, `../../ideation/scope-definition/scope-document.md`（scope-document）, `../practices-discovery/team-practices.md`（team-practices）。
> Depth: Standard / Scope: mvp。Ideation で確定済みの決定（frontmatter スキーマ・5状態・CLI 体系・walking-skeleton-first）を前提に、requirements-analysis-questions.md（Q1〜Q9）で詰めた内容を要件化する。

## Intent Analysis（達成したいこと）

`intent-statement.md` の中核ゴールは「**1タスク = 1 Markdown ファイル**でタスクを自由記述の文書として扱い、プレーンな Markdown 資産として長期に残す**ロックインゼロ**のタスク管理」を、**CLI＋Obsidian互換ファイル形式＋MCP** の3インタフェースで、個人の日常運用に完全移行できる水準で実現すること。`scope-document.md` はこれをローカルのみ・個人利用・recurrence 含みで境界付けた。本要件はとりわけ、Markdown ベース管理の既知の弱点である **recurrence（繰り返し）** を破綻なく扱うことを重視する。`team-practices.md` の方針（walking-skeleton-first、コア重点テスト、CLI と MCP のコア共有）に沿って要件の検証可能性を担保する。

## Functional Requirements（機能要件）

各要件は検証可能な受入基準（AC, Given/When/Then）を伴う。優先度は `scope-document.md` の MoSCoW を継承。

### FR-A タスクコア＆ストレージ（Must, proto-Unit U1）

- **FR-A1** 1タスク=1 Markdown ファイル。ファイル名 `<作成日 YYYYMMDD>-<タイトルslug>.md` が参照キー兼タイトル（frontmatter に `id`/`title` を持たない＝DRY）。
- **FR-A2** frontmatter スキーマ（下表）を読み書きし、本文は自由記述として保持する。
- **FR-A3** 保存先ディレクトリは設定可能（既定 `tasks/`）。設定は XDG 準拠 `~/.config/marktask/config.toml`（vault パス・tasks ディレクトリ等を保持, FR-N3）。
- **FR-A4** ファイル名衝突（同日・同 slug）時は一意化サフィックス（例 `-2`）で回避する。

**frontmatter スキーマ（確定）**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| tags | list | 任意 | 分類タグ |
| created | datetime | 自動 | 作成時刻 |
| updated | datetime | 自動 | 最終更新時刻 |
| type | enum(`task`\|`recurrence`) | 必須 | Bases フィルタ用。繰り返しタスクは `recurrence` |
| status | enum(5状態) | 必須 | `todo`\|`in-progress`\|`done`\|`waiting`\|`cancelled` |
| priority | enum(`low`\|`medium`\|`high`) | 任意 | 既定 `medium` |
| project | string | 任意 | 起因を束ねる自由文字列 |
| due | date | 任意 | 期限 |
| repeat | string | 任意 | recurrence 独自簡易記法（FR-E） |
| parent | wikilink | 任意 | サブタスクの親（`"[[<親ファイル名>]]"`） |
| last_done | date | 任意 | recurrence の最終完了日（Q3=C, 新規） |

AC: Given 有効な frontmatter を持つファイル / When コアが読み込む / Then 全フィールドが型どおり構造化される。Given 未知フィールドや手書き Markdown / When 読み込む / Then 破損させず既知フィールドのみ解釈する（FR-N2）。

### FR-B 状態管理（Must, U2）

- **FR-B1** 5状態 `todo/in-progress/done/waiting/cancelled` を持つ。
- **FR-B2** 状態遷移コマンド（`start`→in-progress、`done`→done、`wait`→waiting、`cancel`→cancelled、任意の `state <value>`）を提供。遷移時 `updated` を更新。
- **FR-B3** 無効な状態値は明示エラー（許容値を提示）。

AC: Given todo のタスク / When `done` / Then status=done かつ updated 更新（recurrence 例外は FR-E4）。

### FR-C メタデータ（Must, U3）

- **FR-C1** due / priority / tags / project を CLI 引数で設定・更新できる。
- **FR-C2** frontmatter は Dataview 可読かつ Obsidian Bases でフィルタ可能な素の YAML を維持する（`team-practices.md`／IC 制約）。

### FR-D CLI（Must, U4）

- **FR-D1** サブコマンド方式（`marktask <cmd>`）＋短縮エイリアス `mt`（Q1 rough-mockups）。
- **FR-D2** コマンド群（最小）: `add` / `list` / `show` / `update` / `start` / `done` / `state` / `search` / `delete` / `archive` / `config`。
- **FR-D3** `list` 既定はテーブル出力、`--format`（table/compact 等）で切替（Q3 rough-mockups=D）。
- **FR-D4** すべての破壊的でない操作は非対話で完結。エラーは人間可読で候補・理由を提示（overconfidence 回避）。
- **FR-D5** タスク参照 `<ref>`（CLI/MCP 共通）の解決規則（Q5=C）: ファイル名 stem の完全一致を優先し、無ければタイトル slug の部分一致にフォールバック。複数該当で曖昧な場合はエラーにせず候補一覧を提示して選ばせる。

### FR-E recurrence（繰り返し）（Must, U5 — 中核/最重要）

- **FR-E1** `repeat` の独自簡易記法をパースする。MVP サポート範囲（Q1=A,B,C,D,E）:
  - 基本間隔: `every N days|weeks|months|years`
  - 曜日指定: `every <weekday>`（例 `every monday`）／複数 `every mon,thu`
  - 月内日指定: `every month on <1-31>` ／ 月末 `every month on last`
  - キーワード: `daily` / `weekly` / `monthly` / `yearly`（対応する基本間隔の糖衣）
  - 終了条件: `... until <YYYY-MM-DD>` ／ `... x<N>`（回数上限）
- **FR-E2** 記法は README に明記する（DECIDED: 独自簡易記法, Dataview 可読）。不正記法は分かりやすい解析エラー。
- **FR-E3** 次回発生日は**予定ベース**（Q2=A）: 直前の `due` に間隔を加算して算出する。
- **FR-E4** `repeat` を持つタスクを `done` にすると、同一ファイルの `due` を次回発生日へ更新し `status` を `todo` に戻す（単一ファイル方式・新ファイルを作らない）。`last_done` に完了日を記録する（Q3=C）。
- **FR-E5** 終了条件（`until`/`xN`）に到達した場合は次回を生成せず、`status=done` で確定する。
- **FR-E6** 曜日/月内日指定では、直前 due の次に該当する日付を次回 due とする。

AC: Given `repeat: every 1 month`, due=2026-08-01 / When `done`（2026-08-05 実行） / Then due=2026-09-01, status=todo, last_done=2026-08-05（予定ベース）。Given `... x2` を2回消化 / When 2回目 done / Then status=done で確定し次回を作らない。

### FR-F 一覧・フィルタ・検索（Should, U6）

- **FR-F1** フィルタ対象: status / due / priority / tags / project（Q6=A,B,C,D,E）。
- **FR-F2** 本文テキスト検索 `search <query>`（Q6）。
- **FR-F3** 既定ソートは due 昇順（期限が近い順、due 未設定は末尾）（Q6=F）。
- **FR-F4** 既定の `list` は活動中タスクを対象とし、`.trash/`（削除）と archive 場所（退避）を除外する（FR-I）。

### FR-G サブタスク（親子, wikilink）（Should, U7）

- **FR-G1** サブタスクも1ファイルとし、`parent: "[[<親>]]"` で親を指す。
- **FR-G2** **完了ガード（Q4=B）**: すべての子が `done` になるまで親を `done` にできない。未完了の子があれば親 `done` を拒否し、未完了の子を提示する。
- **FR-G3** ガードのため親の子を列挙できる（`parent` の逆引き）。`list --parent <親>` で子を絞り込み表示する。
- **FR-G4** ガードは階層に再帰適用する（多階層許可, 仮定 A-nesting）。

AC: Given 未完了の子を持つ親 / When 親を `done` / Then 拒否され未完了の子一覧を提示。Given 全子 done / When 親を `done` / Then 成功。

### FR-H MCP サーバ（Should, U8）

- **FR-H1** stdio ローカル・非公開で起動する（SC 制約）。CLI とコアロジックを共有する（`project.md` Mandated: ALWAYS CLI と MCP はコア共有）。
- **FR-H2** 公開ツール（Q7=B+C, フル操作面＋delete＋recurrence 設定）: `create` / `list` / `get` / `update` / `complete` / `state` / `search` / `delete` / `archive` / `recurrence_set`（repeat 設定・解除）。
- **FR-H3** 各ツールは構造化した結果（file, status, 主要フィールド）を返す。
- **FR-H4** delete はソフト削除（FR-I1）で回復可能なため MCP からの呼び出しに追加の confirm は課さない（Q9）。

### FR-I 削除・退避（delete / archive を分離）（Must, 横断）

- **FR-I1** `delete` は**ソフト削除**: ファイルを `tasks/.trash/` へ移動する（復旧可能, 意図＝誤り/不要の除去）（Q9=B）。ハード削除は提供しない（git がセーフティネット）。
- **FR-I2** `archive` は**別 operation**: 完了/非アクティブなタスクを archive 場所へ退避する（意図＝保全・活動一覧から除外）。delete とは目的が異なる（ユーザー明示）。
- **FR-I3** 既定 `list`/`search` は `.trash/` と archive を除外する。退避分は明示オプション（例 `--archived`）で参照可能。
- **FR-I4** delete/archive は非破壊（ファイルを消さず移動する）。

AC: Given タスク / When `delete` / Then `.trash/` へ移動し既定 list から消える（ファイルは残存）。Given done タスク / When `archive` / Then archive 場所へ移動し delete とは別に記録される。

### FR-J Obsidian / Bases 連携（Could, U9）

- **FR-J1** タスク本文の `[[...]]` でナレッジノートと相互参照でき、Obsidian の backlink で往復できる（ファイル形式互換のみで成立）。
- **FR-J2** タスク群を Obsidian Bases で DB 的に一覧できる素の frontmatter を保つ（`type`/`status` 等でフィルタ）。作り込み（補助リンク機能等）は Could。

## Non-Functional Requirements（非機能要件）

- **NFR-1 データ安全性（原子的書込）**: すべての書き込みは temp ファイル→rename の原子的操作で行い、途中失敗でファイル破損を起こさない（Q8=A）。
- **NFR-2 既存資産の非破壊**: 手書き Markdown や frontmatter 非準拠ファイルを壊さない／既知フィールドのみ解釈し無視できる（Q8=C）。
- **NFR-3 規模・性能**: 数千件のタスクで `list`/`search` が実用的な応答速度で動作する（Q8=E）。目安: 数千ファイルの一覧が体感で待たされない範囲（具体数値は performance 検証がスコープ外のため目標値のみ、閾値は application-design で設定）。
- **NFR-4 プラットフォーム**: Linux 限定（PC-1）。文字コードは UTF-8。
- **NFR-5 テスト**: コア（ファイル I/O・状態遷移・recurrence パーサ・次回発生日算出）にユニットテストを厚く、CI で green を維持（`team-practices.md` Testing Posture）。数値カバレッジ床は設けない。
- **NFR-6 CLI/MCP コア共有**: CLI と MCP は単一コアの薄いアダプタとして実装する（`project.md` Mandated）。
- **NFR-7 コード品質**: フォーマッタ＋リンタを CI で実行し、失敗はマージをブロック（`project.md` Mandated）。

## Constraints（制約）

- ローカルのみ・クラウド同期なし（データは Markdown 群が SSoT、同期は git 等ユーザー運用）。
- 独自 GUI なし（CLI＋Obsidian で代替）。Obsidian プラグイン化は将来。
- recurrence は独自簡易記法（Obsidian Tasks プラグイン記法互換は MVP 対象外）。
- 想定スタック TypeScript / bun（最終確定は application-design）。

## Assumptions（前提・要確認）

- `last_done` を frontmatter に追加（rough-mockups 確定スキーマへの追記, recurrence タスクのみ・任意）。application-design でスキーマ最終化。
- サブタスクのネストは多階層を許可し、完了ガードは再帰適用する（明示上限は未指定）。
- archive の退避先ディレクトリ名（例 `archive/` か `tasks/archive/`）と config 表現は application-design で確定。
- 設定ファイルは XDG 準拠だが、vault 相対のプロジェクト設定を許すかは application-design で検討。

## Out of Scope（対象外）

- 独自 GUI、クラウド同期、Obsidian プラグイン化、クロスプラットフォーム、Obsidian Tasks 記法互換、Operation フェーズ（本番デプロイ/監視/インシデント対応）。
- ハード削除（完全消去）機能。
- 数値パフォーマンス SLA の厳密検証（performance-validation はスコープ外）。

## Open Questions（後段へ）

- **OQ-1（functional-design）**: 予定ベース加算後も次回 due が過去日になる（大幅遅延）場合、単純に +interval とするか、未来の最初の該当日までロールフォワードするか。
- **OQ-2（functional-design）**: 曜日/月内日指定の「次の該当日」算出の厳密規則（週跨ぎ・月末 clamp 等）。
- **OQ-3（application-design）**: `last_done`・archive 先・config スキーマの最終形。
- **OQ-4（functional-design）**: `waiting`/`cancelled` と recurrence・親子ガードの相互作用（例: cancelled の子は親ガードで無視するか）。

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-07-12T10:45:00Z
**Iteration:** 1

### Strengths

- **Comprehensive traceability**: Every requirement traces cleanly to user answers (Q1-Q9) or upstream artifacts (intent-statement, scope-document, team-practices). Citations are explicit and verifiable.
- **Testable acceptance criteria**: All FRs include Given/When/Then scenarios. NFRs are measurable (atomic operations, file preservation, scale targets, XDG paths).
- **Critical nuances captured faithfully**: The Q9 delete/archive distinction (soft-delete to .trash/ vs separate archive operation) is correctly captured in FR-I1/I2 — this was the most critical trap to avoid and the requirements pass.
- **Recurrence scope is complete**: FR-E1 through FR-E6 cover the full grammar (Q1=A,B,C,D,E), scheduled-base calculation (Q2=A), last_done persistence (Q3=C), and single-file behavior. The core concern from intent-statement is addressed head-on.
- **Parent-child guard is explicit**: FR-G2 states the Q4=B blocking behavior clearly with AC coverage.
- **MCP surface matches user choice**: FR-H2 lists full operations + delete + recurrence_set per Q7=B+C.
- **Appropriate depth for Standard mvp**: Does not demand enterprise exhaustiveness. Algorithm details (OQ-1: rollforward logic, OQ-2: weekday edge cases) are legitimately deferred to functional-design.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | FR-D or FR-A | Q5=C answer (task reference by stem exact-match OR partial-match with disambiguation) is not explicitly stated in requirements | Add to FR-D: "タスク参照は `<ref>` 引数でファイル名 stem の完全一致を優先し、該当なければ部分一致（複数該当時は候補提示）" or defer to functional-design as a CLI UX detail (acceptable for Standard depth) |
| 2 | Minor | FR-G4 / Assumptions | Multi-level nesting assumption ("ガードは階層に再帰適用する（多階層許可）") is stated but Q4 answer doesn't explicitly address nesting depth | Either clarify in Assumptions that multi-level is inferred from Q4=B guard semantics (reasonable extrapolation), or flag as OQ-5 for functional-design to confirm explicit depth policy |

### Summary

Requirements are **implementation-ready** for Standard-depth mvp. Every user answer from Q1-Q9 is faithfully reflected. The two findings are minor CLI/UX details that won't block development — developers can proceed with functional-design and return to clarify these points if needed. The critical Q9 soft-delete/archive distinction is correctly captured, avoiding a major trap. Traceability to upstream artifacts is complete. Acceptance criteria are testable. READY to advance.
