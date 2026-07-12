# RAID Log — MarkTask

> Ideation / feasibility ステージ成果物。Risks / Assumptions / Issues / Dependencies を記録し、後段で追跡する。
> 上流参照: `../intent-capture/intent-statement.md`, `./feasibility-assessment.md`, `./constraint-register.md`

## Risks（リスク）

| ID | リスク | 可能性 | 影響 | 対応方針 |
|---|---|---|---|---|
| R-1 | recurrence 独自記法の表現力不足（複雑な繰り返しに対応できない） | 中 | 中 | MVP は毎日/毎週/毎月/間隔指定など基本パターンに絞り、記法を README で明示。将来 RRULE 互換を検討（緩和） |
| R-2 | 「次回発生日」算出や完了履歴の表現が単一ファイル方式で複雑化 | 中 | 中 | functional-design で状態遷移・履歴表現を明確化。設計で単純化 |
| R-3 | 既存 Obsidian vault の規約が未取得で、後段で追従コストが判明 | 中 | 低〜中 | 保存先・フィールドを設定可能にして吸収（IC-2/IC-3） |
| R-4 | MVP の機能幅（CRUD＋一覧/検索＋状態＋メタ＋recurrence＋MCP）が個人開発には広め | 中 | 中 | 核（CLI＋ファイル形式＋CRUD/状態/メタ/recurrence＋MCP）を優先し段階化（intent-statement 優先度シグナル） |
| R-5 | 将来 MCP をネットワーク公開した場合の認証欠如 | 低（MVPでは非該当） | 高 | MVP は stdio ローカルのみ（SC-1）。公開時は認証必須（SC-2） |

## Assumptions（前提）

| ID | 前提 | 検証時期 |
|---|---|---|
| A-1 | ユーザーは Obsidian を利用しており、vault は標準 Markdown＋YAML frontmatter＋wikilink を用いる | requirements-analysis |
| A-2 | recurrence フィールドは独自記法だが Dataview で読める frontmatter フィールドとして表現できる | requirements / functional-design |
| A-3 | bun ＋必要依存が対象 Linux 環境で利用可能で、`git clone`＋手順で再現セットアップできる | application/infrastructure-design |
| A-4 | 個人利用のため同時編集・マルチユーザー競合は考慮不要 | requirements-analysis |

## Issues（現時点の課題）

| ID | 課題 | 状態 |
|---|---|---|
| I-1 | 既存 vault のディレクトリ構成・Dataview フィールド規約の具体が未確定 | Open（requirements で取得） |
| I-2 | recurrence 記法の正式仕様（構文・対応パターン・完了履歴表現）が未確定 | Open（requirements/functional-design で確定） |
| I-3 | MCP で公開する操作範囲（tools/resources）が未確定 | Open（scope-definition/application-design で確定） |

## Dependencies（依存）

| ID | 依存対象 | 種別 | 備考 |
|---|---|---|---|
| D-1 | Obsidian の Markdown/frontmatter/wikilink 仕様 | 外部仕様 | 合わせる側。仕様変更リスクは低いが追跡 |
| D-2 | Dataview プラグインの frontmatter クエリ規約 | 外部仕様 | フィールド命名を合わせる |
| D-3 | MCP 仕様・公式 SDK（TypeScript） | 外部ライブラリ | インタフェース準拠 |
| D-4 | bun ランタイム＋Node エコシステム（Markdown/YAML パーサ、CLI ライブラリ） | 外部ライブラリ | ライセンス確認は将来公開時 |
