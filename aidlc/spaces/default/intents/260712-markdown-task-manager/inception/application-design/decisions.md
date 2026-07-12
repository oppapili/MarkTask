# Architecture Decision Records — MarkTask

> Inception / application-design 成果物。重要な設計判断を ADR 形式（Context / Decision / Consequences / Alternatives Rejected / Reversibility）で記録。
> 上流: `../requirements-analysis/requirements.md`（requirements）, `../user-stories/stories.md`（stories）, `../practices-discovery/team-practices.md`（team-practices）。

## ADR-1: 言語・ランタイム = TypeScript + bun

- **Context**: 個人 mvp・ローカル実行・学習/技術検証も兼ねる（intent-statement）。team-practices の想定スタックが TS/bun。
- **Decision**: TypeScript を bun ランタイムで実行（Q1=A）。テストは `bun:test`（Q8=A）。
- **Consequences**: 追加ツール不要でテスト/実行が速い。bun のファイル API・単一バイナリ配布が使える。Linux 限定（NFR-4）と整合。
- **Alternatives Rejected**: Node.js（成熟だが bun の速度/一体感を優先）、Go/Rust（学習コスト・Markdown/YAML/MCP エコシステムの手厚さで TS 優位）。
- **Reversibility**: 中（bun 依存 API を薄く保てば Node 移行は可能）。

## ADR-2: 層状アーキテクチャ = 共有 Core ＋ 薄い CLI/MCP アダプタ

- **Context**: project.md Mandated「CLI と MCP はコアロジックを共有」。成功指標に CLI 完結・AI 操作可能の両立。
- **Decision**: ドメイン＋アプリケーションサービス（TaskService）を Core に集約し、CLI(commander)・MCP(SDK) は Core を呼ぶだけの薄いアダプタとする。
- **Consequences**: 同一挙動を両経路で保証しやすい（結合テストで担保）。ロジック重複ゼロ。表示はアダプタ層で分岐（CLI=テキスト, MCP=JSON）。
- **Alternatives Rejected**: CLI と MCP を別実装（重複・挙動乖離のリスク→Mandated 違反）。
- **Reversibility**: 低（基盤方針・意図的に固定）。

## ADR-3: 単一パッケージ＋モジュール分割（モノレポにしない）

- **Context**: 個人 mvp、コンポーネントは少数。
- **Decision**: 単一パッケージで `src/core/**`・`src/cli/**`・`src/mcp/**` に分割（Q7=A）。
- **Consequences**: セットアップ/ビルドが単純。境界はディレクトリ＋公開 API で担保。
- **Alternatives Rejected**: モノレポ workspaces（`packages/core|cli|mcp`）— 個人 mvp には過剰。
- **Reversibility**: 高（後日 workspaces へ切り出し可能。Core を独立モジュールに保てば容易）。

## ADR-4: ファイル・パー・タスク、FS が SSoT、原子的書込

- **Context**: 「1タスク=1 Markdown」「ロックインゼロ」が中核価値（intent-statement）。NFR-1 データ安全性、NFR-2 既存資産非破壊。
- **Decision**: `tasks/<YYYYMMDD>-<slug>.md` を SSoT とし、書込は temp→rename の原子的操作。frontmatter は素の YAML（Bases/Dataview 互換）。未知フィールド・本文を保持。
- **Consequences**: Obsidian/エディタ/git でそのまま読める。破損・既存資産損失を防止。DB を持たない。
- **Alternatives Rejected**: SQLite 等のインデックス DB（ロックイン・二重管理→価値と矛盾）。完了毎の新ファイル生成（命名衝突・履歴分断→intent で不採用）。
- **Reversibility**: 低（データモデルの根幹）。ただし読み取り専用インデックスを後日足すのは可（可逆）。

## ADR-5: recurrence 日付演算 = date-fns、単一ファイル・予定ベース

- **Context**: recurrence が中核かつ既知の弱点。記法フル採用（間隔/曜日/月末/キーワード/終了条件）。次回 due は予定ベース（Q2=A/requirements FR-E）。
- **Decision**: RecurrenceEngine を純粋関数群として実装し、月加算/月末/曜日算出は date-fns を使用（Q4=A）。完了時は同一ファイルの due を次回へ、status を todo、last_done を記録。終了条件で done 確定。
- **Consequences**: 月末 clamp・曜日送りの正確さを確保。純粋関数ゆえ厚くユニットテスト可能（team-practices）。OQ（大幅遅延時のロールフォワード規則）は functional-design で確定。
- **Alternatives Rejected**: ネイティブ Date のみ（月末/加算の実装バグ温床）、dayjs（recurrence 系ユーティリティは date-fns が充実）、Temporal（依存/新しさのリスク）。
- **Reversibility**: 中（RecurrenceEngine 内に日付lib を閉じ込めるので差し替え可能）。

## ADR-6: 設定ファイル = YAML（TOML から変更）

- **Context**: requirements-analysis Q8=G は暫定で `config.toml`（XDG）。ただし frontmatter で既に YAML 依存がある。
- **Decision**: 設定を `~/.config/marktask/config.yaml`（XDG）とし、YAML パーサを流用（Q5=C）。requirements の暫定 TOML を**上書き**。
- **Consequences**: 依存を増やさない（smol-toml 不要）。設定と frontmatter の形式が揃う。
- **Alternatives Rejected**: TOML（追加依存）、JSON（コメント不可・手編集性が低い）。
- **Reversibility**: 高（ConfigManager 内に閉じる。形式差し替え容易）。

## ADR-7: フォーマッタ/リンタ = Prettier + ESLint

- **Context**: team-practices は「フォーマッタ＋リンタを CI で実行、失敗はマージブロック」を確定し、具体ツールは application-design で最終化と保留。
- **Decision**: Prettier（整形）＋ ESLint（lint）を採用（Q6=B, org 既定）。CI で実行し失敗はブロック（project.md Mandated）。
- **Consequences**: エコシステム/ルールが広く、TS 対応が厚い。設定ファイルが2つになる。
- **Alternatives Rejected**: Biome（単一・高速だが、ユーザーは実績広い Prettier+ESLint を選択）。
- **Reversibility**: 高（開発ツールのみ・成果物に影響小）。

## ADR-8: delete=ソフト削除、archive=別 operation（非破壊）

- **Context**: requirements FR-I / Q9。MCP で delete 公開＝AI 誤削除リスク。intent は「ファイルは資産・ロックインゼロ」。
- **Decision**: `delete`＝`tasks/.trash/` へ移動（ソフト・復旧可）、`archive`＝退避（別コマンド・完了/非アクティブの保全）。**ハード削除は提供しない**。ソフトゆえ MCP delete に追加 confirm なし。
- **Consequences**: AI 誤削除も回復可能。既定 list は `.trash/`・archive を除外。git がさらなるセーフティネット。
- **Alternatives Rejected**: ハード削除（不可逆・AI 経由で危険）、delete と archive の統合（意図が異なる→ユーザー明示で分離）。
- **Reversibility**: 中（DeleteArchiveService に閉じる）。

## ADR-9: エラーは Result 型で境界を跨ぐ（例外を投げない）

- **Context**: CLI/MCP/ファイル I/O の各境界で失敗を明示したい（construction guardrail: 境界でのエラーハンドリング必須）。曖昧参照は候補提示（FR-D5）。
- **Decision**: Core は `Result<T, AppError>` を返す。アダプタが `AppError.kind` を CLI の exit code / MCP のエラー結果へマッピング。I/O 例外は Repository で捕捉・正規化。
- **Consequences**: サイレント失敗を防ぎ、AI/スクリプトが決定的に判定可能。テスト容易。
- **Alternatives Rejected**: 例外throw を境界跨ぎで多用（制御フローが不透明）。
- **Reversibility**: 中〜低（全 Core API の署名規約）。

## Reversibility サマリ

| ADR | 可逆性 | 監視 |
|---|---|---|
| 1 ランタイム | 中 | bun 固有 API を薄く |
| 2 層状/コア共有 | 低（意図的固定） | Mandated |
| 3 単一パッケージ | 高 | 後日 workspaces 可 |
| 4 FS=SSoT | 低（根幹） | 価値の中核 |
| 5 date-fns/recurrence | 中 | Engine に閉じる |
| 6 config=YAML | 高 | ConfigManager に閉じる |
| 7 Prettier+ESLint | 高 | 開発ツールのみ |
| 8 soft-delete/archive | 中 | Service に閉じる |
| 9 Result 型 | 中〜低 | API 規約 |
