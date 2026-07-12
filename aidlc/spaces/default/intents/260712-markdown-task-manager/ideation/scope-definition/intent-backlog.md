# Intent Backlog — MarkTask (proto-Units)

> Ideation / scope-definition ステージ成果物。MVP を実装可能な proto-Units（後の Units Generation で正式な Unit へ精緻化）に分解し、優先度・依存・想定ビルド順を示す。
> 上流参照: `./scope-document.md`, `../intent-capture/intent-statement.md`, `../feasibility/constraint-register.md`

## Proto-Units（優先度付き）

| ID | proto-Unit | 説明 | MoSCoW | 依存 |
|---|---|---|---|---|
| U1 | タスクコア＆ストレージ | 1タスク=1Markdownファイル。frontmatter スキーマ、ファイル読み書き、ID/命名、保存先設定（既定 `tasks/`） | Must | — |
| U2 | 状態管理 | 5状態（todo/in-progress/done/waiting/cancelled）と遷移 | Must | U1 |
| U3 | メタデータ | frontmatter の due/priority/tags。Dataview 可読な規約 | Must | U1 |
| U4 | CLI | add/list/show/update/done/state 変更などのコマンド群 | Must | U1, U2, U3 |
| U5 | recurrence | 独自簡易記法（frontmatter）、次回発生日算出、単一ファイル方式、README 記法明記 | Must | U1, U2, U3 |
| U6 | 一覧・フィルタ・検索 | 状態/期限/優先度/タグ/テキストでの絞り込み・並び替え | Should | U1, U2, U3 |
| U7 | サブタスク（wikilink 親子） | サブタスクも1ファイル、`[[...]]` で親子接続。親子の状態・表示 | Should | U1, U2, U4 |
| U8 | MCP サーバ | フル操作面（create/list/get/update/complete/state/recurrence-config/delete/search）。stdio ローカル・非公開 | Should | U1–U6（コア操作を再利用） |
| U9 | Obsidian 連携の作り込み | タスク⇔ナレッジノートの wikilink 相互参照・逆リンク活用の利便機能 | Could | U1, U3 |

補足: U8（MCP）は MoSCoW=Should だが、実装時は**フル操作面**を提供する（Q3=C）。共通コアロジック（U1–U6）を CLI と MCP で共有する方針（詳細は application-design）。

## Suggested Bolt Sequence（想定ビルド順・walking-skeleton-first）

1. **Bolt 1（Walking Skeleton, gated）**: U1 の最小 ＋ U4 の最小 ＋ U2 の最小 — `add`/`list`/`done` の薄いE2E（ファイル形式・保存先・CLI・状態更新を通す）
2. **Bolt 2**: U2 完全（5状態）＋ U3（メタデータ）＋ U4 拡充
3. **Bolt 3**: U5（recurrence） — 不確実性の高い領域を早めに固める
4. **Bolt 4**: U6（一覧・フィルタ・検索）＋ U7（サブタスク wikilink 親子）
5. **Bolt 5**: U8（MCP フル操作面）
6. **Bolt 6（任意）**: U9（Obsidian 連携の作り込み, Could）

> ビルド順は経済的判断であり、Units Generation / Delivery Planning で依存 DAG と併せて最終確定する。walking-skeleton-first と「recurrence を早期に消化」の2点を優先方針として引き継ぐ。

## Notes（引き継ぎメモ）

- サブタスク親子モデル（U7）の具体表現（frontmatter リンクフィールド vs 本文 wikilink）と、状態/recurrence との相互作用は requirements-analysis / functional-design で確定（Open）。
- 既存 vault のディレクトリ構成・Dataview フィールド命名（Q7 の A,B）は requirements で取得し、U1/U3 の設定・スキーマに反映。
- MCP で公開する操作は U8 のフル操作面を基準とし、コア（U1–U6）の API を薄くラップする。
