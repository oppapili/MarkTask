# Team Practices — MarkTask

> Inception / practices-discovery 成果物（記述的・チームの声）。承認ゲートで `aidlc-team.md` の各セクションに昇格する。
> 個人開発プロジェクトのため「チーム」＝開発者本人。Greenfield・mvp・ローカル運用が前提。
> 由来: practices-discovery-questions.md（Q1〜Q6）／org 既定を出発点に確定。

## Way of Working

trunk-based development を採用し、`main` を中心に開発する。個人開発のため通常作業は `main` へ直接コミットし、必要なときだけ短命の feature ブランチを切る。AI-DLC の Bolt は squash-merge で `main` に 1 Bolt = 1 コミットとして集約し、delivery-planning の Bolt 列に 1:1 対応する線形履歴を保つ。

## Walking Skeleton

walking-skeleton-first を採用する。最初の Bolt は最小の縦切り（`marktask add` / `list` / `done` の薄い E2E）で、「1タスク=1ファイルの形式」「保存先設定」「CLI コア」「状態更新」の土台を通しで証明する。この Bolt は単独・承認ゲート付きで実行し、明示承認の後に残りの Bolt を進める。

## Testing Posture

コア重点のテスト方針。壊れやすい中核ロジック — ファイル I/O、状態遷移、recurrence の独自簡易記法パーサ、次回発生日の算出 — にユニットテストを厚く書き、周辺は薄くする。数値カバレッジ目標は設けない（個人 mvp のため org 既定の 80% を意図的に緩和）。テストは CI で実行し green を維持する。

## Deployment

ローカル実行のみ。Operation フェーズ（本番デプロイ・監視）は mvp スコープ外。`git clone` → `bun install` → CLI 実行で運用し、MCP サーバは stdio でローカル起動する。CD や本番デプロイは行わない。

## Code Style

言語標準の規約に従い、フォーマッタ＋リンタを CI で実行する（失敗はマージをブロック）。具体的なツール選定（例: Prettier + ESLint か Biome か）は技術スタック確定後に application-design で最終化する。現時点の想定スタックは TypeScript / bun。
