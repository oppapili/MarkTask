/**
 * Recurrence engine for MarkTask.
 * Parses the `repeat` frontmatter field (proprietary concise grammar),
 * computes next-due dates (schedule-based with missed-skip), and
 * rolls forward a task on completion.
 *
 * Pure module — no I/O, no mutation of input, no persistence.
 * Depends only on date-fns for date arithmetic.
 *
 * Ref: domain-entities.md, business-rules.md (FR-E1–E6, R1–R12).
 */

import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  lastDayOfMonth,
  getDaysInMonth,
  getDay,
  parseISO,
  format,
  isAfter,
} from 'date-fns';
import type { Task, Result, AppError } from './types.js';
import { ok, err, appError } from './types.js';
import type { CompleteOutcome, RecurrenceRoller } from './state-machine.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Base pattern of a recurrence rule. */
export type RecurrenceBase =
  | { kind: 'interval'; n: number; unit: 'day' | 'week' | 'month' | 'year' }
  | { kind: 'weekly-days'; weekdays: number[] }
  | { kind: 'monthly-day'; day: number | 'last' };

/** End condition(s) for a recurrence rule. */
export interface RecurrenceEnd {
  until?: string;
  count?: number;
}

/**
 * Parsed recurrence rule — the structured representation of the `repeat`
 * frontmatter field's proprietary concise grammar.
 */
export interface RecurrenceRule {
  base: RecurrenceBase;
  end?: RecurrenceEnd;
}

// ---------------------------------------------------------------------------
// Weekday mapping
// ---------------------------------------------------------------------------

/** Map abbreviated weekday names to JS getDay() values (0=Sun..6=Sat). */
const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const UNIT_ALIASES: Record<string, 'day' | 'week' | 'month' | 'year'> = {
  day: 'day',
  days: 'day',
  week: 'week',
  weeks: 'week',
  month: 'month',
  months: 'month',
  year: 'year',
  years: 'year',
};

// ---------------------------------------------------------------------------
// Parser helpers
// ---------------------------------------------------------------------------

const INVALID_HINT =
  ' — see README for repeat syntax (e.g. "every 2 weeks", "every mon,fri", "every month on 15")';

/**
 * Normalize raw repeat string: lowercase, collapse whitespace, trim.
 */
function normalize(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Extract trailing terminator tokens (`until YYYY-MM-DD` and/or `xN`)
 * from the normalized body. Returns the body stripped of terminators and
 * the parsed end condition.
 */
function extractEnd(body: string): { core: string; end?: RecurrenceEnd } {
  let core = body;
  const end: RecurrenceEnd = {};

  // Match `xN` at end (must be preceded by space)
  const xnMatch = core.match(/\s+x(\d+)$/);
  if (xnMatch && xnMatch[1] !== undefined) {
    end.count = parseInt(xnMatch[1], 10);
    core = core.slice(0, xnMatch.index!);
  }

  // Match `until YYYY-MM-DD` at end
  const untilMatch = core.match(/\s+until\s+(\d{4}-\d{2}-\d{2})$/);
  if (untilMatch && untilMatch[1] !== undefined) {
    end.until = untilMatch[1];
    core = core.slice(0, untilMatch.index!);
  }

  const hasEnd = end.until !== undefined || end.count !== undefined;
  return { core, end: hasEnd ? end : undefined };
}

// ---------------------------------------------------------------------------
// parse()
// ---------------------------------------------------------------------------

/**
 * Parse a `repeat` frontmatter string into a structured RecurrenceRule.
 *
 * Grammar (case-insensitive, whitespace-normalized):
 * - `every N days|weeks|months|years`
 * - `every <weekday(s)>` (mon,tue,...,sun — comma-separated)
 * - `every month on <1-31|last>`
 * - Keywords: `daily` | `weekly` | `monthly` | `yearly`
 * - Optional trailing: `until YYYY-MM-DD` and/or `xN`
 *
 * @param repeat - Raw repeat string from frontmatter.
 * @returns Parsed rule on success, or AppError with kind 'invalid-repeat'.
 */
export function parse(repeat: string): Result<RecurrenceRule, AppError> {
  if (!repeat || !repeat.trim()) {
    return err(
      appError('invalid-repeat', `Empty repeat string${INVALID_HINT}`),
    );
  }

  const normalized = normalize(repeat);
  const { core, end } = extractEnd(normalized);

  // --- Keyword sugar ---
  if (core === 'daily') {
    return ok({ base: { kind: 'interval', n: 1, unit: 'day' }, end });
  }
  if (core === 'weekly') {
    return ok({ base: { kind: 'interval', n: 1, unit: 'week' }, end });
  }
  if (core === 'monthly') {
    return ok({ base: { kind: 'interval', n: 1, unit: 'month' }, end });
  }
  if (core === 'yearly') {
    return ok({ base: { kind: 'interval', n: 1, unit: 'year' }, end });
  }

  // --- "every ..." patterns ---
  if (!core.startsWith('every ')) {
    return err(
      appError(
        'invalid-repeat',
        `Unrecognized repeat format: "${repeat}"${INVALID_HINT}`,
      ),
    );
  }

  const afterEvery = core.slice(6).trim(); // everything after "every "

  // "every month on <day|last>"
  const monthOnMatch = afterEvery.match(/^month\s+on\s+(.+)$/);
  if (monthOnMatch && monthOnMatch[1] !== undefined) {
    const dayStr = monthOnMatch[1].trim();
    if (dayStr === 'last') {
      return ok({ base: { kind: 'monthly-day', day: 'last' }, end });
    }
    const dayNum = parseInt(dayStr, 10);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return err(
        appError(
          'invalid-repeat',
          `Invalid day "${dayStr}" in "every month on ..." (must be 1-31 or "last")${INVALID_HINT}`,
        ),
      );
    }
    return ok({ base: { kind: 'monthly-day', day: dayNum }, end });
  }

  // "every N days|weeks|months|years"
  const intervalMatch = afterEvery.match(/^(\d+)\s+(.+)$/);
  if (intervalMatch && intervalMatch[1] !== undefined && intervalMatch[2] !== undefined) {
    const n = parseInt(intervalMatch[1], 10);
    const unitRaw = intervalMatch[2].trim();
    const unit = UNIT_ALIASES[unitRaw];
    if (!unit) {
      return err(
        appError(
          'invalid-repeat',
          `Unknown unit "${unitRaw}" in "${repeat}"${INVALID_HINT}`,
        ),
      );
    }
    if (n < 1) {
      return err(
        appError(
          'invalid-repeat',
          `Interval must be >= 1, got ${n}${INVALID_HINT}`,
        ),
      );
    }
    return ok({ base: { kind: 'interval', n, unit }, end });
  }

  // "every <weekday(s)>" — comma-separated weekdays
  const weekdayTokens = afterEvery.split(',').map((s) => s.trim());
  const weekdays: number[] = [];
  for (const token of weekdayTokens) {
    const mapped = WEEKDAY_MAP[token];
    if (mapped === undefined) {
      return err(
        appError(
          'invalid-repeat',
          `Unknown weekday "${token}" in "${repeat}"${INVALID_HINT}`,
        ),
      );
    }
    weekdays.push(mapped);
  }
  if (weekdays.length === 0) {
    return err(
      appError(
        'invalid-repeat',
        `No weekdays specified in "${repeat}"${INVALID_HINT}`,
      ),
    );
  }
  // Sort for deterministic behaviour
  weekdays.sort((a, b) => a - b);
  return ok({ base: { kind: 'weekly-days', weekdays }, end });
}

// ---------------------------------------------------------------------------
// stepOnce / nextDue
// ---------------------------------------------------------------------------

/**
 * Advance one recurrence step from a given date.
 * Returns the NEXT occurrence strictly after `from`.
 *
 * @param rule - Parsed recurrence rule.
 * @param from - The date to step forward from.
 * @returns The next occurrence date.
 */
export function stepOnce(rule: RecurrenceRule, from: Date): Date {
  const { base } = rule;

  switch (base.kind) {
    case 'interval': {
      switch (base.unit) {
        case 'day':
          return addDays(from, base.n);
        case 'week':
          return addWeeks(from, base.n);
        case 'month':
          return addMonths(from, base.n);
        case 'year':
          return addYears(from, base.n);
      }
      break;
    }

    case 'weekly-days': {
      // Find the nearest matching weekday STRICTLY AFTER `from`.
      const fromDay = getDay(from); // 0=Sun..6=Sat
      // Calculate days until each target weekday from tomorrow onward
      let minDaysAhead = 8; // sentinel > 7
      for (const wd of base.weekdays) {
        let diff = wd - fromDay;
        if (diff <= 0) {
          diff += 7; // wrap to next week
        }
        if (diff < minDaysAhead) {
          minDaysAhead = diff;
        }
      }
      return addDays(from, minDaysAhead);
    }

    case 'monthly-day': {
      // Next month from `from`, clamped to month-end
      const nextMonth = addMonths(from, 1);
      if (base.day === 'last') {
        return lastDayOfMonth(nextMonth);
      }
      const daysInMonth = getDaysInMonth(nextMonth);
      const clampedDay = Math.min(base.day, daysInMonth);
      // Set the day on nextMonth
      const year = nextMonth.getFullYear();
      const month = nextMonth.getMonth();
      return new Date(year, month, clampedDay);
    }
  }

  // Unreachable if all cases handled, but TypeScript exhaustiveness
  return addDays(from, 1);
}

/**
 * Compute the next due date from a previous due date, skipping missed
 * occurrences so the result is strictly in the future relative to `today`.
 *
 * Returns `null` if the rule's `until` date has been exceeded (terminated).
 *
 * @param rule - Parsed recurrence rule.
 * @param prevDue - The previous due date to advance from.
 * @param today - Reference date for "now" (defaults to current date; pass explicit for deterministic tests).
 * @returns Next due date, or null if recurrence terminated.
 */
export function nextDue(
  rule: RecurrenceRule,
  prevDue: Date,
  today: Date = new Date(),
): Date | null {
  let next = stepOnce(rule, prevDue);

  // Missed-skip: advance until next > today
  while (next <= today) {
    next = stepOnce(rule, next);
  }

  // Check `until` termination
  if (rule.end?.until) {
    const untilDate = parseISO(rule.end.until);
    if (isAfter(next, untilDate)) {
      return null;
    }
  }

  return next;
}

// ---------------------------------------------------------------------------
// Roll-forward helpers
// ---------------------------------------------------------------------------

/**
 * Strip the `xN` token from a repeat string (e.g. "every 1 week x3" -> "every 1 week").
 */
export function stripCount(repeat: string): string {
  return repeat.replace(/\s+x\d+$/i, '').trim();
}

/**
 * Decrement the count in the `xN` token (e.g. "every 1 week x3" -> "every 1 week x2").
 */
export function decrementCount(repeat: string): string {
  return repeat.replace(/\s+x(\d+)$/i, (_match, n) => {
    const newCount = parseInt(n, 10) - 1;
    return ` x${newCount}`;
  });
}

// ---------------------------------------------------------------------------
// RecurrenceEngine (implements RecurrenceRoller)
// ---------------------------------------------------------------------------

/**
 * Recurrence engine — implements the `RecurrenceRoller` interface from
 * state-machine.ts. Pure: returns a new Task, never mutates input, no I/O.
 */
export class RecurrenceEngine implements RecurrenceRoller {
  /**
   * Roll a recurring task forward on completion.
   *
   * - If the repeat string is invalid, returns an error.
   * - If xN count <= 1, terminates the recurrence (recurrence-ended).
   * - If `until` date exceeded, terminates the recurrence.
   * - Otherwise, advances due date and resets status to 'todo' (recurred).
   *
   * @param task - The task being completed (not mutated).
   * @returns Result with CompleteOutcome ('recurred' or 'recurrence-ended').
   */
  rollForward(task: Task): Result<CompleteOutcome, AppError> {
    if (!task.repeat || !task.repeat.trim()) {
      return err(
        appError(
          'invalid-repeat',
          `Task "${task.ref}" has no repeat rule${INVALID_HINT}`,
        ),
      );
    }

    const parsed = parse(task.repeat);
    if (!parsed.ok) {
      return parsed;
    }
    const rule = parsed.value;

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // --- xN terminal check (count <= 1 means this is the last occurrence) ---
    if (rule.end?.count != null && rule.end.count <= 1) {
      const newTask: Task = {
        ...task,
        status: 'done',
        last_done: todayStr,
        repeat: stripCount(task.repeat),
        updated: new Date().toISOString(),
      };
      return ok({ kind: 'recurrence-ended', task: newTask });
    }

    // --- Compute next due ---
    const today = new Date();
    const baseDate = task.due ? parseISO(task.due) : today;
    const next = nextDue(rule, baseDate, today);

    if (next === null) {
      // Until date exceeded — terminate
      const newTask: Task = {
        ...task,
        status: 'done',
        last_done: todayStr,
        updated: new Date().toISOString(),
      };
      return ok({ kind: 'recurrence-ended', task: newTask });
    }

    // --- Normal recurrence: advance due, reset status ---
    const nextDueStr = format(next, 'yyyy-MM-dd');
    const newRepeat =
      rule.end?.count != null && rule.end.count > 1
        ? decrementCount(task.repeat)
        : task.repeat;

    const newTask: Task = {
      ...task,
      due: nextDueStr,
      status: 'todo',
      last_done: todayStr,
      repeat: newRepeat,
      updated: new Date().toISOString(),
    };
    return ok({ kind: 'recurred', task: newTask, nextDue: nextDueStr });
  }
}

// ---------------------------------------------------------------------------
// describe()
// ---------------------------------------------------------------------------

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Generate a human-readable summary of a RecurrenceRule.
 * Used for CLI display and error hints.
 *
 * @param rule - Parsed recurrence rule.
 * @returns Concise description (e.g. "every 2 weeks", "every Mon, Thu").
 */
export function describe(rule: RecurrenceRule): string {
  const { base, end } = rule;
  let desc: string;

  switch (base.kind) {
    case 'interval':
      desc =
        base.n === 1
          ? `every ${base.unit}`
          : `every ${base.n} ${base.unit}s`;
      break;
    case 'weekly-days':
      desc = `every ${base.weekdays.map((d) => WEEKDAY_NAMES[d]).join(', ')}`;
      break;
    case 'monthly-day':
      desc =
        base.day === 'last'
          ? 'every month on last day'
          : `every month on day ${base.day}`;
      break;
  }

  if (end?.count != null) {
    desc += ` (${end.count} remaining)`;
  }
  if (end?.until) {
    desc += ` (until ${end.until})`;
  }

  return desc;
}
