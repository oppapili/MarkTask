# Scope Document — MarkTask (MVP)

> Ideation / scope-definition ステージ成果物。Product（リード）＋ Delivery 視点。
> 上流参照: `../intent-capture/intent-statement.md`, `../feasibility/feasibility-assessment.md`, `../feasibility/constraint-register.md`

## Scope Statement（スコープ宣言）

`intent-statement.md` の中核（1タスク=1Markdownファイル、CLI＋Obsidian互換ファイル形式＋MCP、ローカルのみ、個人利用、recurrence 含む）と、`feasibility-assessment.md` の GO 判定・`constraint-register.md` の制約に基づき、MVP を以下の境界で定義する。目的は「**自分の日常タスク管理を、プレーンな Markdown ファイル群として MarkTask に完全移行できる**」状態を作ること。

## In Scope（MVP に含む）

- タスクの CRUD — 1タスク=1Markdownファイル（frontmatter＋自由記述本文）
- 状態管理 — **5状態**: `todo` / `in-progress` / `done` / `waiting` / `cancelled`（Q5=B）
- frontmatter メタデータ — 期限(due) / 優先度(priority) / タグ(tags)。Dataview で読める規約に沿わせる（IC-3）
- recurrence — 独自の簡易記法を frontmatter に記述し、単一ファイルで管理（README に記法を明記）
- CLI — 上記操作を第一級インタフェースとして提供
- 一覧・フィルタ・検索 — 状態/期限/優先度/タグ/テキストでの絞り込み
- MCP サーバ — **フル操作面**（作成・一覧・取得・更新・完了・状態変更・recurrence設定・削除・検索）。stdio ローカル・非公開（SC-1）
- サブタスク — サブタスクも1ファイルとし、**wikilink `[[...]]` で親子を接続**（Q4=B）
- 保存先 — 設定で vault 内の任意ディレクトリを指定（既定 `tasks/`）（Q6=A）
- 別マシン再現 — `git clone` → README 手順で動作（bun install 等）（PC-2）

## Out of Scope（今回スコープ外＝Won't）

- 独自 GUI（デスクトップ/Webアプリ）— Obsidian と CLI で代替
- クラウド同期 — データはローカル Markdown が SSoT（同期は各自の運用/git）
- Obsidian プラグイン化 — 将来スコープ（MVP は互換ファイル形式まで, Q4/IC-5）
- クロスプラットフォーム — MVP は Linux のみ（PC-1）
- Obsidian Tasks プラグイン記法互換 — 将来検討（独自記法を優先）
- 運用フェーズ（本番デプロイ/監視/インシデント対応 等）— mvp スコープ外

## Prioritization (MoSCoW)（優先度）

| 優先度 | 能力 |
|---|---|
| **Must** | タスクCRUD（1ファイル1タスク）／5状態の状態管理／frontmatterメタデータ／recurrence／CLI／保存先設定 |
| **Should** | 一覧・フィルタ・検索／MCPサーバ（フル操作面）／サブタスクの wikilink 親子リンク |
| **Could** | Obsidian wikilink 連携の作り込み（タスク⇔ナレッジノートの補助リンク・逆リンク活用） |
| **Won't（今回）** | 独自GUI／クラウド同期／Obsidianプラグイン／クロスプラットフォーム／Tasks記法互換 |

## Value Stream（価値の流れ）

```
[ユーザー / 生成AI]
      | 作成・更新・完了・検索（CLI もしくは MCP）
      v
[MarkTask コア] --- frontmatter＋本文を読み書き --->
      | 1タスク=1Markdownファイル（設定した vault 内 tasks/ 等）
      v
[ローカル Markdown ファイル群 (SSoT)]
      | そのまま
      v
[Obsidian vault] -- wikilink でタスク⇔ナレッジを相互参照／Dataview で集計
```

<!-- Text fallback: ユーザーまたは生成AIがCLI/MCP経由でタスクを操作し、MarkTaskコアがfrontmatter付きMarkdownを1タスク1ファイルで読み書きする。ファイルはローカル(SSoT)に置かれ、Obsidianのvaultとして開いてwikilink相互参照やDataview集計に使える。 -->

## Walking Skeleton（Bolt 1 候補：最小E2E）

シーケンスは **walking-skeleton-first**（Q1=A）。最初の Bolt は薄い縦切りで、アーキテクチャの通し（ファイル形式＋保存先設定＋CLI）を証明する:

- `marktask add "買い物へ行く"` → 設定ディレクトリに frontmatter 付き Markdown ファイルを1つ生成（初期状態 `todo`）
- `marktask list` → 生成されたタスクを一覧表示
- `marktask done <id>` → 状態を `done` に更新

これで「1タスク=1ファイルの形式」「保存先設定」「CLIコア」「状態更新」の土台を検証。以降の Bolt で メタデータ／recurrence／検索／MCP／サブタスクリンクを肉付けする。

## Traceability（トレーサビリティ）

- すべての In-Scope 能力は `intent-statement.md` の Initial Scope Signal（中核機能・主要インタフェース）に対応。
- 制約（Linux限定・MCP stdioローカル・Obsidian/Dataview追従・recurrence独自記法）は `constraint-register.md`（PC/IC/SC/TC）に基づく。
- 詳細な proto-Units は `intent-backlog.md` を参照。
