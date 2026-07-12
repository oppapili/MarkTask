# User Stories — Assessment

> Inception / user-stories Step 2。ストーリー作成の要否判断。上流: `../requirements-analysis/requirements.md`, `../practices-discovery/team-practices.md`。

## Decision: Execute

## Rationale

- **ユーザー向け機能がある**: CLI（第一級インタフェース）でのタスク作成・状態変更・一覧/検索・recurrence 操作は、明確な利用者ワークフローを持つ。
- **複雑な業務ロジック**: recurrence（独自記法・次回発生日算出）、サブタスク完了ガード、delete/archive の分離など、受入基準で挙動を固定すべき箇所が多い。
- **複数アクター**: 人間（CLI/Obsidian 利用者）と、生成AI エージェント（MCP クライアント）という非人間アクターの2系統がある。MCP 経由の操作もストーリー化して受入基準を与える価値がある。

## Factors Considered

- Project type: Greenfield / 個人利用 / mvp。
- User-facing scope: CLI ＋ Obsidian 閲覧 ＋ MCP。独自 GUI は無し（Won't）。
- Complexity signals: recurrence 記法フル採用、親子ガード、ソフト削除/退避の分離。

## Where Stories Add the Most Value

- コアワークフロー（作成→消化）の受入基準。
- recurrence 消化（完了→次回 due 更新・終了条件）の挙動固定。
- サブタスク完了ガードの振る舞い。
- 生成AI（MCP）からの操作フロー。

## Depth Note

個人 mvp のため Must 中心に縦切りワークフローでまとめ、Should/Could は薄く。MVP 境界の最終決定は delivery-planning。
