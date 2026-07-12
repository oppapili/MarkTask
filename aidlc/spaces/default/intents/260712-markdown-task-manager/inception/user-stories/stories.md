# User Stories — MarkTask

> Inception / user-stories 成果物。上流: `../requirements-analysis/requirements.md`（FR/NFR をトレース）, `../practices-discovery/team-practices.md`（テスト姿勢・CLI/MCP コア共有）, `./personas.md`。
> 分割: **ワークフロー縦切り**。粒度: **Must 中心**（Should/Could は列挙＋薄めの AC）。優先度は MoSCoW（最終 MVP 境界は delivery-planning で確定）。
> フォーマット: 「As a [persona], I want …, so that …」＋受入基準(Given/When/Then)＋INVEST メモ。

---

## WF-1｜タスク作成 → 消化（コア happy path）  [Must]

### US-1.1 タスク作成（As P1）  [Must] — traces FR-A1..A4, FR-B1
As **P1**, I want to create a task with one command, so that 思いついた作業を即座に 1 Markdown ファイルとして残せる。
- **AC1** Given 保存先が設定済み / When `marktask add "買い物へ行く"` / Then `tasks/<YYYYMMDD>-買い物へ行く.md` が生成され frontmatter `status: todo`, `type: task`, `created`/`updated` が入る。
- **AC2** Given 同日・同 slug の既存ファイル / When `add` / Then 一意化サフィックス（例 `-2`）を付けて衝突を回避する。
- **AC3** Given `--due/--priority/--tags/--project` 指定 / When `add` / Then 対応 frontmatter に反映される。
- INVEST: 独立・テスト可能（ファイル生成を検証）。

### US-1.2 状態を進める（As P1）  [Must] — traces FR-B2, FR-D5
As **P1**, I want to change a task's status, so that 進捗を反映できる。
- **AC1** Given todo のタスク / When `marktask start <ref>` / Then `status: in-progress` かつ `updated` 更新。
- **AC2** Given in-progress のタスク / When `marktask done <ref>`（非 recurrence） / Then `status: done`。
- **AC3** Given 曖昧な `<ref>`（複数該当） / When コマンド実行 / Then エラーにせず候補一覧を提示（完全一致優先→部分一致）。
- INVEST: 小さく独立。

### US-1.3 一覧で未完を確認（As P1）  [Must] — traces FR-F3, FR-F4
As **P1**, I want to list my active tasks, so that 次にやることを把握できる。
- **AC1** Given 複数タスク / When `marktask list` / Then 既定テーブルで due 昇順（未設定は末尾）に表示。
- **AC2** Given `.trash/`・archive のファイル / When `list` / Then それらは除外される。

---

## WF-2｜メタデータ運用  [Must]

### US-2.1 メタデータ更新（As P1）  [Must] — traces FR-C1, FR-C2
As **P1**, I want to update due/priority/tags/project, so that タスクの属性を最新に保てる。
- **AC1** Given タスク / When `marktask update <ref> --due 2026-08-07 --priority high` / Then frontmatter が更新され Dataview/Bases から読める素の YAML を維持。
- **AC2** Given 手書き Markdown（frontmatter 無し） / When コアが触れる / Then 壊さず既知フィールドのみ解釈（NFR-2）。

---

## WF-3｜recurrence 消化（中核）  [Must]

### US-3.1 繰り返しタスクの設定（As P1）  [Must] — traces FR-E1, FR-E2
As **P1**, I want to mark a task as recurring with a simple syntax, so that 定期作業を1ファイルで管理できる。
- **AC1** Given `--repeat "every 1 month"` / When `add` / Then `type: recurrence`, `repeat: every 1 month` が入る。
- **AC2** Given サポート記法（`every N days/weeks/months/years`・`every <weekday>`・`every month on <n|last>`・`daily/weekly/monthly/yearly`・`until <date>`・`xN`） / When 解釈 / Then 正しくパースされる。
- **AC3** Given 不正記法 / When 解釈 / Then 分かりやすい解析エラー（README の記法を案内）。

### US-3.2 繰り返しの完了と次回発生（As P1）  [Must] — traces FR-E3, FR-E4, FR-E5, FR-E6
As **P1**, I want completing a recurring task to roll it forward, so that 同一ファイルで次回を管理でき履歴が分断しない。
- **AC1** Given `repeat: every 1 month`, due=2026-08-01 / When 2026-08-05 に `done` / Then due=2026-09-01（予定ベース）, `status: todo` に戻り, `last_done: 2026-08-05`（単一ファイル・新ファイル無し）。
- **AC2** Given 終了条件 `xN`/`until` に到達 / When `done` / Then 次回を作らず `status: done` で確定。
- **AC3** Given 曜日/月内日指定 / When `done` / Then 直前 due の次に該当する日付を次回 due とする。
- INVEST: テスト可能（日付計算は純粋関数として厚くテスト＝team-practices）。

---

## WF-4｜サブタスク親子ガード  [Should]

### US-4.1 サブタスク作成と親子リンク（As P1）  [Should] — traces FR-G1
As **P1**, I want to link a subtask to its parent, so that Obsidian で親子を辿れる。
- **AC** Given 親タスク / When `marktask add "添付書類" --parent "[[<親>]]"` / Then 子の frontmatter `parent` に wikilink が入る。

### US-4.2 親完了ガード（As P1）  [Should] — traces FR-G2, FR-G3, FR-G4
As **P1**, I want the parent blocked from done until children are done, so that 取りこぼしを防げる。
- **AC1** Given 未完了の子を持つ親 / When 親を `done` / Then 拒否し未完了の子一覧を提示。
- **AC2** Given 全子 done / When 親を `done` / Then 成功。ガードは階層に再帰適用。
- **AC3** Given 親 / When `list --parent <親>` / Then 子だけ絞り込み表示。

---

## WF-5｜一覧・フィルタ・検索  [Should]

### US-5.1 フィルタ/検索（As P1）  [Should] — traces FR-F1, FR-F2
As **P1**, I want to filter and search tasks, so that 必要なタスクに素早く辿り着ける。
- **AC1** Given タスク群 / When `list --status todo --priority high --tag work --project X` / Then 条件 AND で絞り込み。
- **AC2** Given 本文/タイトル / When `search "レビュー"` / Then 一致タスクを提示。
- **AC3** Given `--format compact` / When `list` / Then 1行形式で出力。

---

## WF-6｜生成AI（MCP）からの操作  [Should]

### US-6.1 MCP ツールでのタスク操作（As P2）  [Should] — traces FR-H1, FR-H2, FR-H3, NFR-6
As **P2 (生成AI)**, I want to operate tasks via MCP tools, so that AI エージェントとして MarkTask を確実に扱える。
- **AC1** Given stdio MCP サーバ稼働 / When `create/list/get/update/complete/state/search/delete/archive/recurrence_set` を呼ぶ / Then CLI と同一コアで処理し構造化結果（file, status, 主要フィールド）を返す。
- **AC2** Given 曖昧参照 / When ツール呼び出し / Then エラー結果に候補を含めて返す（決定的挙動）。

### US-6.2 MCP からの安全な削除（As P2）  [Should] — traces FR-H4, FR-I1
As **P2**, I want delete via MCP to be recoverable, so that 誤操作でもデータを失わない。
- **AC** Given タスク / When MCP `delete` / Then `.trash/` へ移動（ソフト削除, 回復可能）。追加 confirm は不要。

---

## WF-7｜delete / archive（分離）  [Must: delete / Should: archive]

### US-7.1 ソフト削除（As P1/P2）  [Must] — traces FR-I1, FR-I3, FR-I4
As **P1**, I want delete to move tasks to trash, so that 誤り/不要タスクを復旧可能に除去できる。
- **AC1** Given タスク / When `marktask delete <ref>` / Then `tasks/.trash/` へ移動（ファイルは消えない）。
- **AC2** Given 削除済み / When 既定 `list` / Then 除外される（`.trash/` は活動一覧に出ない）。

### US-7.2 退避 archive（As P1）  [Should] — traces FR-I2, FR-I3
As **P1**, I want archive as a separate operation, so that 完了/非アクティブなタスクを保全しつつ活動一覧から外せる。
- **AC1** Given done/非アクティブなタスク / When `marktask archive <ref>` / Then archive 場所へ移動（delete とは別・意図が異なる）。
- **AC2** Given archive 済み / When `list --archived` / Then 退避分を参照できる。

---

## WF-8｜Obsidian 連携  [Could]

### US-8.1 ナレッジ相互参照（As P1）  [Could] — traces FR-J1, FR-J2
As **P1**, I want task bodies to wikilink knowledge notes, so that タスクとナレッジを相互に辿れる。
- **AC** Given 本文に `[[ノート]]` / When Obsidian で開く / Then backlink で往復でき、Bases で `type/status` フィルタ一覧できる。

---

## 横断（技術）ストーリー — ワークフローに属さない NFR/設定  [Must]

### US-T.1 データ安全性（As P1）  [Must] — traces NFR-1, NFR-2
As **P1**, I want writes to be atomic and non-destructive, so that ファイル破損や既存資産の損失が起きない。
- **AC1** Given 書き込み / When 保存 / Then temp→rename の原子的操作で行い、途中失敗でも破損しない。
- **AC2** Given frontmatter 非準拠の既存 md / When 走査 / Then 壊さず無視/既知フィールドのみ解釈。

### US-T.2 設定（As P1）  [Must] — traces FR-A3, NFR-4
As **P1**, I want to configure the vault/tasks path, so that 自分の vault 構成に合わせられる。
- **AC** Given 初回 / When `marktask config` で保存先を設定 / Then XDG 準拠 `~/.config/marktask/config.toml` に保持し以降のコマンドが参照。

### US-T.3 別マシン再現（As P1）  [Should] — traces scope-document PC-2
As **P1**, I want to run on another machine via clone+install, so that 環境を再現できる。
- **AC** Given リポジトリ / When `git clone` → `bun install` → CLI / Then README 手順どおり動作（Linux）。

---

## Story Map サマリ

| Workflow | Stories | 主 MoSCoW | ペルソナ |
|---|---|---|---|
| WF-1 作成→消化 | US-1.1〜1.3 | Must | P1 |
| WF-2 メタデータ | US-2.1 | Must | P1 |
| WF-3 recurrence | US-3.1〜3.2 | Must | P1 |
| WF-4 サブタスク | US-4.1〜4.2 | Should | P1 |
| WF-5 一覧・検索 | US-5.1 | Should | P1 |
| WF-6 MCP | US-6.1〜6.2 | Should | P2 |
| WF-7 delete/archive | US-7.1(Must)/7.2(Should) | Must/Should | P1/P2 |
| WF-8 Obsidian | US-8.1 | Could | P1 |
| 横断（技術） | US-T.1〜T.3 | Must/Should | P1 |

Walking Skeleton（delivery-planning 候補）: US-1.1 + US-1.2(done) + US-1.3 の薄い縦切り。recurrence(WF-3) は最重要・最リスクとして早期に。

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-07-12T10:58:07Z
**Iteration:** 1

### Strengths

- **Clean workflow organization**: Stories organized by vertical workflow slices (WF-1 create→consume through WF-8 Obsidian) with separate technical stories (US-T.x) for cross-cutting concerns. Each workflow delivers end-user value, not horizontal tech layers.
- **Format consistency**: All stories follow "As a [persona], I want ..., so that ..." with testable Given/When/Then acceptance criteria. Format is professional and implementation-ready.
- **Two-persona model is correct**: P1 (human CLI/Obsidian user) + P2 (AI/MCP agent) correctly captures the dual-actor reality. MCP stories (US-6.x) appropriately emphasize structured results and recoverability for non-interactive context.
- **Traceability is explicit and complete**: Every story cites upstream FR/NFR IDs. Critical user choices are faithfully reflected — Q2=A schedule-based recurrence (US-3.2 AC1 予定ベース), Q9 delete/archive separation (US-7.1/US-7.2), parent-done guard (US-4.2), MCP surface including delete+recurrence_set (US-6.1).
- **Critical complexity has detailed AC**: Recurrence (US-3.1/US-3.2) and parent-child guard (US-4.2) have thorough acceptance criteria covering edge cases (終了条件到達, 曖昧参照, 再帰適用). This is the right place to fix behavior, not defer it.
- **Appropriate depth for Standard mvp**: Must stories (WF-1/WF-2/WF-3) have full AC. Should/Could stories (WF-4/WF-5/WF-8) are listed with lighter treatment. Walking skeleton candidate (US-1.1/1.2/1.3 薄い縦切り) is sensible. Deferring exact algorithms (weekday rollforward logic) to functional-design is legitimate.

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Minor | US-3.2 AC3 | Weekday/month-day recurrence calculation ("直前 due の次に該当する日付") is stated but algorithm not detailed (week boundary handling, month-end clamping) | Defer to functional-design to specify exact rollforward rules — this is a legitimate detail for algorithm stage. Story captures the what (next applicable date), not the how. Acceptable for Standard depth. |
| 2 | Minor | US-1.2 AC3 | Task reference resolution (Q5=C exact-match → partial-match with disambiguation) is partly captured here but could be more explicit as a cross-cutting rule | Either add to US-1.x as a dedicated story ("US-1.0 Task reference resolution") or accept this as CLI UX detail to be fully specified in functional-design. Current AC3 wording is sufficient for implementation to proceed. |

### Summary

Stories are **implementation-ready**. Every planning choice from Q&A is honored (Q1=B two personas, Q2=B workflow slices, Q3=A Must-centered). Format is consistent, traceability is explicit, and critical complexity (recurrence, parent-child) has detailed AC. The two findings are minor algorithm/UX details that won't block functional-design or code-generation — developers can proceed and clarify those points in the next stage. No contradictions, no missing workflows, no scope creep. Walking skeleton candidate is clear. READY to advance to delivery-planning.
