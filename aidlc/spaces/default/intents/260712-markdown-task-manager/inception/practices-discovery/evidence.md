# Evidence — Practices Discovery (MarkTask)

> 再実行時の freshness トレイル。何をスキャン/推論/質問したかを記録する。

## Method

- **Project type**: Greenfield（`aidlc-state.md` → Project Type: Greenfield）。**個人開発 / mvp / ローカル運用**。
- **Step 2（ブラウンフィールド証拠スキャン, マルチエージェント）**: **スキップ**。既存コード無し・reverse-engineering はスコープ外（skip）。git 履歴/CI 設定/テスト構成のスキャン対象なし。
- **Step 3（インタビュー）**: 全5実践領域＋Mandated/Forbidden を質問。org.md 既定を推奨案として提示。回答は自分編集モード（self-guided）で収集。

## Per-Area Findings（asked / answered）

| 領域 | 情報源 | 回答 | 備考 |
|------|--------|------|------|
| Way of Working | 質問 Q1（org既定を提示） | A: trunk-based ＋ Bolt squash-merge | org 既定に一致 |
| Walking Skeleton | 質問 Q2（scope-document で採用済み） | A: walking-skeleton-first, gated | scope-document / org 既定に一致 |
| Testing Posture | 質問 Q3 | B: コア重点、数値カバレッジ目標なし | **org 既定(80%)からの意図的な緩和**（project 上書き） |
| Deployment | 質問 Q4（Operation スコープ外） | A: ローカル実行のみ、CD なし | mvp スコープに一致 |
| Code Style | 質問 Q5 | A: 言語標準のフォーマッタ＋リンタを CI 実行、失敗でブロック | 具体ツールは application-design で確定 |
| Mandated/Forbidden | 質問 Q6 | X: ALWAYS CLI と MCP はコアロジック共有 | 明示ハードルールは1件のみ |

## Notes

- Code Style の具体ツール（Prettier+ESLint / Biome 等）は技術スタック（TypeScript/bun 想定）確定後、application-design で最終化。
- Testing Posture B は org 既定より軽量。CI ではテスト green ＋ lint/format ブロックを課すが、数値カバレッジゲートは設けない。
