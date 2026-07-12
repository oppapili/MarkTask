/**
 * FrontmatterCodec — decode/encode task Markdown files.
 * Uses gray-matter for frontmatter extraction.
 * Preserves unknown fields in `raw` (INV2, NFR-2).
 * Missing frontmatter is valid — returns empty known fields (SEC-6).
 * Ref: business-logic-model.md §4
 */

import matter from 'gray-matter';
import type { Task, Status, Priority, TaskType } from './types.js';
import { STATUSES, PRIORITIES, TASK_TYPES } from './types.js';

/** Known frontmatter field names that map to Task properties */
const KNOWN_FIELDS = new Set([
  'tags',
  'created',
  'updated',
  'type',
  'status',
  'priority',
  'project',
  'due',
  'repeat',
  'parent',
  'last_done',
]);

/**
 * Derive a human-readable title from a filename stem (ref).
 * Strips the leading date prefix (YYYYMMDD-) and converts hyphens to spaces.
 */
export function titleFromRef(ref: string): string {
  // Strip leading date pattern: 8 digits followed by a hyphen
  const withoutDate = ref.replace(/^\d{8}-/, '');
  return withoutDate.replace(/-/g, ' ');
}

/**
 * Decode raw file content into a Task.
 * `ref` is the filename stem (without .md extension).
 * Missing frontmatter → all known fields use defaults.
 */
export function decode(content: string, ref: string): Task {
  const { data, content: body } = matter(content);
  const fm = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  // Extract known fields with type coercion
  const tags = Array.isArray(fm['tags'])
    ? (fm['tags'] as unknown[]).filter((t): t is string => typeof t === 'string')
    : [];
  const created = typeof fm['created'] === 'string' ? fm['created'] : '';
  const updated = typeof fm['updated'] === 'string' ? fm['updated'] : '';
  const type: TaskType =
    typeof fm['type'] === 'string' && TASK_TYPES.includes(fm['type'] as TaskType)
      ? (fm['type'] as TaskType)
      : 'task';
  const status: Status =
    typeof fm['status'] === 'string' && STATUSES.includes(fm['status'] as Status)
      ? (fm['status'] as Status)
      : 'todo';
  const priority: Priority =
    typeof fm['priority'] === 'string' && PRIORITIES.includes(fm['priority'] as Priority)
      ? (fm['priority'] as Priority)
      : 'medium';
  const project = typeof fm['project'] === 'string' ? fm['project'] : undefined;
  const due = typeof fm['due'] === 'string' ? fm['due'] : undefined;
  const repeat = typeof fm['repeat'] === 'string' ? fm['repeat'] : undefined;
  const parent = typeof fm['parent'] === 'string' ? fm['parent'] : undefined;
  const last_done = typeof fm['last_done'] === 'string' ? fm['last_done'] : undefined;

  // Build raw map preserving unknown fields
  const raw: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(fm)) {
    if (!KNOWN_FIELDS.has(key)) {
      raw[key] = val;
    }
  }

  return {
    ref,
    title: titleFromRef(ref),
    body: body.trim(),
    tags,
    created,
    updated,
    type,
    status,
    priority,
    project,
    due,
    repeat,
    parent,
    last_done,
    raw,
  };
}

/**
 * Encode a Task back to a Markdown string with frontmatter.
 * Merges unknown fields from `raw` back into frontmatter (INV2).
 */
export function encode(task: Task): string {
  // Build frontmatter data: merge raw (unknown) with known fields
  const known: Record<string, unknown> = {};

  // Only write non-default/non-empty known fields
  if (task.tags.length > 0) known['tags'] = task.tags;
  if (task.created) known['created'] = task.created;
  if (task.updated) known['updated'] = task.updated;
  known['type'] = task.type;
  known['status'] = task.status;
  known['priority'] = task.priority;
  if (task.project) known['project'] = task.project;
  if (task.due) known['due'] = task.due;
  if (task.repeat) known['repeat'] = task.repeat;
  if (task.parent) known['parent'] = task.parent;
  if (task.last_done) known['last_done'] = task.last_done;

  // Merge: raw (unknown) first, then known fields overwrite
  const merged = { ...task.raw, ...known };

  return matter.stringify(task.body ? `\n${task.body}\n` : '\n', merged);
}
