/**
 * TaskService — shared orchestration layer for CLI and MCP.
 * Thin facade over core primitives (Repository, QueryService,
 * DeleteArchiveService, RecurrenceEngine, state-machine).
 * All methods return Result; no exceptions cross this boundary.
 *
 * Ref: project.md Mandated — "CLI と MCP はコアロジックを共有する"
 */

import type {
  Task,
  Status,
  Priority,
  Config,
  Result,
  AppError,
} from './types.js';
import { ok } from './types.js';
import type { TaskFilter, Sort } from './query.js';
import { QueryService } from './query.js';
import { DeleteArchiveService } from './delete-archive.js';
import type { DeleteOutcome, ArchiveOutcome } from './delete-archive.js';
import { RecurrenceEngine } from './recurrence.js';
import type { CompleteOutcome } from './state-machine.js';
import { transition, complete } from './state-machine.js';
import { asSubtaskGuard } from './subtasks.js';
import { resolveRef } from './repository.js';
import type { TaskRepository } from './repository.js';
import { loadConfig, setConfigValue } from './config.js';

// --- Input Types ---

/** Input shape for creating a new task. */
export interface AddTaskInput {
  title: string;
  due?: string;
  priority?: Priority;
  tags?: string[];
  project?: string;
  repeat?: string;
  parent?: string;
  body?: string;
}

/** Patch shape for updating task metadata. */
export interface UpdateTaskPatch {
  due?: string | null;
  priority?: Priority;
  tags?: string[];
  project?: string | null;
  repeat?: string | null;
}

/** Options for the complete operation. */
export interface CompleteOpts {
  force?: boolean;
}

// --- Service ---

/**
 * Shared task service — single orchestration layer used by both CLI and MCP.
 * Encapsulates business-rule coordination; adapters (CLI/MCP) are thin callers.
 */
export class TaskService {
  private readonly repo: TaskRepository;
  private readonly queryService: QueryService;
  private readonly deleteArchiveService: DeleteArchiveService;
  private readonly recurrenceEngine: RecurrenceEngine;

  constructor(repo: TaskRepository) {
    this.repo = repo;
    this.queryService = new QueryService(repo);
    this.deleteArchiveService = new DeleteArchiveService(repo);
    this.recurrenceEngine = new RecurrenceEngine();
  }

  /**
   * Create a new task.
   * If `repeat` is specified, type is automatically set to 'recurrence' (R11).
   */
  async addTask(input: AddTaskInput): Promise<Result<Task, AppError>> {
    const type = input.repeat ? 'recurrence' : 'task';
    const result = this.repo.create(input.title, {
      type,
      due: input.due,
      priority: input.priority,
      tags: input.tags,
      project: input.project,
      repeat: input.repeat,
      parent: input.parent,
      body: input.body,
    });
    return result;
  }

  /**
   * List tasks with optional filter and sort.
   */
  async list(filter?: TaskFilter, sort?: Sort): Promise<Result<Task[], AppError>> {
    return this.queryService.list(filter, sort);
  }

  /**
   * Search tasks by substring in title/body.
   */
  async search(query: string): Promise<Result<Task[], AppError>> {
    return this.queryService.search(query);
  }

  /**
   * Get a single task by user-provided ref (supports partial matching).
   */
  async getByRef(ref: string): Promise<Result<Task, AppError>> {
    const refsResult = this.repo.listRefs();
    if (!refsResult.ok) return refsResult;

    const resolved = resolveRef(ref, refsResult.value);
    if (!resolved.ok) return resolved;

    return this.repo.read(resolved.value);
  }

  /**
   * Update task metadata. R11: adding repeat → type='recurrence';
   * clearing repeat → type='task'.
   */
  async updateTask(ref: string, patch: UpdateTaskPatch): Promise<Result<Task, AppError>> {
    const taskResult = await this.getByRef(ref);
    if (!taskResult.ok) return taskResult;

    const task = taskResult.value;
    const updated: Task = { ...task };

    if (patch.due !== undefined) {
      updated.due = patch.due === null ? undefined : patch.due;
    }
    if (patch.priority !== undefined) {
      updated.priority = patch.priority;
    }
    if (patch.tags !== undefined) {
      updated.tags = patch.tags;
    }
    if (patch.project !== undefined) {
      updated.project = patch.project === null ? undefined : patch.project;
    }
    if (patch.repeat !== undefined) {
      updated.repeat = patch.repeat === null ? undefined : patch.repeat;
    }

    // R11: type sync — repeat present → recurrence; absent → task
    if (updated.repeat) {
      updated.type = 'recurrence';
    } else {
      updated.type = 'task';
    }

    updated.updated = new Date().toISOString();

    const writeResult = this.repo.write(updated);
    if (!writeResult.ok) return writeResult;

    return ok(updated);
  }

  /**
   * Transition task to a new status.
   */
  async changeState(ref: string, status: Status): Promise<Result<Task, AppError>> {
    const taskResult = await this.getByRef(ref);
    if (!taskResult.ok) return taskResult;

    const transResult = transition(taskResult.value, status);
    if (!transResult.ok) return transResult;

    const writeResult = this.repo.write(transResult.value);
    if (!writeResult.ok) return writeResult;

    return ok(transResult.value);
  }

  /**
   * Complete a task with done-branching:
   * - guard-blocked: NOT persisted; returns the blocking children.
   * - completed/recurred/recurrence-ended: persists the updated task.
   * - force: skips subtask guard.
   */
  async completeTask(
    ref: string,
    opts?: CompleteOpts,
  ): Promise<Result<CompleteOutcome, AppError>> {
    const taskResult = await this.getByRef(ref);
    if (!taskResult.ok) return taskResult;

    const snapshotResult = await this.repo.list();
    if (!snapshotResult.ok) return snapshotResult;

    const deps = opts?.force
      ? { recurrence: this.recurrenceEngine }
      : {
          subtasks: asSubtaskGuard(snapshotResult.value),
          recurrence: this.recurrenceEngine,
        };

    const outcome = complete(taskResult.value, deps);
    if (!outcome.ok) return outcome;

    // guard-blocked: do NOT persist
    if (outcome.value.kind === 'guard-blocked') {
      return ok(outcome.value);
    }

    // R11: if recurrence-ended and repeat is now empty, ensure type='task'
    const taskToWrite = { ...outcome.value.task };
    if (outcome.value.kind === 'recurrence-ended' && !taskToWrite.repeat) {
      taskToWrite.type = 'task';
    }

    const writeResult = this.repo.write(taskToWrite);
    if (!writeResult.ok) return writeResult;

    return ok(outcome.value);
  }

  /**
   * Set or clear the recurrence rule on a task.
   * Delegates to updateTask which handles R11 type sync
   * (repeat present → type='recurrence'; null → type='task').
   */
  async setRecurrence(ref: string, repeat: string | null): Promise<Result<Task, AppError>> {
    return this.updateTask(ref, { repeat });
  }

  /**
   * Soft-delete a task (move to .trash/).
   */
  softDelete(ref: string): Result<DeleteOutcome, AppError> {
    return this.deleteArchiveService.softDelete(ref);
  }

  /**
   * Archive a task (move to archiveDir/).
   */
  archive(ref: string): Result<ArchiveOutcome, AppError> {
    return this.deleteArchiveService.archive(ref);
  }

  /**
   * Get the current configuration.
   */
  getConfig(): Result<Config, AppError> {
    return loadConfig();
  }

  /**
   * Set a config key and persist.
   */
  setConfig(key: string, value: string): Result<Config, AppError> {
    return setConfigValue(key, value);
  }
}
