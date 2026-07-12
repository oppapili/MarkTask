# Business Rules — U-delete-archive

> Construction / functional-design（unit: U-delete-archive）。上流参照: `../../../inception/requirements-analysis/requirements.md`（requirements）, `../../../inception/application-design/component-methods.md`（component-methods）, `../../../inception/units-generation/unit-of-work.md`（unit-of-work）, `../../../inception/application-design/components.md`, `../../../inception/application-design/services.md`。

## ルール・不変条件

- **R1（非破壊）**: delete も archive もファイルを物理削除しない。必ず「移動」で表現する（task-core INV3 と整合）。ハード削除は提供しない（git がセーフティネット）。
- **R2（delete ≠ archive）**: 2つは別 operation。**delete**＝誤り/不要の除去（`tasks/.trash/` へ・復旧前提）。**archive**＝完了/非アクティブの保全（`archiveDir` へ・活動一覧から除外）。意図が異なるため統合しない（ユーザー明示 / requirements Q9）。
- **R3（status 不変）**: archive は場所の移動のみで `status` を書き換えない（done/cancelled 等の状態はそのまま保全）。delete も status を変えない。
- **R4（既定 list 除外）**: `.trash/` と `archiveDir` は既定 `list`/`search` の対象外。退避は `--archived` で明示参照。
- **R5（衝突回避）**: 移動先に同名が既存なら `-2`,`-3`… サフィックス（task-core の move プリミティブが担保）。
- **R6（復旧容易性）**: softDelete の戻り値に復旧手段（mv / git）を含める。MCP からの delete も回復可能ゆえ追加 confirm を課さない（FR-H4）。
- **R7（参照解決）**: 対象は `<ref>` を task-core.resolveRef で解決（完全一致→部分一致→候補）。曖昧は候補提示（エラーにしない）。

## 対象 stories

US-7.1（ソフト削除）, US-7.2（archive）, US-6.2（MCP 安全削除）。
