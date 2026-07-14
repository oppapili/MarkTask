/**
 * Subtask guard and service for MarkTask (U-subtasks).
 *
 * Implements:
 * - Pure subtask-guard logic over a Task[] snapshot (synchronous)
 * - `asSubtaskGuard(tasks)` factory satisfying the state-machine SubtaskGuard seam
 * - `SubtaskService` async convenience for repo-based reverse-lookup
 *
 * Design rationale: SubtaskGuard seam is synchronous, but child look-up
 * needs `repo.list()` (async). We resolve this by implementing guard logic
 * as pure functions over a pre-loaded snapshot. The caller loads the
 * snapshot once and injects it via `asSubtaskGuard`.
 */

import type { Task, Status, Result, AppError } from './types.js';
import { ok } from './types.js';
import type { SubtaskGuard } from './state-machine.js';
import type { TaskRepository } from './repository.js';

// --- Step 1: Helpers ---

/**
 * Extract the ref from a wikilink parent string.
 * `"[[20260701-foo]]"` → `"20260701-foo"`.
 * Returns null for undefined, empty, or malformed input.
 */
export function parseParentRef(parent: string | undefined): string | null {
  if (!parent) return null;
  const match = parent.match(/^\[\[(.+)\]\]$/);
  return match ? match[1]! : null;
}

/**
 * Whether a status blocks parent completion (OQ-4).
 * Blocking: 'todo' | 'in-progress' | 'waiting'.
 * Non-blocking: 'done' | 'cancelled'.
 */
export function isBlockingStatus(status: Status): boolean {
  return status === 'todo' || status === 'in-progress' || status === 'waiting';
}

// --- Step 2: Pure reverse-lookup + guard over a snapshot ---

/**
 * Return all immediate children of `parentRef` from the snapshot.
 * A child is any task whose `parent` wikilink resolves to `parentRef`.
 */
export function childrenOf(parentRef: string, tasks: Task[]): Task[] {
  return tasks.filter((t) => parseParentRef(t.parent) === parentRef);
}

/**
 * Pure, synchronous completion guard over a Task[] snapshot.
 *
 * Recursively checks whether `parentRef` has blocking descendants:
 * - A child with a blocking status is added to `blocking`.
 * - The function recurses into each child to accumulate descendant blockers
 *   (multi-level subtask hierarchies).
 * - Cycle protection via `visited` set prevents infinite recursion when
 *   child.parent circularly references an ancestor.
 *
 * Non-existent parentRef yields empty children → `{ blocked: false, blocking: [] }`.
 * Never throws.
 */
export function canComplete(
  parentRef: string,
  tasks: Task[],
  visited: Set<string> = new Set<string>(),
): { blocked: boolean; blocking: Task[] } {
  // Cycle protection: skip if already visiting this ref
  if (visited.has(parentRef)) {
    return { blocked: false, blocking: [] };
  }
  visited.add(parentRef);

  const children = childrenOf(parentRef, tasks);
  const blocking: Task[] = [];

  for (const child of children) {
    if (isBlockingStatus(child.status)) {
      blocking.push(child);
    }
    // Recurse into child to find deeply nested blocking descendants
    const descendant = canComplete(child.ref, tasks, visited);
    blocking.push(...descendant.blocking);
  }

  return { blocked: blocking.length > 0, blocking };
}

/**
 * Factory that wraps the pure `canComplete` into a SubtaskGuard instance
 * satisfying the synchronous seam in state-machine.ts.
 *
 * Usage: `const guard = asSubtaskGuard(tasks);`
 * Then pass as `deps.subtasks` to `complete(task, { subtasks: guard })`.
 */
export function asSubtaskGuard(tasks: Task[]): SubtaskGuard {
  return {
    canComplete: (ref: string): Result<{ blocked: boolean; blocking: Task[] }, AppError> =>
      ok(canComplete(ref, tasks)),
  };
}

// --- Step 3: Async SubtaskService (repo-based convenience) ---

/**
 * Async service for subtask queries backed by TaskRepository.
 * Read-only — no mutation, no side effects (R7).
 * The `--force` bypass is the caller's responsibility.
 */
export class SubtaskService {
  constructor(private readonly repo: TaskRepository) {}

  /**
   * List immediate children of a parent ref.
   * Propagates I/O errors from the repository.
   * Non-existent parent yields ok([]).
   */
  async children(parentRef: string): Promise<Result<Task[], AppError>> {
    const listResult = await this.repo.list();
    if (!listResult.ok) return listResult;
    return ok(childrenOf(parentRef, listResult.value));
  }

  /**
   * Async guard check: can the parent be completed?
   * Loads the full task list once and delegates to the pure `canComplete`.
   * Propagates I/O errors from the repository.
   */
  async canComplete(
    parentRef: string,
  ): Promise<Result<{ blocked: boolean; blocking: Task[] }, AppError>> {
    const listResult = await this.repo.list();
    if (!listResult.ok) return listResult;
    return ok(canComplete(parentRef, listResult.value));
  }
}
