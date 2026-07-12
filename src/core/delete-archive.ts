/**
 * DeleteArchiveService — soft delete and archive operations.
 * Delegates all I/O to TaskRepository primitives (INV4).
 * No hard delete. No direct fs operations.
 * Ref: U-delete-archive functional-design, business-rules R1–R7.
 */

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import type { Result, AppError } from './types.js';
import { ok } from './types.js';
import { resolveRef } from './repository.js';
import type { TaskRepository } from './repository.js';

// --- Result Types ---

export interface DeleteOutcome {
  ref: string;
  trashPath: string;
  restoreHint: string;
}

export interface ArchiveOutcome {
  ref: string;
  archivePath: string;
}

// --- Service ---

export class DeleteArchiveService {
  constructor(private readonly repo: TaskRepository) {}

  /**
   * Soft-delete a task: resolve ref → move to .trash/ → return outcome with restore hint.
   * No hard delete (R1). Status is not changed (R3).
   * SEC-1: path confinement delegated to TaskRepository.moveToTrash.
   * SEC-5: collision suffix handled by TaskRepository.
   */
  softDelete(ref: string): Result<DeleteOutcome, AppError> {
    // Resolve the user-provided ref against active tasks
    const refsResult = this.repo.listRefs();
    if (!refsResult.ok) return refsResult;

    const resolved = resolveRef(ref, refsResult.value);
    if (!resolved.ok) return resolved;

    const resolvedRef = resolved.value;

    // Determine the destination path (for reporting) before the move
    const trashDir = this.repo.getTrashDir();
    const destName = this.computeDestName(resolvedRef, trashDir);
    const trashPath = join(trashDir, `${destName}.md`);

    // Move to trash
    const moveResult = this.repo.moveToTrash(resolvedRef);
    if (!moveResult.ok) return moveResult;

    const tasksDir = this.repo.getTasksDir();
    const restoreHint = `mv "${trashPath}" "${tasksDir}/" (or: git checkout -- "${tasksDir}/${resolvedRef}.md")`;

    return ok({ ref: resolvedRef, trashPath, restoreHint });
  }

  /**
   * Archive a task: resolve ref → move to archiveDir → return outcome.
   * Status is NOT changed (R3) — archive is a location move only.
   * SEC-1: path confinement delegated to TaskRepository.moveToArchive.
   * SEC-5: collision suffix handled by TaskRepository.
   */
  archive(ref: string): Result<ArchiveOutcome, AppError> {
    // Resolve the user-provided ref against active tasks
    const refsResult = this.repo.listRefs();
    if (!refsResult.ok) return refsResult;

    const resolved = resolveRef(ref, refsResult.value);
    if (!resolved.ok) return resolved;

    const resolvedRef = resolved.value;

    // Determine the destination path (for reporting) before the move
    const archiveDir = this.repo.getArchiveDir();
    const destName = this.computeDestName(resolvedRef, archiveDir);
    const archivePath = join(archiveDir, `${destName}.md`);

    // Move to archive
    const moveResult = this.repo.moveToArchive(resolvedRef);
    if (!moveResult.ok) return moveResult;

    return ok({ ref: resolvedRef, archivePath });
  }

  /**
   * Compute the destination filename accounting for collision suffix.
   * Mirrors TaskRepository.moveTask's collision logic for reporting.
   */
  private computeDestName(ref: string, destDir: string): string {
    let destName = ref;
    let n = 2;
    while (existsSync(join(destDir, `${destName}.md`))) {
      destName = `${ref}-${n}`;
      n++;
    }
    return destName;
  }
}
