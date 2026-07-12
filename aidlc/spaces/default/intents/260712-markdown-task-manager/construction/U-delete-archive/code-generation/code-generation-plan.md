# Code Generation Plan — U-delete-archive

> Construction / code-generation（unit: U-delete-archive, library）。上流参照: `../functional-design/*`, `../nfr-requirements/*`, `../../../inception/units-generation/unit-of-work.md`, `../../../inception/requirements-analysis/requirements.md`。task-core の移動プリミティブを再利用する薄いドメインサービス。

## 実装ステップ

- [ ] **Step 1: DeleteArchiveService**（`src/core/delete-archive.ts`）
  - `softDelete(ref)`: resolveRef → moveToTrash → `{ ref, trashPath, restoreHint }` を Result で返す（FR-I1）。ハード削除なし。
  - `archive(ref)`: resolveRef → moveToArchive → `{ ref, archivePath }`（FR-I2, status 不変）。
  - task-core（Repository.resolveRef/moveToTrash/moveToArchive）に委譲。独自 I/O なし。
- [ ] **Step 2: core index 更新**（`src/core/index.ts`）: DeleteArchiveService をエクスポート。
- [ ] **Step 3: ユニットテスト**（`src/core/delete-archive.test.ts`, bun:test）
  - softDelete が `.trash/` へ移動・元は list から消える・restoreHint を含む。
  - archive が archiveDir へ移動・status を変えない。
  - 存在しない/曖昧 ref のエラー（not-found/ambiguous）。
  - 移動先衝突時のサフィックス（task-core 経由）。

## Story トレーサビリティ

- Step 1 softDelete → US-7.1, US-6.2（MCP 安全削除）／archive → US-7.2。

## 備考

- 既存の `src/core/` 構成・型（types.ts の Result/AppError）・Repository API に整合させる。完全・実行可能・テスト green を必須。既存テストを壊さない。
