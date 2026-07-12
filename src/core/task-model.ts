/**
 * TaskModel — schema validation for Task entities.
 * Implements business-rules R1–R7.
 * State transitions are owned by U-state-management; this module
 * validates structural correctness only.
 */

import type { Task, Status, Result, AppError } from './types.js';
import { STATUSES, PRIORITIES, TASK_TYPES, ok, err, appError } from './types.js';

/** Date format: YYYY-MM-DD */
const DATE_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/** ISO 8601 datetime (subset: full date, optional T time, optional timezone) */
const ISO_DATETIME_RE =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

/** Wikilink format: [[...]] */
const WIKILINK_RE = /^\[\[.+\]\]$/;

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a Task against schema rules R1–R7.
 * Returns a list of validation errors (empty = valid).
 */
export function validate(task: Task): ValidationError[] {
  const errors: ValidationError[] = [];

  // R1: type is required and must be valid
  if (!task.type || !TASK_TYPES.includes(task.type)) {
    errors.push({ field: 'type', message: `Must be one of: ${TASK_TYPES.join(', ')}` });
  }

  // R2: status is required and must be valid
  if (!task.status || !STATUSES.includes(task.status)) {
    errors.push({ field: 'status', message: `Must be one of: ${STATUSES.join(', ')}` });
  }

  // R3: priority must be valid (if present — defaults applied at decode)
  if (task.priority && !PRIORITIES.includes(task.priority)) {
    errors.push({ field: 'priority', message: `Must be one of: ${PRIORITIES.join(', ')}` });
  }

  // R4: due must be YYYY-MM-DD if present
  if (task.due && !DATE_RE.test(task.due)) {
    errors.push({ field: 'due', message: 'Must be YYYY-MM-DD format' });
  }

  // R4: last_done must be YYYY-MM-DD if present
  if (task.last_done && !DATE_RE.test(task.last_done)) {
    errors.push({ field: 'last_done', message: 'Must be YYYY-MM-DD format' });
  }

  // R5: created must be ISO 8601 if present
  if (task.created && !ISO_DATETIME_RE.test(task.created)) {
    errors.push({ field: 'created', message: 'Must be ISO 8601 format' });
  }

  // R5: updated must be ISO 8601 if present
  if (task.updated && !ISO_DATETIME_RE.test(task.updated)) {
    errors.push({ field: 'updated', message: 'Must be ISO 8601 format' });
  }

  // R6: parent must be wikilink format if present
  if (task.parent && !WIKILINK_RE.test(task.parent)) {
    errors.push({ field: 'parent', message: 'Must be wikilink format [[ref]]' });
  }

  // R7: repeat is a pass-through string — no validation here (U-recurrence responsibility)

  return errors;
}

/**
 * Assert that a status value is a valid Status.
 * Returns Result for boundary-safe usage.
 */
export function assertValidStatus(value: string): Result<Status, AppError> {
  if (STATUSES.includes(value as Status)) {
    return ok(value as Status);
  }
  return err(appError('io', `Invalid status: "${value}". Must be one of: ${STATUSES.join(', ')}`));
}
