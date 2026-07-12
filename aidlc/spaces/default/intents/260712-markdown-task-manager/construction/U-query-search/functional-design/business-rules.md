# Business Rules — U-query-search

> Construction / functional-design（unit: U-query-search）。上流参照: `../../../inception/requirements-analysis/requirements.md`（requirements, FR-F）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。

## フィルタ・検索・ソートのルール

- **R1（対象母集合）**: 既定は活動タスク（`tasksDir` 直下）。`.trash/`・archive は既定で除外（FR-F4）。`includeArchived`(=`--archived`) 指定時のみ退避分を加える。
- **R2（AND 合成）**: 複数フィルタ（status/due/priority/tags/project）は AND。未指定条件は無視（FR-F1）。
- **R3（tags 包含）**: `tags` フィルタは「指定タグをすべて含む」（部分集合）で判定。
- **R4（due フィルタ）**: `dueBefore` は `due` 設定済みかつ `<=` 指定日。`due` 未設定は due フィルタで除外。
- **R5（既定ソート）**: due 昇順、`due` 未設定は末尾（nullsLast）。安定ソート（同値は created 昇順を副キー）。`--sort` で priority/created/status に切替可（FR-F3）。
- **R6（検索）**: `search` はタイトル（ファイル名）＋本文の大文字小文字を無視した部分一致（FR-F2）。0 件は空結果（エラーでない）。
- **R7（表示分離）**: QueryService は Task[] を返すのみ。列・記号・色・切り詰め・`--json` は OutputFormatter/アダプタの責務（design-system-mapping）。
- **R8（DB 非依存）**: インデックス DB を持たず、ファイル走査で解決（ADR-4）。数千件で実用速度（NFR-3）。

## 対象 stories

US-1.3（一覧）, US-5.1（フィルタ/検索）。
