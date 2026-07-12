# Bolt Plan — MarkTask

> Inception / delivery-planning 成果物。DAG（`../units-generation/unit-of-work-dependency.md`）を経済的な Bolt 列に落とす。
> 上流参照: `../requirements-analysis/requirements.md`, `../user-stories/stories.md`, `../refined-mockups/mockups.md`, `../application-design/components.md`, `../units-generation/unit-of-work.md`, `../units-generation/unit-of-work-story-map.md`, `../practices-discovery/team-practices.md`。
> ヒューリスティック: **walking-skeleton-first ＋ risk-first ハイブリッド**（Q1=A）。粒度: capability 束ね（Q2=A）。実行: 逐次（Q3=A）。実行主体: 全 Bolt を aidlc-developer-agent（AI, team-formation SKIP）。

## Bolt 1 🚶 歩く骨格（Walking Skeleton・gated）

- **Units**: U-task-core(最小: Config＋Repository の add/list、Codec、TaskModel) ＋ U-state-management(最小: todo→done) ＋ U-cli(最小: add/list/done)
- **Definition of Done**: `marktask add "x"` → 1 Markdown ファイル生成（新スキーマ, status:todo）／`marktask list` で表示／`marktask done <ref>` で done。原子的書込。
- **確信仮説**: 「1タスク=1ファイル形式・保存先設定・CLI コア・状態更新」の縦切りが端から端まで動く＝アーキテクチャ（Core＋薄い CLI アダプタ）が成立する。
- **Demo**: 空 vault で add→list→done を実演。
- **Gate**: 単独・承認ゲート付き（team-practices Walking Skeleton）。承認後にラダープロンプトで残 Bolt の自律/都度ゲートを選択。

## Bolt 2 メタデータ ＋ 状態

- **Units**: U-task-core(完全) ＋ U-state-management(完全: 5状態) ＋ U-cli 拡充（update/start/state/show）
- **DoD**: due/priority/tags/project の設定・更新、5状態遷移、ref 解決（完全一致→部分一致→候補）。
- **確信仮説**: メタデータ運用と状態モデルが実用に足る。

## Bolt 3 ⚠️ recurrence（最リスクを早期に）

- **Units**: U-recurrence
- **DoD**: `repeat` 記法フル（間隔/曜日/月内日/キーワード/終了条件）パース、予定ベース次回 due、完了ロールフォワード（due 更新・todo 復帰・last_done・終了条件で done）。
- **確信仮説**: Markdown ベースの弱点だった recurrence が破綻なく（命名衝突・履歴分断なし）回る＝プロジェクトの中核価値が証明される。
- **備考**: DAG 上 U-recurrence は U-task-core・U-state-management に依存。両者は Bolt2 までに完成するため前倒しは DAG 適合。

## Bolt 4 検索 ＋ サブタスク

- **Units**: U-query-search ＋ U-subtasks
- **DoD**: filter/search/sort（既定 due 昇順）、親子完了ガード（再帰）、`list --parent`。
- **確信仮説**: 日常運用の絞り込みと親子管理が成立。

## Bolt 5 削除/退避 ＋ MCP

- **Units**: U-delete-archive ＋ U-mcp
- **DoD**: soft-delete（`.trash/`）・archive（別 operation）、MCP フル操作面（create/list/get/update/complete/state/search/delete/archive/recurrence_set）が CLI と同一挙動。
- **確信仮説**: 生成AI が MCP 経由で安全に（回復可能な delete で）タスクを操作できる＝成功指標「AI 操作可能」を満たす。

## Bolt 6 Obsidian〔Could〕

- **Units**: U-obsidian-interop
- **DoD**: Bases/Dataview/wikilink 互換の検証・サンプル（`.base` 等）・README。
- **確信仮説**: タスク⇔ナレッジの相互参照が Obsidian で成立。予算次第で後回し/スタブ可。

## トレーサビリティ

- 各 Bolt の Units は `unit-of-work.md`、各 Unit の stories は `unit-of-work-story-map.md` に対応。全 story は Bolt1〜6 のいずれかで実装される。
