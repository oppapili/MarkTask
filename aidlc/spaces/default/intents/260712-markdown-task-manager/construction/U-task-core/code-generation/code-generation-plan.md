# Code Generation Plan — U-task-core

> Construction / code-generation（unit: U-task-core, library・基盤）。上流参照: `../functional-design/business-logic-model.md`, `../functional-design/business-rules.md`, `../functional-design/domain-entities.md`, `../nfr-requirements/security-requirements.md`, `../nfr-requirements/tech-stack-decisions.md`, `../../../inception/units-generation/unit-of-work.md`, `../../../inception/requirements-analysis/requirements.md`。
> スタック: TypeScript + bun / gray-matter + yaml / bun:test / Prettier + ESLint。実コードはワークスペース root。Test Strategy=Standard（コア重点）。

## 実装ステップ（順次・チェックボックス）

- [x] **Step 1: プロジェクト雛形**（最初の unit なので全体の土台も作る）
  - `package.json`（name: marktask, type: module, bin: marktask→dist or src, scripts: test/lint/format/build）, `tsconfig.json`（strict, ESNext, moduleResolution bundler）, `.prettierrc`, `.eslintrc`（TS 対応・CI ブロック方針）, `.gitignore`（node_modules, dist）, `src/` 骨格（`src/core/`, `src/cli/`, `src/mcp/` プレースホルダ）。
- [x] **Step 2: 共通型**（`src/core/types.ts`）: `Status`, `Priority`, `TaskType`, `Task`, `Config`, `Result<T>`, `AppError`（domain-entities.md 準拠）。
- [x] **Step 3: ConfigManager**（`src/core/config.ts`）: XDG `~/.config/marktask/config.yaml` の load/get/set/resolvePaths、既定値（tasksDir=./tasks, trashDir=tasks/.trash, archiveDir=archive）。
- [x] **Step 4: FrontmatterCodec**（`src/core/codec.ts`）: gray-matter+yaml で decode/encode、未知フィールド保持（NFR-2）、frontmatter 無しも安全（SEC-6 safe load）。
- [x] **Step 5: TaskModel/StateMachine 検証部**（`src/core/task-model.ts`）: `validate`, `assertValidStatus`、スキーマ検証（business-rules R1–R7）。※状態遷移本体は U-state-management だが、型/検証は task-core が所有。
- [x] **Step 6: TaskRepository**（`src/core/repository.ts`）: 原子的書込（temp→rename, NFR-1）、ファイル名生成 `<YYYYMMDD>-<slug>`＋衝突回避、slug サニタイズ（SEC-1 パストラバーサル防止）、resolveRef（完全一致→部分一致→候補）、list（tasksDir 直下）、moveToTrash/moveToArchive、childrenOf。
- [x] **Step 7: ユニットテスト（コア重点）**（`src/core/*.test.ts`, bun:test）: ファイル名生成/衝突、ref 解決（曖昧→候補）、原子的書込、codec の未知フィールド保持・frontmatter 無し、パストラバーサル拒否、スキーマ検証。各コンポーネント happy path＋エッジ。
- [x] **Step 8: テスト/ツール設定**: `bun test` が通る構成、Prettier/ESLint 設定の実効化、`package.json` scripts。
- [x] **Step 9: README 雛形**: 使い方（後続 unit で拡充）＋開発手順（`bun install`, `bun test`）。

## Story トレーサビリティ

- Step 3 → US-T.2（設定）／Step 6 → US-1.1（作成）, US-2.1（メタ更新）, US-T.1（データ安全性）, FR-D5（ref 解決）／Step 4-5 → FR-A2（スキーマ）, NFR-2／Step 6 移動 primitive → U-delete-archive が後で利用。

## 備考

- 本 unit は基盤ライブラリ。CLI/MCP アダプタ・状態遷移本体・recurrence 等は後続 unit。TaskService ファサードの型定義（インタフェース）はここで用意し、実装は各ドメイン unit＋アダプタで結線。
- 完全・実行可能なファイルを生成（プレースホルダ放置禁止, construction guardrail）。
