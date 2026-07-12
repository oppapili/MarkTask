# Risk & Sequencing Rationale — MarkTask

> Inception / delivery-planning 成果物。Bolt 順序の「なぜ」。
> 上流参照: `../units-generation/unit-of-work-dependency.md`, `../requirements-analysis/requirements.md`, `../practices-discovery/team-practices.md`。

## ヒューリスティック: walking-skeleton-first ＋ risk-first ハイブリッド

- **Cockburn の walking skeleton**: Bolt1 で全アーキ層（Core＋CLI アダプタ＋ファイル I/O）を貫く最小 E2E（add/list/done）を通し、「1ファイル形式・保存先・CLIコア・状態更新」を早期に証明する。team-practices の walking-skeleton-first を反映。
- **risk-first（Reinertsen 的リスク低減価値）**: 最大の不確実性＝**recurrence**（Markdown ベースの既知の弱点・独自記法パース・日付算出）を Bolt3 と早期に据え、中核価値が成立するかを先に検証する。requirements の U5=最重要かつ最リスクの判断と整合。

WSJF スコアリングは形式的には用いない（個人 mvp・逐次・ジョブサイズ差が小さいため過剰）。代わりに上記2ヒューリスティックの定性判断で順序付け。

## トポロジ適合の確認

- Bolt 順は DAG（unit-of-work-dependency）の依存を尊重: U-recurrence は U-task-core・U-state-management に依存 → 両者は Bolt1〜2 で完成 → Bolt3 の前倒しは **DAG 違反なし**。
- U-cli/U-mcp は全ドメイン unit に依存 → cli は Bolt1 から段階的に肉付け（各 Bolt で対応コマンドを配線）、mcp は Bolt5（ドメイン完成後）。
- deviation: 純トポロジ順なら delete-archive を早く出せるが、risk-first で recurrence を優先。これは経済判断による正当な逸脱（本ファイルに記録）。

## Bolt ごとの確信仮説（要約）

1. アーキが成立する（縦切りが通る）／2. メタ＋状態が実用／**3. recurrence が破綻しない（中核リスク解消）**／4. 検索・親子が成立／5. AI が MCP で安全操作／6. Obsidian 相互参照。

## リスク登録（早期対応順）

| リスク | 対応 Bolt | 緩和 |
|---|---|---|
| recurrence の記法/日付算出の複雑さ | Bolt3（早期） | 純粋関数＋厚いユニットテスト（team-practices） |
| ファイル破損/既存資産損失 | Bolt1（基盤） | 原子的書込(NFR-1)・非破壊(NFR-2) |
| CLI/MCP 挙動乖離 | Bolt5 | コア共有＋結合テスト |
| 既存データの旧スキーマ | 外部依存（下記map） | 新スキーマへ正規化（out-of-band） |
