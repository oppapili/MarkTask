# Feasibility & Constraint Assessment — MarkTask

> Ideation / feasibility ステージ成果物。Architect（リード）＋ AWS-Platform ＋ Compliance の視点を統合。
> 上流: `../intent-capture/intent-statement.md`（Problem / Interfaces / Success Metrics / Scope Signal）を前提とする。

## Summary（総合判定）

`intent-statement.md` が定義する MVP（1タスク=1Markdownファイル、CLI＋Obsidian互換ファイル形式＋MCP、ローカルのみ、個人利用、recurrence 含む）は **技術的に十分実現可能（高い実現性・低いリスク）**。使用技術はいずれも確立されており、外部依存も小さい。主な設計上の論点は「recurrence の表現」と「既存 Obsidian vault 規約への追従」の2点で、いずれも Inception 以降で解消できる範囲。

判定: **GO（MVPスコープで実現可能）**。

## Technical Feasibility（機能能力ごとの実現性）

| 能力 | 実現性 | 根拠・補足 |
|---|---|---|
| ローカル Markdown ファイル群の CRUD（1タスク=1ファイル） | 高 | ファイルI/O＋YAML frontmatter パースは標準的。SSoT はローカルファイル。 |
| CLI | 高 | Node/bun のCLIフレームワーク（例: commander/clipanion 等）で確立された領域。 |
| MCP サーバ | 高 | MCP は公開仕様。TypeScript 公式 SDK が利用可能。トランスポートは stdio ローカル（Q3=A）でセキュアに実装可能。 |
| Obsidian 互換ファイル形式 | 高 | Obsidian は標準 Markdown＋YAML frontmatter＋wikilink `[[...]]`。仕様に合わせるだけで達成。 |
| メタデータ（期限/優先度/タグ） | 高 | frontmatter フィールドで表現。Dataview で読める形にする（Q7=B）。 |
| 一覧・フィルタ・検索 | 高 | ファイル走査＋frontmatter インデックスで実現。規模（個人利用）ではパフォーマンス懸念小。 |
| recurrence（繰り返し） | 中〜高 | frontmatter に独自の簡易記法で繰り返しルールを記述（Q5=B）。次回発生日の算出ロジックが必要だが難易度は中。命名衝突回避のため単一ファイル方式（intent-statement の Decided に整合）。 |

## Technology & Runtime Assessment（技術・ランタイム）

- **言語/ランタイム**: TypeScript / Node（bun ランタイム）（Q1=A）。MCP 公式 SDK、YAML/Markdown パーサ、CLI ライブラリのエコシステムが揃い、この作業環境（bun 前提）とも親和。
- **対応プラットフォーム**: Linux のみ（Q6=B）。クロスプラットフォーム対応の負担を負わないため実装・検証が単純化。
- **配布/セットアップ**: まずローカル、将来的にパッケージ公開も視野（Q2=D）。**別マシンでも `git clone` → README 記載の手順（bun install 等）で動作**できることを要件とする（再現可能なローカルセットアップ）。
- **コード規約**: ワークスペース steering（Prettier セミコロンあり・2スペース・camelCase・JSDoc、テスト最低80%）に従う。

## Cloud / Infrastructure Assessment（AWS-Platform 視点）

- **MVP ではクラウド不要**。データはローカルの Markdown ファイル群で完結し、サーバ/DB/ネットワークのプロビジョニングは発生しない。AWS サービス選定・VPC・IAM・コスト見積は **本スコープ対象外**。
- 運用フェーズ（本番デプロイ/監視）は mvp スコープ外（intent-statement の Scope Signal に整合）。将来クラウド同期や公開ホスティングを行う場合に別途検討。
- **インフラ的コスト**: 実質ゼロ（ローカル実行）。

## Compliance & Data Assessment（Compliance 視点）

- **規制フレームワーク該当なし**: 個人が自分のデータをローカルで扱うのみ。第三者の PII/PHI を処理せず、PCI/HIPAA/SOC2/GDPR/CCPA いずれも適用対象外。
- **データ分類**: すべてローカル・個人所有（Single Source of Truth はユーザーのファイルシステム）。データレジデンシー＝ローカルマシン。
- **セキュリティ上の注記（重要）**: MCP サーバは **stdio ローカル・ネットワーク非公開**（Q3=A）とする方針のため、認証を要する攻撃面は発生しない。将来ネットワーク公開（HTTP 等）に切り替える場合は **認証・認可の追加が必須**（constraint-register / raid に記載）。秘密情報のハードコード禁止（frontmatter/設定に資格情報を置かない）。
- **将来公開時の留意**: OSS 公開する場合のライセンス選定・依存ライブラリのライセンス確認は将来課題（対象外だが記録）。

## Key Risks & Uncertainties（主なリスクと不確実性）

1. **recurrence 記法の設計** — 独自簡易記法の表現力（毎日/毎週/毎月/曜日指定/間隔）と「次回発生日」算出・完了履歴の保持方法。RRULE 準拠でない分、表現力の線引きが必要。→ requirements/functional-design で確定。
2. **既存 Obsidian vault 規約への追従** — ユーザーの現行 vault のディレクトリ構成・Dataview フィールド規約に合わせる必要（Q7=A,B）が、その具体は未取得。→ 設定可能（configurable）にする方針で吸収。
3. **Obsidian エコシステムの慣習との衝突** — Obsidian Tasks プラグイン等が持つ独自のタスク/繰り返し記法と、MarkTask 独自記法の共存。MVP では独自記法を優先し互換は将来課題。

## Feasibility Verdict（結論）

- **GO**。MVP は妥当な工数・低リスクで実現可能。
- 前提: recurrence 記法と vault 規約追従は「設定可能・文書化（README）」を設計原則として持ち込むことで不確実性を吸収する。
- 次段（scope-definition / requirements-analysis）へ: recurrence 記法仕様、vault 構成・Dataview フィールドの具体、MCP で公開する操作範囲を確定する。
