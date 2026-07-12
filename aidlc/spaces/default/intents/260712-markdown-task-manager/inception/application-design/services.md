# Services — MarkTask

> Inception / application-design 成果物。サービス定義・編成パターン・通信契約・ライフサイクル。
> 上流: `../requirements-analysis/requirements.md`（requirements）, `../user-stories/stories.md`（stories）, `../practices-discovery/team-practices.md`（team-practices）。
> 本プロジェクトはローカル・インプロセスのツールであり、ネットワーク型マイクロサービスではない。「サービス」＝アプリケーションサービス（ユースケース編成）と、それを露出する2つの配信メカニズム。

## S1. TaskService（アプリケーションサービス）

- **責務**: ユースケースの唯一の編成点。ドメインコンポーネント（Repository / FrontmatterCodec / StateMachine / RecurrenceEngine / QueryService / SubtaskService / DeleteArchiveService / ConfigManager）を合成。
- **編成パターン**: **オーケストレーション**（TaskService が明示的に各コンポーネントを順に呼ぶ）。イベント/コレオグラフィは不要（単一プロセス・同期）。
- **代表フロー**:
  - `complete(ref)`: Repository.read → repeat 有無判定 → 有なら SubtaskService.canComplete（親なら）→ RecurrenceEngine.nextDue → StateMachine.transition → Repository.write（原子的）。
  - `addTask`: StateMachine 初期化 → RecurrenceEngine.parse（repeat 指定時, 検証）→ Repository.create。
- **通信契約**: すべて同期・インプロセス関数呼び出し。戻り値は `Result<T>`（例外を境界で投げない）。
- **ライフサイクル/スケール**: プロセス起動ごとに生成される軽量オブジェクト。状態はファイルシステムが保持（インメモリ状態を持たない）。並行性は「単一ユーザーの逐次実行」を前提（NFR-3 数千件で実用速度）。

## S2. CLI（配信メカニズム）

- **責務**: `marktask`/`mt` プロセス。commander で引数解釈 → TaskService 呼び出し → OutputFormatter で人間向け出力 → exit code。
- **ライフサイクル**: 1コマンド=1プロセス（起動→実行→終了）。常駐しない。
- **契約**: stdin/args 入力、stdout/stderr 出力、exit code（0/1/2）。

## S3. MCP Server（配信メカニズム）

- **責務**: stdio ローカル・非公開の MCP サーバプロセス。MCP SDK でツールを登録 → TaskService 呼び出し → 構造化 JSON を返す（FR-H1..H4）。
- **公開ツール**: create/list/get/update/complete/state/search/delete/archive/recurrence_set。
- **ライフサイクル**: クライアント（生成AI）が stdio で起動・接続する常駐プロセス。TaskService は CLI と同一実装を共有（Mandated）。
- **契約**: MCP メッセージ（JSON-RPC over stdio）。`AppError` はツールのエラー結果（候補・理由付き）へマッピング。delete はソフト削除ゆえ追加 confirm なし。

## 共有と非重複

- ビジネスロジックは **S1 のみ**。S2/S3 は薄いアダプタ（team-practices/Mandated: CLI と MCP はコア共有）。同一ユースケースが両経路で同一挙動になることを結合テストで保証（コア重点テスト）。

## セキュリティ/境界ノート

- ネットワーク公開なし（MCP は stdio ローカル）。認証・認可は対象外（ローカル単一ユーザー、SC 制約）。
- 外部送信なし。データはローカル Markdown（SSoT）。
