# Application Design — Plan & Questions

Project: **MarkTask**（mvp）。アーキテクチャの骨格は確定済み（**CLI と MCP は単一コアの薄いアダプタ** = project.md Mandated）。ここで詰めるのは主に**技術スタック/ライブラリ選定・パッケージ構成・コンポーネント境界**です。
> 記号（A〜E, X）。複数選択可は `A, C`。既定でよければ「おまかせ」。学習/技術検証も兼ねるので、好みのライブラリがあれば X で指定を。

## 提案アーキテクチャ（Q7 で確認）

```
+---------------------------+      +---------------------------+
|  CLI アダプタ (commander) |      |  MCP アダプタ (MCP SDK)   |
+-------------+-------------+      +-------------+-------------+
              \                                 /
               v                               v
        +-------------------------------------------+
        |                Core (共有)                |
        |  TaskRepository (ファイル I/O, 原子的書込) |
        |  FrontmatterCodec (YAML 読み書き)         |
        |  TaskModel / StateMachine (5状態遷移)      |
        |  RecurrenceEngine (記法パース + 次回due)  |
        |  QueryService (filter/search/sort)        |
        |  SubtaskService (親子/完了ガード)          |
        |  DeleteArchiveService (soft-delete/退避)   |
        |  ConfigManager (XDG config)               |
        |  OutputFormatter (table/json/記号色)       |
        +-------------------------------------------+
                          |
                          v
              tasks/ の Markdown ファイル群 (SSoT)
```
<!-- Text fallback: CLIとMCPの2アダプタが共有Coreを呼ぶ層状構成。CoreはTaskRepository/FrontmatterCodec/StateMachine/RecurrenceEngine/QueryService/SubtaskService/DeleteArchiveService/ConfigManager/OutputFormatterから成り、tasks/のMarkdownを読み書きする。 -->

---

## Q1. 言語 / ランタイムは？

- A. TypeScript ＋ bun（feasibility/team-practices の想定どおり）
- B. TypeScript ＋ Node.js
- C. おまかせ（推奨: A）
- X. その他

[Answer]:A.

---

## Q2. CLI 引数パーサは？

- A. commander（定番・実績豊富）
- B. cac（極小・軽量）
- C. yargs（高機能だがやや重い）
- D. おまかせ（推奨: A commander、サブコマンド＋エイリアスが素直）
- X. その他（clipanion 等）

[Answer]:A.

---

## Q3. frontmatter / YAML の読み書きは？

- A. `gray-matter`（frontmatter 分離の定番）＋ `yaml`（YAML パース）
- B. `yaml` のみで自前分離
- C. おまかせ（推奨: A）
- X. その他

[Answer]:A.

---

## Q4. 日付・recurrence の日付計算は？（中核ロジック）

`every N months` / 曜日 / 月末 などの加算が要る。

- A. `date-fns`（関数型・tree-shakeable、月末/曜日ユーティリティが充実）
- B. `dayjs`（小さい・プラグイン式）
- C. ネイティブ `Date` のみ（依存ゼロだが月加算/月末は自前実装）
- D. Temporal（polyfill, 新しめで安全だが依存増）
- E. おまかせ（推奨: A date-fns、recurrence の正確な日付演算に有利）
- X. その他

[Answer]:A.

---

## Q5. 設定ファイル形式は？（Q8=G で XDG `config.toml` 想定）

- A. TOML（`smol-toml` 等の軽量パーサ）
- B. JSON（依存ゼロ、`config.json`）
- C. YAML（既に YAML 依存があるので流用）
- D. おまかせ（推奨: C=YAML 流用で依存を増やさない、または B=JSON）
- X. その他

[Answer]:C.

---

## Q6. フォーマッタ / リンタの最終選定は？（team-practices で application-design 確定と保留済み）

- A. Biome（フォーマッタ＋リンタ統合・高速・bun と相性良・設定軽い）
- B. Prettier ＋ ESLint（org 既定・エコシステム広い）
- C. おまかせ（推奨: A Biome、個人開発で摩擦最小・単一ツール）
- X. その他

[Answer]:B.

---

## Q7. パッケージ / モジュール構成は？

- A. 単一パッケージ＋モジュール分割（`src/core/**`, `src/cli/**`, `src/mcp/**`）。テストは `bun:test`
- B. モノレポ workspaces（`packages/core`, `packages/cli`, `packages/mcp` を分離）
- C. おまかせ（推奨: A、個人 mvp では単一パッケージが単純。境界は上図のとおり Core を分離）
- X. その他（コンポーネント境界の修正案があれば）

[Answer]:A.

---

## Q8. テストフレームワークは？

- A. `bun:test`（bun 標準・追加依存なし・高速）
- B. Vitest
- C. おまかせ（推奨: A）
- X. その他

[Answer]:A.
