/**
 * Core domain types for MarkTask.
 * Ref: domain-entities.md, business-rules.md
 */

// --- Status & Enums ---

export const STATUSES = ['todo', 'in-progress', 'done', 'waiting', 'cancelled'] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const TASK_TYPES = ['task', 'recurrence'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

// --- Task Entity ---

/**
 * In-memory representation of a task.
 * `ref` is the filename stem (not persisted in frontmatter).
 * `title` is derived from ref (human-readable portion after date prefix).
 * `raw` preserves unknown frontmatter fields for round-trip fidelity (INV2).
 */
export interface Task {
  /** Filename stem — reference key (not persisted, derived at decode) */
  ref: string;
  /** Human-readable title derived from ref (date prefix stripped, hyphens→spaces) */
  title: string;
  /** Markdown body (content below frontmatter) */
  body: string;
  /** Tags array */
  tags: string[];
  /** ISO 8601 creation timestamp — immutable after creation */
  created: string;
  /** ISO 8601 last-updated timestamp */
  updated: string;
  /** Task type: task or recurrence */
  type: TaskType;
  /** Current status */
  status: Status;
  /** Priority level */
  priority: Priority;
  /** Project name (optional) */
  project?: string;
  /** Due date YYYY-MM-DD (optional) */
  due?: string;
  /** Recurrence rule string (optional, interpreted by U-recurrence) */
  repeat?: string;
  /** Parent task wikilink e.g. "[[20260101-parent]]" (optional) */
  parent?: string;
  /** Last completion date YYYY-MM-DD for recurrence (optional) */
  last_done?: string;
  /** Unknown frontmatter fields preserved for round-trip (INV2) */
  raw: Record<string, unknown>;
}

// --- Config ---

export interface Config {
  /** Directory where active task .md files live */
  tasksDir: string;
  /** Directory for soft-deleted tasks */
  trashDir: string;
  /** Directory for archived tasks */
  archiveDir: string;
}

export const DEFAULT_CONFIG: Config = {
  tasksDir: './tasks',
  trashDir: 'tasks/.trash',
  archiveDir: 'archive',
};

// --- Result Type (ADR-9) ---

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// --- AppError ---

export type AppErrorKind =
  | 'not-found'
  | 'ambiguous'
  | 'invalid-repeat'
  | 'guard-blocked'
  | 'config'
  | 'io';

export interface AppError {
  kind: AppErrorKind;
  message: string;
  /** Candidate refs when kind='ambiguous' */
  candidates?: string[];
  /** Original error for debugging */
  cause?: unknown;
}

export function appError(
  kind: AppErrorKind,
  message: string,
  opts?: { candidates?: string[]; cause?: unknown },
): AppError {
  return { kind, message, ...opts };
}
