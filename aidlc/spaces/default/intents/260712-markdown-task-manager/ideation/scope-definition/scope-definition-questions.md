# Scope Definition — Clarifying Questions

Project: **MarkTask** — MVP範囲（in/out）と優先度を確定する。
> 記号（A〜E, X）で回答。複数選択可の設問は `A, C`。X は自由記述を添えてください。既定案でよければその旨だけで結構です。

---

## Q1. ビルド順（シーケンス）の志向は？

- A. Walking-skeleton-first（最小のE2E：1タスク作成→ファイル生成→一覧、を薄く通してから肉付け）
- B. Value-first（日常運用で一番効く機能から）
- C. Risk-first（recurrence 等、不確実性の高い所から）
- D. Dependency-first（依存の土台から）
- E. おまかせ（推奨: A）
- X. その他（自由記述）

[Answer]:A.

---

## Q2. MVP の優先度（MoSCoW）。以下の既定案でよいですか？

既定案:
- **Must**: タスクCRUD（1ファイル1タスク） / 状態管理 / frontmatterメタデータ（期限・優先度・タグ） / recurrence / CLI
- **Should**: 一覧・フィルタ・検索 / MCPサーバ（主要操作）
- **Could**: Obsidian wikilink 連携の作り込み（タスク⇔ナレッジの補助リンク）
- **Won't（今回スコープ外）**: 独自GUI / クラウド同期 / Obsidianプラグイン / クロスプラットフォーム / Obsidian Tasksプラグイン記法互換

- A. この既定案でOK
- B. 修正したい（下の X で具体的に）
- X. その他（具体的な入れ替えを指定）

[Answer]:A.

---

## Q3. MCP で公開する操作範囲（MVP）は？

- A. 最小（作成・一覧・完了）
- B. 標準（作成・一覧・取得・更新・完了・状態変更）
- C. フル（標準 ＋ recurrence設定・削除・検索）
- D. おまかせ（推奨: B）
- X. その他（自由記述）

[Answer]:C.

---

## Q4. 「1タスク=1ファイル」のタスク境界。サブタスク/チェックリストはどう扱う？

- A. タスク本文内の Markdown チェックリスト（`- [ ]`）で表現（別ファイルにしない）
- B. サブタスクも1ファイルにし、wikilink で親子を繋ぐ
- C. MVP ではサブタスク概念を持たない（本文自由記述のみ）
- D. おまかせ（推奨: A）
- X. その他（自由記述）

[Answer]:B.

---

## Q5. 状態管理のモデル（MVP）は？

- A. シンプル3状態（TODO / 進行中 / 完了）
- B. TODO / 進行中 / 完了 ＋ 保留(waiting) / 中止(cancelled)
- C. 完了フラグのみ（未完 / 完了）
- D. おまかせ（推奨: A）
- X. その他（自由記述）

[Answer]:B.

---

## Q6. タスクファイルの保存先の既定は？（vault 連携の前提）

- A. 設定で vault 内の任意ディレクトリを指定（既定: `tasks/`）
- B. カレントディレクトリ配下の固定フォルダ
- C. おまかせ（推奨: A）
- X. その他（自由記述）

[Answer]:A.

