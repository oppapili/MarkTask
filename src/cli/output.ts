/**
 * OutputFormatter — CLI rendering for MarkTask.
 * Status symbols are distinguishable without color (accessibility).
 * Color is ANSI-only, gated on opts.color (no external dependency).
 *
 * Ref: refined-mockups, business-rules R4-R6.
 */

import { formatDistanceToNow, parseISO } from 'date-fns';
import type { Task, Status, Priority } from '../core/types.js';

// --- Render Options ---

/** Rendering options passed from CLI flags. */
export interface RenderOpts {
  /** Emit ANSI color codes (TTY && !--no-color) */
  color: boolean;
  /** Show dates as relative only (--relative) */
  relative: boolean;
  /** List format: table or compact */
  format: 'table' | 'compact';
  /** Terminal width for title truncation */
  width: number;
  /** Max number of tasks to display (--limit) */
  limit?: number;
}

// --- Status Symbols (accessible without color) ---

const STATUS_SYMBOLS: Record<Status, string> = {
  todo: '●',
  'in-progress': '◐',
  done: '✓',
  waiting: '◷',
  cancelled: '⊘',
};

// --- ANSI Color Helpers ---

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

const STATUS_COLORS: Record<Status, string> = {
  todo: '\x1b[37m', // white
  'in-progress': '\x1b[36m', // cyan
  done: '\x1b[32m', // green
  waiting: '\x1b[33m', // yellow
  cancelled: '\x1b[90m', // gray
};

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '\x1b[31m', // red
  medium: '\x1b[33m', // yellow
  low: '\x1b[90m', // gray
};

/**
 * Wrap text in ANSI color codes if color is enabled.
 */
function colorize(text: string, code: string, enabled: boolean): string {
  return enabled ? `${code}${text}${RESET}` : text;
}

// --- Date Formatting ---

/**
 * Format a due date for display.
 * Default: "YYYY-MM-DD (in N days)" or "YYYY-MM-DD (N days ago)".
 * Relative-only mode: "in N days" / "N days ago".
 */
export function formatDue(due: string | undefined, relative: boolean): string {
  if (!due) return '';
  try {
    const date = parseISO(due);
    const rel = formatDistanceToNow(date, { addSuffix: true });
    if (relative) return rel;
    return `${due} (${rel})`;
  } catch {
    return due;
  }
}

// --- Truncation ---

/**
 * Truncate a string to maxLen with ellipsis.
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  if (maxLen <= 1) return '…';
  return text.slice(0, maxLen - 1) + '…';
}

// --- Public API ---

/**
 * Render a list of tasks in table format.
 * Columns: STATUS  DUE  PRIORITY  TITLE
 */
export function renderList(tasks: Task[], opts: RenderOpts): string {
  const limited = opts.limit != null ? tasks.slice(0, opts.limit) : tasks;
  if (limited.length === 0) return 'No tasks found.';

  if (opts.format === 'compact') {
    return renderCompact(limited, opts);
  }

  // Column widths: status=3, due=12, priority=6, title=rest
  const statusW = 3;
  const dueW = opts.relative ? 16 : 22;
  const priorityW = 8;
  const separators = 3; // three spaces between columns
  const titleW = Math.max(10, opts.width - statusW - dueW - priorityW - separators);

  const lines = limited.map((task) => {
    const sym = STATUS_SYMBOLS[task.status];
    const statusCell = colorize(
      sym.padEnd(statusW),
      STATUS_COLORS[task.status],
      opts.color,
    );
    const dueStr = formatDue(task.due, opts.relative);
    const dueCell = truncate(dueStr, dueW).padEnd(dueW);
    const priCell = colorize(
      task.priority.padEnd(priorityW),
      PRIORITY_COLORS[task.priority],
      opts.color,
    );
    const titleCell = truncate(task.title, titleW);
    return `${statusCell} ${dueCell} ${priCell} ${titleCell}`;
  });

  return lines.join('\n');
}

/**
 * Render a compact list (one line per task: symbol + title).
 */
export function renderCompact(tasks: Task[], opts: RenderOpts): string {
  if (tasks.length === 0) return 'No tasks found.';
  const lines = tasks.map((task) => {
    const sym = STATUS_SYMBOLS[task.status];
    const colored = colorize(sym, STATUS_COLORS[task.status], opts.color);
    const dueHint = task.due ? ` [${task.due}]` : '';
    return `${colored} ${task.title}${dueHint}`;
  });
  return lines.join('\n');
}

/**
 * Render a single task in detail (frontmatter + body).
 */
export function renderTask(task: Task, opts: RenderOpts): string {
  const lines: string[] = [];
  const sym = STATUS_SYMBOLS[task.status];
  const header = `${sym} ${task.title}`;
  lines.push(colorize(header, BOLD, opts.color));
  lines.push('');
  lines.push(`  ref:      ${task.ref}`);
  lines.push(`  status:   ${task.status}`);
  lines.push(`  priority: ${task.priority}`);
  lines.push(`  type:     ${task.type}`);
  if (task.due) lines.push(`  due:      ${formatDue(task.due, opts.relative)}`);
  if (task.project) lines.push(`  project:  ${task.project}`);
  if (task.tags.length > 0) lines.push(`  tags:     ${task.tags.join(', ')}`);
  if (task.repeat) lines.push(`  repeat:   ${task.repeat}`);
  if (task.parent) lines.push(`  parent:   ${task.parent}`);
  lines.push(`  created:  ${task.created}`);
  lines.push(`  updated:  ${task.updated}`);
  if (task.last_done) lines.push(`  last_done: ${task.last_done}`);
  if (task.body.trim()) {
    lines.push('');
    lines.push(colorize('───', DIM, opts.color));
    lines.push(task.body.trim());
  }
  return lines.join('\n');
}

/**
 * Render a success/error message.
 * @param text - Message body.
 * @param kind - 'success' or 'error'.
 */
export function renderMessage(text: string, kind: 'success' | 'error'): string {
  const prefix = kind === 'success' ? '✓ ' : '✗ ';
  return `${prefix}${text}`;
}

/**
 * Render a state-change message: "ref status: old -> new".
 */
export function renderStateChange(ref: string, from: Status, to: Status): string {
  return renderMessage(`${ref} status: ${from} → ${to}`, 'success');
}

/**
 * Serialize data as stable-key JSON (no ANSI decoration).
 */
export function toJson(data: unknown): string {
  return JSON.stringify(data, Object.keys(data as object).sort(), 2);
}

/**
 * Serialize an array or primitive as JSON.
 */
export function toJsonRaw(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
