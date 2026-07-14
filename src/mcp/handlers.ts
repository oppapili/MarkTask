/**
 * MCP Tool Handlers — pure dispatch + conversion layer.
 * Maps MCP tool calls → TaskService methods → structured JSON responses.
 * Never throws; all errors are returned as structured objects.
 *
 * Ref: domain-entities.md, business-rules.md FR-H1–H4.
 */

import type { Task, AppError, Status, Priority } from '../core/types.js';
import type { TaskService } from '../core/task-service.js';
import type { CompleteOutcome } from '../core/state-machine.js';
import type { TaskFilter, Sort } from '../core/query.js';
import { STATUSES, PRIORITIES } from '../core/types.js';

// --- JSON Conversion ---

/** Convert a Task to a stable JSON-serializable object. */
export function toTaskJson(task: Task): Record<string, unknown> {
  return {
    ref: task.ref,
    title: task.title,
    status: task.status,
    type: task.type,
    priority: task.priority,
    due: task.due ?? null,
    project: task.project ?? null,
    tags: task.tags,
    repeat: task.repeat ?? null,
    last_done: task.last_done ?? null,
    created: task.created,
    updated: task.updated,
    body: task.body,
  };
}

/** Convert a task list to structured JSON with count. */
export function toListJson(tasks: Task[]): Record<string, unknown> {
  return {
    tasks: tasks.map(toTaskJson),
    count: tasks.length,
  };
}

/** Convert a CompleteOutcome to structured JSON. */
export function toCompleteJson(outcome: CompleteOutcome): Record<string, unknown> {
  switch (outcome.kind) {
    case 'completed':
      return { kind: 'completed', ref: outcome.task.ref, status: outcome.task.status };
    case 'recurred':
      return { kind: 'recurred', ref: outcome.task.ref, status: outcome.task.status, nextDue: outcome.nextDue };
    case 'recurrence-ended':
      return { kind: 'recurrence-ended', ref: outcome.task.ref, status: outcome.task.status };
    case 'guard-blocked':
      return { kind: 'guard-blocked', blocking: outcome.blocking.map((t) => t.ref) };
  }
}

/** Convert an AppError to a structured error response. */
export function errorToStructured(e: AppError): Record<string, unknown> {
  switch (e.kind) {
    case 'not-found':
      return { error: 'not-found', message: e.message };
    case 'ambiguous':
      return { error: 'ambiguous', candidates: e.candidates ?? [], message: e.message };
    case 'invalid-repeat':
      return { error: 'invalid-repeat', reason: e.message };
    case 'guard-blocked':
      return { error: 'guard-blocked', message: e.message };
    case 'io':
      return { error: 'io', message: e.message };
    case 'config':
      return { error: 'config', message: e.message };
  }
}

// --- Tool Definitions (JSON Schema, no zod) ---

/** MCP tool definition shape. */
export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** All 10 MCP tools exposed by marktask. */
export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'marktask.create',
    description: 'Create a new task. Returns the created task.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title (required)' },
        due: { type: 'string', description: 'Due date YYYY-MM-DD (optional)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Priority level (default: medium)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags array (optional)' },
        project: { type: 'string', description: 'Project name (optional)' },
        repeat: { type: 'string', description: 'Recurrence rule string (optional, sets type=recurrence)' },
        parent: { type: 'string', description: 'Parent task wikilink e.g. "[[ref]]" (optional)' },
        body: { type: 'string', description: 'Markdown body content (optional)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'marktask.list',
    description: 'List tasks with optional filter and sort. Returns { tasks, count }.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'array', items: { type: 'string', enum: ['todo', 'in-progress', 'done', 'waiting', 'cancelled'] }, description: 'Filter by statuses' },
        priority: { type: 'array', items: { type: 'string', enum: ['low', 'medium', 'high'] }, description: 'Filter by priorities' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (AND — all must be present)' },
        project: { type: 'string', description: 'Filter by project name (exact match)' },
        dueBefore: { type: 'string', description: 'Filter tasks due on or before YYYY-MM-DD' },
        sortKey: { type: 'string', enum: ['due', 'priority', 'created', 'status'], description: 'Sort key (default: due)' },
        sortDir: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction (default: asc)' },
      },
      required: [],
    },
  },
  {
    name: 'marktask.get',
    description: 'Get a single task by ref (supports partial matching).',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Task reference (filename stem or partial match)' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'marktask.update',
    description: 'Update task metadata (due, priority, tags, project, repeat).',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Task reference' },
        due: { type: ['string', 'null'], description: 'Due date YYYY-MM-DD or null to clear' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'New priority' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Replace tags array' },
        project: { type: ['string', 'null'], description: 'Project name or null to clear' },
        repeat: { type: ['string', 'null'], description: 'Recurrence rule or null to clear' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'marktask.complete',
    description: 'Complete a task (done-branching: completed/recurred/recurrence-ended/guard-blocked).',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Task reference' },
        force: { type: 'boolean', description: 'Skip subtask guard (default: false)' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'marktask.state',
    description: 'Transition task to a new status (todo/in-progress/done/waiting/cancelled).',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Task reference' },
        status: { type: 'string', enum: ['todo', 'in-progress', 'done', 'waiting', 'cancelled'], description: 'Target status' },
      },
      required: ['ref', 'status'],
    },
  },
  {
    name: 'marktask.search',
    description: 'Search tasks by substring in title/body (case-insensitive).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'marktask.delete',
    description: 'Soft-delete a task (move to .trash/). Returns ref, status, and trash path for restore.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Task reference' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'marktask.archive',
    description: 'Archive a task (move to archiveDir/). Returns ref and archive path.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Task reference' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'marktask.recurrence_set',
    description: 'Set or clear the recurrence rule on a task. Pass repeat=null to clear.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Task reference' },
        repeat: { type: ['string', 'null'], description: 'Recurrence rule string or null to clear' },
      },
      required: ['ref'],
    },
  },
];

// --- Argument Validation Helpers ---

/**
 * Validate that a required string argument is present and non-empty.
 * Returns the string or an error object.
 */
function requireString(
  args: Record<string, unknown>,
  field: string,
): string | { error: 'invalid-input'; field: string; reason: string } {
  const val = args[field];
  if (val === undefined || val === null) {
    return { error: 'invalid-input', field, reason: 'required' };
  }
  if (typeof val !== 'string') {
    return { error: 'invalid-input', field, reason: `expected string, got ${typeof val}` };
  }
  if (val.trim().length === 0) {
    return { error: 'invalid-input', field, reason: 'must not be empty' };
  }
  return val;
}

/**
 * Validate an optional string argument (may be null to indicate "clear").
 * Returns the string, null, undefined (absent), or an error object.
 */
function optionalStringOrNull(
  args: Record<string, unknown>,
  field: string,
): string | null | undefined | { error: 'invalid-input'; field: string; reason: string } {
  const val = args[field];
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (typeof val !== 'string') {
    return { error: 'invalid-input', field, reason: `expected string or null, got ${typeof val}` };
  }
  return val;
}

/** Check if a value is a validation error. */
function isInputError(v: unknown): v is { error: 'invalid-input'; field: string; reason: string } {
  return typeof v === 'object' && v !== null && 'error' in v && (v as Record<string, unknown>)['error'] === 'invalid-input';
}

// --- Dispatch ---

/**
 * Dispatch an MCP tool call to the appropriate TaskService method.
 * Never throws — all errors are returned as structured objects.
 *
 * @param service - The shared TaskService instance.
 * @param name - Tool name (e.g. 'marktask.create').
 * @param rawArgs - Raw arguments from the MCP CallTool request.
 * @returns Structured JSON response (success or error).
 */
export async function dispatchTool(
  service: TaskService,
  name: string,
  rawArgs: unknown,
): Promise<Record<string, unknown>> {
  const args: Record<string, unknown> =
    rawArgs != null && typeof rawArgs === 'object' && !Array.isArray(rawArgs)
      ? (rawArgs as Record<string, unknown>)
      : {};

  try {
    switch (name) {
      case 'marktask.create':
        return await handleCreate(service, args);
      case 'marktask.list':
        return await handleList(service, args);
      case 'marktask.get':
        return await handleGet(service, args);
      case 'marktask.update':
        return await handleUpdate(service, args);
      case 'marktask.complete':
        return await handleComplete(service, args);
      case 'marktask.state':
        return await handleState(service, args);
      case 'marktask.search':
        return await handleSearch(service, args);
      case 'marktask.delete':
        return await handleDelete(service, args);
      case 'marktask.archive':
        return await handleArchive(service, args);
      case 'marktask.recurrence_set':
        return await handleRecurrenceSet(service, args);
      default:
        return { error: 'unknown-tool', name };
    }
  } catch (e: unknown) {
    // Safety net — should never reach here
    return { error: 'internal', message: e instanceof Error ? e.message : String(e) };
  }
}

// --- Individual Handlers ---

async function handleCreate(
  service: TaskService,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const title = requireString(args, 'title');
  if (isInputError(title)) return title;

  const result = await service.addTask({
    title,
    due: typeof args['due'] === 'string' ? args['due'] : undefined,
    priority: isValidPriority(args['priority']) ? args['priority'] : undefined,
    tags: Array.isArray(args['tags']) ? (args['tags'] as string[]) : undefined,
    project: typeof args['project'] === 'string' ? args['project'] : undefined,
    repeat: typeof args['repeat'] === 'string' ? args['repeat'] : undefined,
    parent: typeof args['parent'] === 'string' ? args['parent'] : undefined,
    body: typeof args['body'] === 'string' ? args['body'] : undefined,
  });

  if (!result.ok) return errorToStructured(result.error);
  return toTaskJson(result.value);
}

async function handleList(
  service: TaskService,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const filter: TaskFilter = {};

  if (Array.isArray(args['status'])) {
    const statuses = (args['status'] as unknown[]).filter(
      (s): s is Status => typeof s === 'string' && STATUSES.includes(s as Status),
    );
    if (statuses.length > 0) filter.status = statuses;
  }
  if (Array.isArray(args['priority'])) {
    const priorities = (args['priority'] as unknown[]).filter(
      (p): p is Priority => typeof p === 'string' && PRIORITIES.includes(p as Priority),
    );
    if (priorities.length > 0) filter.priority = priorities;
  }
  if (Array.isArray(args['tags'])) {
    filter.tags = (args['tags'] as unknown[]).filter((t): t is string => typeof t === 'string');
  }
  if (typeof args['project'] === 'string') {
    filter.project = args['project'];
  }
  if (typeof args['dueBefore'] === 'string') {
    filter.dueBefore = args['dueBefore'];
  }

  let sort: Sort | undefined;
  if (typeof args['sortKey'] === 'string' || typeof args['sortDir'] === 'string') {
    const key = isValidSortKey(args['sortKey']) ? args['sortKey'] : 'due';
    const dir = args['sortDir'] === 'desc' ? 'desc' : 'asc';
    sort = { key, dir };
  }

  const result = await service.list(
    Object.keys(filter).length > 0 ? filter : undefined,
    sort,
  );

  if (!result.ok) return errorToStructured(result.error);
  return toListJson(result.value);
}

async function handleGet(
  service: TaskService,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ref = requireString(args, 'ref');
  if (isInputError(ref)) return ref;

  const result = await service.getByRef(ref);
  if (!result.ok) return errorToStructured(result.error);
  return toTaskJson(result.value);
}

async function handleUpdate(
  service: TaskService,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ref = requireString(args, 'ref');
  if (isInputError(ref)) return ref;

  const patch: Record<string, unknown> = {};
  const due = optionalStringOrNull(args, 'due');
  if (isInputError(due)) return due;
  if (due !== undefined) patch['due'] = due;

  if (isValidPriority(args['priority'])) {
    patch['priority'] = args['priority'];
  }
  if (Array.isArray(args['tags'])) {
    patch['tags'] = (args['tags'] as unknown[]).filter((t): t is string => typeof t === 'string');
  }

  const project = optionalStringOrNull(args, 'project');
  if (isInputError(project)) return project;
  if (project !== undefined) patch['project'] = project;

  const repeat = optionalStringOrNull(args, 'repeat');
  if (isInputError(repeat)) return repeat;
  if (repeat !== undefined) patch['repeat'] = repeat;

  const result = await service.updateTask(ref, patch as Parameters<TaskService['updateTask']>[1]);
  if (!result.ok) return errorToStructured(result.error);
  return toTaskJson(result.value);
}

async function handleComplete(
  service: TaskService,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ref = requireString(args, 'ref');
  if (isInputError(ref)) return ref;

  const force = args['force'] === true;
  const result = await service.completeTask(ref, force ? { force: true } : undefined);
  if (!result.ok) return errorToStructured(result.error);
  return toCompleteJson(result.value);
}

async function handleState(
  service: TaskService,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ref = requireString(args, 'ref');
  if (isInputError(ref)) return ref;

  const status = requireString(args, 'status');
  if (isInputError(status)) return status;

  if (!STATUSES.includes(status as Status)) {
    return { error: 'invalid-input', field: 'status', reason: `must be one of: ${STATUSES.join(', ')}` };
  }

  const result = await service.changeState(ref, status as Status);
  if (!result.ok) return errorToStructured(result.error);
  return toTaskJson(result.value);
}

async function handleSearch(
  service: TaskService,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const query = requireString(args, 'query');
  if (isInputError(query)) return query;

  const result = await service.search(query);
  if (!result.ok) return errorToStructured(result.error);
  return toListJson(result.value);
}

async function handleDelete(
  service: TaskService,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ref = requireString(args, 'ref');
  if (isInputError(ref)) return ref;

  const result = service.softDelete(ref);
  if (!result.ok) return errorToStructured(result.error);
  return { ref: result.value.ref, status: 'deleted', trash: result.value.trashPath };
}

async function handleArchive(
  service: TaskService,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ref = requireString(args, 'ref');
  if (isInputError(ref)) return ref;

  const result = service.archive(ref);
  if (!result.ok) return errorToStructured(result.error);
  return { ref: result.value.ref, status: 'archived', archivePath: result.value.archivePath };
}

async function handleRecurrenceSet(
  service: TaskService,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ref = requireString(args, 'ref');
  if (isInputError(ref)) return ref;

  // repeat is required for this tool (null means clear)
  const repeatVal = args['repeat'];
  let repeat: string | null;
  if (repeatVal === null || repeatVal === undefined) {
    repeat = null;
  } else if (typeof repeatVal === 'string') {
    repeat = repeatVal;
  } else {
    return { error: 'invalid-input', field: 'repeat', reason: `expected string or null, got ${typeof repeatVal}` };
  }

  const result = await service.setRecurrence(ref, repeat);
  if (!result.ok) return errorToStructured(result.error);
  return toTaskJson(result.value);
}

// --- Type Guards ---

function isValidPriority(v: unknown): v is Priority {
  return typeof v === 'string' && PRIORITIES.includes(v as Priority);
}

function isValidSortKey(v: unknown): v is Sort['key'] {
  return typeof v === 'string' && ['due', 'priority', 'created', 'status'].includes(v);
}
