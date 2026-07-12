<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-12T11:28:00Z — アーキテクチャは既定路線がほぼ確定（project.md Mandated: CLI と MCP は単一コアの薄いアダプタ）。よって application-design の主な未決は (1) 技術スタック/ライブラリ選定（TS/bun 前提、CLI parser・frontmatter/YAML・日付/recurrence 計算・config 形式・formatter/linter）、(2) パッケージ/モジュール構成、(3) コンポーネント境界の確認。intent-statement の「学習・技術検証を兼ねる」動機からライブラリ選択はユーザーの嗜好を尊重して問う。Depth=Standard。support の aws-platform はローカルのみ(クラウド無)のため実質非該当、design は DX 制約の確認のみ。

## Deviations
- 2026-07-12T11:35:00Z — 設定ファイル形式を TOML → **YAML** に変更（Q5=C）。requirements-analysis Q8=G の暫定「config.toml」を上書き。理由: frontmatter で既に yaml 依存があり、追加パーサ(smol-toml)を避けられる。application-design が技術確定の場なので上書きは正当。

## Tradeoffs
- 2026-07-12T11:35:00Z — 技術スタック確定: TS+bun / commander / gray-matter+yaml / date-fns / config=YAML / Prettier+ESLint / 単一パッケージ(src/core|cli|mcp) / bun:test。date-fns は recurrence の月末・曜日演算の正確さ優先。単一パッケージは個人 mvp の単純さ優先（将来モノレポ化は可逆）。
- 2026-07-12T11:35:00Z — formatter/linter を **Prettier + ESLint** に確定（Q6=B, org 既定）。team-practices が application-design 確定と保留していた項目。Biome は不採用（ユーザー選択）。

## Open questions
- 2026-07-12T11:35:00Z — config を YAML にしたので team.md/project.md の記述と齟齬が出ないよう、§13 で「設定=YAML」「formatter/linter=Prettier+ESLint」を Decided/Corrections に残すか検討。
