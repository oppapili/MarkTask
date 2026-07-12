# Constraint Register — MarkTask

> Ideation / feasibility ステージ成果物。設計・実装を縛る制約を分類して登録する。
> 上流参照: `../intent-capture/intent-statement.md`, `./feasibility-assessment.md`

## Technical Constraints（技術的制約）

| ID | 制約 | 由来 |
|---|---|---|
| TC-1 | タスクは「1タスク=1Markdownファイル」で表現し、プレーンな Markdown＋YAML frontmatter を Single Source of Truth とする | intent-statement / 中核原則 |
| TC-2 | 実装言語・ランタイムは TypeScript / Node（bun） | Q1 |
| TC-3 | recurrence は frontmatter の独自簡易記法で表現し、完了ごとの新ファイル生成は行わない（単一ファイル方式） | intent-statement(Decided) / Q5 |
| TC-4 | recurrence 記法はユーザー向けに README 等で明示・文書化する | Q5 |
| TC-5 | 秘密情報をコード/frontmatter/設定にハードコードしない（steering セキュリティ規約） | org steering |

## Platform & Runtime Constraints（プラットフォーム・実行環境）

| ID | 制約 | 由来 |
|---|---|---|
| PC-1 | 対応プラットフォームは Linux のみ | Q6 |
| PC-2 | 別マシンでも `git clone` → README 記載手順（bun install 等）で動作する、再現可能なローカルセットアップを提供する | Q2 |
| PC-3 | クラウド/サーバ・インフラは MVP 対象外（ローカル完結） | intent-statement / feasibility |

## Integration Constraints（連携制約）

| ID | 制約 | 由来 |
|---|---|---|
| IC-1 | タスクファイルは Obsidian の vault 内で自然に扱える形式（標準 Markdown＋YAML frontmatter＋wikilink `[[...]]`）に準拠する | intent-statement / Q4 |
| IC-2 | 既存の Obsidian vault のディレクトリ構成に合わせられるよう、保存先を設定可能（configurable）にする | Q7-A |
| IC-3 | frontmatter フィールドは Dataview 等でクエリ可能な規約に沿わせる | Q7-B |
| IC-4 | MCP インタフェースは MCP 仕様（公式 SDK）に準拠する | intent-statement / Q3 |
| IC-5 | Obsidian プラグイン化は将来スコープ（MVP は互換ファイル形式まで） | Q4 |

## Security Constraints（セキュリティ制約）

| ID | 制約 | 由来 |
|---|---|---|
| SC-1 | MCP サーバは stdio ローカル・ネットワーク非公開とする（攻撃面を作らない） | Q3-A |
| SC-2 | 将来ネットワーク公開に切り替える場合は認証・認可の追加を必須とする | feasibility(セキュリティ注記) |
| SC-3 | すべてのユーザー入力（CLI引数・frontmatter・MCP引数）を検証する | org steering |

## Organizational Constraints（体制・進め方の制約）

| ID | 制約 | 由来 |
|---|---|---|
| OC-1 | 単独開発（オーナー＝開発者＝ユーザー）。意思決定は1名だが決定は artifact に明文化する | stakeholder-map |
| OC-2 | trunk-based development・feature ブランチ・squash マージ（org 既定） | org.md Way of Working |
| OC-3 | テストは第一級。mvp 既定で最低80%行カバレッジ、CIで実行 | org.md / steering |

## Regulatory Constraints（規制制約）

| ID | 制約 | 由来 |
|---|---|---|
| RC-1 | 適用される規制フレームワークなし（個人・ローカル・第三者PIIなし） | Compliance 視点 |
| RC-2 | 将来 OSS 公開時はライセンス選定・依存ライブラリのライセンス確認が必要（将来課題） | Compliance 視点 |
