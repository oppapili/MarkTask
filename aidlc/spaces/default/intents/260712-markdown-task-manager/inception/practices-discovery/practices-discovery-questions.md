# Practices Discovery — Clarifying Questions

Project: **MarkTask**（Greenfield / 個人利用 / mvp）。チームの「働き方」を5領域で確認します。回答はここに反映され、承認後 `aidlc-team.md` / `aidlc-project.md` に昇格します。
> 記号（A〜E, X）で回答。既定案（org 既定）でよければその旨だけでOK。個人開発なので「チーム」＝あなた1人として読み替えて構いません。
> 補足: Operation フェーズ（本番デプロイ/監視）は mvp スコープ外です。ただし CI Pipeline (3.7) は在スコープです。

---

## Q1. Way of Working（ブランチ戦略・マージ）

- A. org 既定: trunk-based（`main` 中心、必要時のみ短命 feature ブランチ）＋ AI-DLC の Bolt は squash-merge で 1コミットに集約
- B. `main` 直コミット中心（個人開発なので基本 PR なし、必要な時だけブランチを切る）
- C. feature ブランチ＋セルフ PR レビュー（履歴・CI を重視）
- D. おまかせ（推奨: A）
- X. その他（自由記述）

[Answer]:A.

---

## Q2. Walking Skeleton（最初の縦切りを gated で通すか）

scope-document では walking-skeleton-first を採用済み（Bolt 1 = `add`/`list`/`done` の薄い E2E）。

- A. 実施する（Bolt 1 を最初に単独・承認ゲート付きで通し、アーキテクチャの土台を証明）— org/scope 既定
- B. 実施しない（いきなり機能単位で作る）
- C. おまかせ（推奨: A）
- X. その他（自由記述）

[Answer]:A.

---

## Q3. Testing Posture（テスト方針）

Test Strategy は Standard。個人 mvp としてどの程度のテストを課すか。

- A. org 既定: コードと同時にテスト作成、行カバレッジ 80% 目安、CI で実行しマージ前に green
- B. コア重点: コアロジック（ファイル I/O・状態遷移・recurrence 記法パーサ・次回発生日算出）にユニットテストを厚く、周辺は薄く。数値カバレッジ目標は設けない
- C. TDD（テスト先行で実装）
- D. おまかせ（推奨: B — 個人 mvp で費用対効果重視、壊れやすい所を厚く）
- X. その他（自由記述）

[Answer]:B.

---

## Q4. Deployment（配布・実行方法）

Operation フェーズはスコープ外。実運用は「自分のマシンでローカル実行」が前提。

- A. ローカル実行のみ（`git clone` → `bun install` → CLI 実行 / MCP サーバは stdio ローカル起動）。CD・本番デプロイなし
- B. ローカル ＋ 簡易配布（bun でビルドした単一実行ファイル、または `bun link` / グローバルインストール手順を README 化）
- C. おまかせ（推奨: A、必要になれば B を後日）
- X. その他（自由記述）

[Answer]:A.

---

## Q5. Code Style（コードスタイル・規約）

技術スタックは application-design で確定（feasibility では bun/TypeScript を想定）。当面の規約方針を確認。

- A. org 既定: 言語標準に従い、フォーマッタ＋リンタを CI で実行（TypeScript なら Prettier + ESLint 等、失敗で CI ブロック）
- B. Biome に一本化（フォーマッタ＋リンタ統合、bun と相性が良く設定が軽い）
- C. フォーマッタのみ厳格・リンタは警告どまり（個人開発で摩擦を減らす）
- D. おまかせ（推奨: スタック確定後に application-design で最終化。当面は B=Biome を仮採用）
- X. その他（自由記述）

[Answer]:A.

---

## Q6. Mandated / Forbidden（明示したい「必ず/禁止」ルールはあるか）

discovered-rules.md（`## Mandated` = ALWAYS… / `## Forbidden` = NEVER…）に落とすハード制約があれば。

- A. 特になし（org/phase 既定の範囲でよい）
- B. ある（下の X に ALWAYS / NEVER 形式で記述）
- X. その他（自由記述。例: `NEVER タスクファイルに実装専用の非互換フィールドを足す（Obsidian 素の YAML 維持）` / `ALWAYS CLI と MCP はコアロジックを共有する`）

[Answer]:X.
ALWAYS CLIとMCPはコアロジックを共有する。

