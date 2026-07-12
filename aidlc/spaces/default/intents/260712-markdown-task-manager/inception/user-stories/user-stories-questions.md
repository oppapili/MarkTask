# User Stories — Plan & Questions

Project: **MarkTask**（mvp）。requirements.md は詳細なので、ストーリーは軽量・受入基準(Given/When/Then)の枠付けが主目的。以下3点だけ確認します（既定でよければ「おまかせ」でOK）。
> 記号（A〜E, X）で回答。

## Plan（想定）

- **フォーマット**: 「As a [ペルソナ], I want [目的], so that [便益]」＋ 各ストーリーに受入基準（Given/When/Then）＋ MoSCoW 優先度＋ INVEST 準拠メモ。
- **想定ペルソナ**: P1 = 自分（CLI/Obsidian 利用者, Git/Markdown 中心）／P2 = 生成AI エージェント（MCP クライアント, 非人間アクター）。
- **想定分割**: ワークフロー縦切り（作成→消化 / メタデータ / recurrence / サブタスク / 一覧・検索 / MCP / delete・archive / Obsidian 連携）。

---

## Q1. ペルソナの範囲は？

- A. 自分（人間）のみ
- B. 自分 ＋ 生成AI エージェント（MCP アクター）
- C. おまかせ（推奨: B）
- X. その他（自由記述）

[Answer]:B（自分 ＋ 生成AI エージェント/MCP アクター）

---

## Q2. ストーリーの分割軸は？

- A. 機能領域（FR 群 / proto-Unit）ごと
- B. ワークフロー（作成→消化、recurrence、サブタスク…）ごと
- C. ペルソナごと
- D. おまかせ（推奨: B＝ワークフロー縦切り、価値が見えやすい）
- X. その他（自由記述）

[Answer]:B（ワークフロー縦切り。横断事項=NFR/設定は別立ての技術ストーリーで拾う）

---

## Q3. 粒度 / MVP 境界の強調は？

- A. Must 中心に絞る（Should/Could は薄く）
- B. Must / Should / Could を網羅
- C. おまかせ（推奨: A、個人 mvp）
- X. その他（自由記述）

[Answer]:A（Must 中心。Should/Could は一覧化するが AC は薄め）
