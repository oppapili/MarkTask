/**
 * QueryService — filter, sort, and search over tasks (U-query-search).
 * Pure functions operate on Task[]; QueryService orchestrates I/O via TaskRepository.
 * Ref: business-logic-model.md, business-rules.md R1-R8, domain-entities.md.
 */

import type { Task, Status, Priority, Result, AppError } from './types.js';
import type { TaskRepository } from './repository.js';

// --- Value Objects ---

/** Filter criteria for task queries. All conditions compose with AND (R2). */
export interface TaskFilter {
  /** Include only tasks with these statuses */
  status?: Status[];
  /** Include only tasks due on or before this date (YYYY-MM-DD, inclusive per R4) */
  dueBefore?: string;
  /** Include only tasks with these priorities */
  priority?: Priority[];
  /** Include only tasks containing ALL specified tags (subset match, R3) */
  tags?: string[];
  /** Include only tasks in this project (exact match) */
  project?: string;
  /** Also include archived tasks (default: false, R1) */
  includeArchived?: boolean;
}

/** Sort specification for task lists. */
export interface Sort {
  /** Sort key */
  key: 'due' | 'priority' | 'created' | 'status';
  /** Sort direction */
  dir: 'asc' | 'desc';
  /** Push null/undefined values to the end (default: true, R5) */
  nullsLast?: boolean;
}

/** Default sort: due ascending with unset-due tasks at the end (R5). */
export const DEFAULT_SORT: Sort = { key: 'due', dir: 'asc', nullsLast: true };

// --- Priority Semantic Order (high > medium > low) ---

const PRIORITY_RANK: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// --- Status Semantic Order (for status sort key) ---

const STATUS_RANK: Record<Status, number> = {
  'in-progress': 0,
  todo: 1,
  waiting: 2,
  done: 3,
  cancelled: 4,
};

// --- Pure Functions ---

/**
 * Test whether a single task matches all specified filter conditions (AND composition, R2).
 * Unspecified conditions are no-ops (always pass).
 */
export function matches(task: Task, filter: TaskFilter): boolean {
  if (filter.status && !filter.status.includes(task.status)) {
    return false;
  }
  if (filter.dueBefore) {
    // R4: task must have due set AND due <= dueBefore (inclusive)
    if (task.due == null || task.due > filter.dueBefore) {
      return false;
    }
  }
  if (filter.priority && !filter.priority.includes(task.priority)) {
    return false;
  }
  if (filter.tags) {
    // R3: f.tags ⊆ t.tags (all filter tags must be present in task tags)
    for (const tag of filter.tags) {
      if (!task.tags.includes(tag)) {
        return false;
      }
    }
  }
  if (filter.project != null && task.project !== filter.project) {
    return false;
  }
  return true;
}

/**
 * Filter tasks by the given criteria (R2 AND composition).
 */
export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  return tasks.filter((t) => matches(t, filter));
}

/**
 * Sort tasks according to the given sort specification.
 * Stable sort: ties on the primary key are broken by `created` ascending.
 * When nullsLast is true (default), tasks without the sort-key value go to the end.
 */
export function sortTasks(tasks: Task[], sort: Sort = DEFAULT_SORT): Task[] {
  const sorted = [...tasks];
  const dirMultiplier = sort.dir === 'asc' ? 1 : -1;
  const nullsLast = sort.nullsLast !== false; // default true

  sorted.sort((a, b) => {
    const cmp = compareBySortKey(a, b, sort.key, dirMultiplier, nullsLast);
    if (cmp !== 0) return cmp;
    // Stable tiebreaker: created ascending
    return a.created < b.created ? -1 : a.created > b.created ? 1 : 0;
  });

  return sorted;
}

/** Compare two tasks by the specified sort key. */
function compareBySortKey(
  a: Task,
  b: Task,
  key: Sort['key'],
  dirMultiplier: number,
  nullsLast: boolean,
): number {
  switch (key) {
    case 'due': {
      const aVal = a.due;
      const bVal = b.due;
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return nullsLast ? 1 : -1;
      if (bVal == null) return nullsLast ? -1 : 1;
      return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * dirMultiplier;
    }
    case 'priority': {
      const aRank = PRIORITY_RANK[a.priority];
      const bRank = PRIORITY_RANK[b.priority];
      // high=0 < medium=1 < low=2, so ascending means high first
      return (aRank - bRank) * dirMultiplier;
    }
    case 'created': {
      return (a.created < b.created ? -1 : a.created > b.created ? 1 : 0) * dirMultiplier;
    }
    case 'status': {
      const aRank = STATUS_RANK[a.status];
      const bRank = STATUS_RANK[b.status];
      return (aRank - bRank) * dirMultiplier;
    }
  }
}

/**
 * Search tasks by substring match on title and body (R6).
 * Case-insensitive, trimmed query. Returns empty array for 0 hits (not an error).
 * Results sorted by DEFAULT_SORT.
 */
export function searchTasks(tasks: Task[], query: string): Task[] {
  const normalized = query.toLowerCase().trim();
  if (normalized.length === 0) {
    return sortTasks(tasks);
  }
  const hits = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(normalized) || t.body.toLowerCase().includes(normalized),
  );
  return sortTasks(hits);
}

// --- QueryService Class ---

/**
 * Orchestrates task queries via TaskRepository (single I/O boundary, INV4).
 * Pure filter/sort/search logic is delegated to the standalone functions above.
 */
export class QueryService {
  private readonly repo: TaskRepository;

  constructor(repo: TaskRepository) {
    this.repo = repo;
  }

  /**
   * List tasks with optional filter and sort.
   * Default excludes archived/trashed tasks (R1). Set filter.includeArchived for archived.
   */
  async list(filter?: TaskFilter, sort?: Sort): Promise<Result<Task[], AppError>> {
    const listResult = await this.repo.list();
    if (!listResult.ok) return listResult;

    let tasks = listResult.value;

    if (filter?.includeArchived) {
      const archivedResult = await this.repo.listArchived();
      if (!archivedResult.ok) return archivedResult;
      tasks = tasks.concat(archivedResult.value);
    }

    const filtered = filter ? filterTasks(tasks, filter) : tasks;
    const sorted = sortTasks(filtered, sort);
    return { ok: true, value: sorted };
  }

  /**
   * Search tasks by substring in title/body (R6).
   * Always searches active tasks only (no archive by default).
   */
  async search(query: string): Promise<Result<Task[], AppError>> {
    const listResult = await this.repo.list();
    if (!listResult.ok) return listResult;

    const results = searchTasks(listResult.value, query);
    return { ok: true, value: results };
  }
}
