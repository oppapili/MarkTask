/**
 * State Machine — status transitions and done-branching for MarkTask.
 * Implements business-rules R2–R4; delegates recurrence (R5) and
 * subtask guard to injected dependencies (dependency inversion).
 *
 * Pure: no I/O, no mutation of input Task, returns new objects only.
 */

import type { Task, Status, Result, AppError } from './types.js';
import { ok, err } from './types.js';
import { assertValidStatus } from './task-model.js';

// --- Internal helpers ---

/** Returns current UTC timestamp in ISO 8601 format. */
function nowIso(): string {
  return new Date().toISOString();
}

// --- Dependency Interfaces (seams for U-recurrence / U-subtasks) ---

/**
 * Discriminated union representing the outcome of a `complete()` call.
 * Matches component-methods C10 / domain-entities exactly.
 */
export type CompleteOutcome =
  | { kind: 'completed'; task: Task }
  | { kind: 'recurred'; task: Task; nextDue: string }
  | { kind: 'recurrence-ended'; task: Task }
  | { kind: 'guard-blocked'; blocking: Task[] };

/**
 * Dependency interface for recurrence roll-forward logic.
 * Implemented by U-recurrence; injected at call site.
 */
export interface RecurrenceRoller {
  rollForward(task: Task): Result<CompleteOutcome, AppError>;
}

/**
 * Dependency interface for subtask completion guard.
 * Implemented by U-subtasks; injected at call site.
 */
export interface SubtaskGuard {
  canComplete(ref: string): Result<{ blocked: boolean; blocking: Task[] }, AppError>;
}

/**
 * Optional dependencies for `complete()`.
 * When absent, the corresponding branch is skipped.
 */
export interface CompleteDeps {
  recurrence?: RecurrenceRoller;
  subtasks?: SubtaskGuard;
}

// --- Core transition ---

/**
 * Transition a task to a new status.
 * Returns a NEW Task with `status` set to `to` and `updated` refreshed.
 * Does NOT mutate the input task. `created` is preserved immutably (R3).
 *
 * @param task - The task to transition.
 * @param to - Target status value (validated via assertValidStatus).
 * @returns Result containing the new Task on success, or AppError on invalid status.
 */
export function transition(task: Task, to: Status): Result<Task, AppError> {
  const validated = assertValidStatus(to);
  if (!validated.ok) {
    return err(validated.error);
  }
  return ok({
    ...task,
    status: validated.value,
    updated: nowIso(),
  });
}

// --- Sugar use-cases ---

/**
 * Transition task to 'in-progress'.
 */
export function start(task: Task): Result<Task, AppError> {
  return transition(task, 'in-progress');
}

/**
 * Transition task to 'waiting'.
 */
export function wait(task: Task): Result<Task, AppError> {
  return transition(task, 'waiting');
}

/**
 * Transition task to 'cancelled'.
 */
export function cancel(task: Task): Result<Task, AppError> {
  return transition(task, 'cancelled');
}

/**
 * Transition task to an arbitrary valid status.
 * Alias for `transition` — expressive intent at the call site.
 */
export function setState(task: Task, s: Status): Result<Task, AppError> {
  return transition(task, s);
}

// --- Done branching ---

/**
 * Complete a task with done-branching logic (R4):
 * 1. If subtask guard is present and blocks, returns `guard-blocked`.
 * 2. If task is a recurrence with a repeat rule and RecurrenceRoller is provided,
 *    delegates to `rollForward` (yields `recurred` or `recurrence-ended`).
 * 3. Otherwise transitions to 'done' and returns `completed`.
 *
 * Does NOT persist — returns the outcome for the caller to handle.
 *
 * @param task - The task to complete.
 * @param deps - Optional injected dependencies (subtask guard, recurrence roller).
 * @returns Result containing CompleteOutcome on success, or AppError on failure.
 */
export function complete(
  task: Task,
  deps?: CompleteDeps,
): Result<CompleteOutcome, AppError> {
  // Branch 1: Subtask guard
  if (deps?.subtasks) {
    const guardResult = deps.subtasks.canComplete(task.ref);
    if (!guardResult.ok) {
      return err(guardResult.error);
    }
    if (guardResult.value.blocked) {
      return ok({ kind: 'guard-blocked', blocking: guardResult.value.blocking });
    }
  }

  // Branch 2: Recurrence roll-forward
  if (task.type === 'recurrence' && task.repeat && deps?.recurrence) {
    return deps.recurrence.rollForward(task);
  }

  // Branch 3: Simple done transition
  const result = transition(task, 'done');
  if (!result.ok) {
    return err(result.error);
  }
  return ok({ kind: 'completed', task: result.value });
}
