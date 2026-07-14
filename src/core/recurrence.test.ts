/**
 * Unit tests for the recurrence engine (U-recurrence).
 * Thick date-boundary coverage: month-end clamp, leap year,
 * week-crossing, missed-skip, until/xN termination.
 */

import { describe, test, expect } from 'bun:test';
import type { Task } from './types.js';
import {
  parse,
  stepOnce,
  nextDue,
  stripCount,
  decrementCount,
  RecurrenceEngine,
  describe as describeRule,
} from './recurrence.js';
import type { RecurrenceRule } from './recurrence.js';
import { complete } from './state-machine.js';

// --- Fixture Factory ---

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    ref: '20260712-recurring-task',
    title: 'recurring task',
    body: '',
    tags: [],
    created: '2026-07-12T00:00:00.000Z',
    updated: '2026-07-12T00:00:00.000Z',
    type: 'recurrence',
    status: 'todo',
    priority: 'medium',
    project: undefined,
    due: '2026-07-12',
    repeat: 'every 1 week',
    parent: undefined,
    last_done: undefined,
    raw: {},
    ...overrides,
  };
}

// ===========================================================================
// parse()
// ===========================================================================

describe('parse', () => {
  describe('interval patterns', () => {
    test('every 1 day', () => {
      const r = parse('every 1 day');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'interval', n: 1, unit: 'day' });
      }
    });

    test('every 2 weeks', () => {
      const r = parse('every 2 weeks');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'interval', n: 2, unit: 'week' });
      }
    });

    test('every 3 months', () => {
      const r = parse('every 3 months');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'interval', n: 3, unit: 'month' });
      }
    });

    test('every 1 year', () => {
      const r = parse('every 1 year');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'interval', n: 1, unit: 'year' });
      }
    });

    test('normalizes extra whitespace and case', () => {
      const r = parse('  Every   2   Weeks  ');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'interval', n: 2, unit: 'week' });
      }
    });
  });

  describe('keyword sugar', () => {
    test('daily', () => {
      const r = parse('daily');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'interval', n: 1, unit: 'day' });
      }
    });

    test('weekly', () => {
      const r = parse('weekly');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'interval', n: 1, unit: 'week' });
      }
    });

    test('monthly', () => {
      const r = parse('monthly');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'interval', n: 1, unit: 'month' });
      }
    });

    test('yearly', () => {
      const r = parse('yearly');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'interval', n: 1, unit: 'year' });
      }
    });
  });

  describe('weekday patterns', () => {
    test('every mon', () => {
      const r = parse('every mon');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'weekly-days', weekdays: [1] });
      }
    });

    test('every mon,thu (multiple weekdays)', () => {
      const r = parse('every mon,thu');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'weekly-days', weekdays: [1, 4] });
      }
    });

    test('every sat,sun sorted', () => {
      const r = parse('every sun,sat');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'weekly-days', weekdays: [0, 6] });
      }
    });

    test('every fri', () => {
      const r = parse('every fri');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'weekly-days', weekdays: [5] });
      }
    });
  });

  describe('monthly-day patterns', () => {
    test('every month on 15', () => {
      const r = parse('every month on 15');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'monthly-day', day: 15 });
      }
    });

    test('every month on last', () => {
      const r = parse('every month on last');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'monthly-day', day: 'last' });
      }
    });

    test('every month on 31', () => {
      const r = parse('every month on 31');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'monthly-day', day: 31 });
      }
    });
  });

  describe('terminators', () => {
    test('until date', () => {
      const r = parse('every 1 week until 2026-12-31');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.end).toEqual({ until: '2026-12-31' });
      }
    });

    test('xN count', () => {
      const r = parse('every 1 month x5');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.end).toEqual({ count: 5 });
      }
    });

    test('until + xN combined', () => {
      const r = parse('every 2 weeks until 2027-06-01 x10');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'interval', n: 2, unit: 'week' });
        expect(r.value.end).toEqual({ until: '2027-06-01', count: 10 });
      }
    });

    test('keyword with xN', () => {
      const r = parse('daily x3');
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value.base).toEqual({ kind: 'interval', n: 1, unit: 'day' });
        expect(r.value.end).toEqual({ count: 3 });
      }
    });
  });

  describe('invalid inputs', () => {
    test('empty string', () => {
      const r = parse('');
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.kind).toBe('invalid-repeat');
      }
    });

    test('whitespace only', () => {
      const r = parse('   ');
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.kind).toBe('invalid-repeat');
      }
    });

    test('unknown format', () => {
      const r = parse('sometime next week');
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.kind).toBe('invalid-repeat');
      }
    });

    test('unknown weekday', () => {
      const r = parse('every funday');
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.kind).toBe('invalid-repeat');
      }
    });

    test('unknown unit', () => {
      const r = parse('every 2 fortnights');
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.kind).toBe('invalid-repeat');
      }
    });

    test('invalid day in monthly-day', () => {
      const r = parse('every month on 32');
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.kind).toBe('invalid-repeat');
      }
    });

    test('day 0 in monthly-day', () => {
      const r = parse('every month on 0');
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.kind).toBe('invalid-repeat');
      }
    });
  });
});

// ===========================================================================
// stepOnce() + nextDue()
// ===========================================================================

describe('stepOnce', () => {
  test('interval day adds N days', () => {
    const rule: RecurrenceRule = { base: { kind: 'interval', n: 3, unit: 'day' } };
    const from = new Date(2026, 6, 10); // Jul 10
    const result = stepOnce(rule, from);
    expect(result).toEqual(new Date(2026, 6, 13)); // Jul 13
  });

  test('interval week adds N weeks', () => {
    const rule: RecurrenceRule = { base: { kind: 'interval', n: 2, unit: 'week' } };
    const from = new Date(2026, 6, 10); // Jul 10 (Thu)
    const result = stepOnce(rule, from);
    expect(result).toEqual(new Date(2026, 6, 24)); // Jul 24
  });

  test('interval month adds N months', () => {
    const rule: RecurrenceRule = { base: { kind: 'interval', n: 1, unit: 'month' } };
    const from = new Date(2026, 0, 31); // Jan 31
    const result = stepOnce(rule, from);
    // date-fns addMonths(Jan 31, 1) -> Feb 28 (2026 not leap)
    expect(result).toEqual(new Date(2026, 1, 28));
  });

  test('interval year adds N years', () => {
    const rule: RecurrenceRule = { base: { kind: 'interval', n: 1, unit: 'year' } };
    const from = new Date(2024, 1, 29); // Feb 29 2024 (leap)
    const result = stepOnce(rule, from);
    // date-fns addYears(2024-02-29, 1) -> 2025-02-28
    expect(result).toEqual(new Date(2025, 1, 28));
  });

  test('weekly-days picks nearest future weekday (not same day)', () => {
    // from = Wednesday (3), target = [1 (Mon), 3 (Wed)]
    // Next after Wed: Mon (5 days ahead)
    const rule: RecurrenceRule = { base: { kind: 'weekly-days', weekdays: [1, 3] } };
    const from = new Date(2026, 6, 8); // Wed Jul 8
    const result = stepOnce(rule, from);
    // Next Mon = Jul 13
    expect(result).toEqual(new Date(2026, 6, 13));
  });

  test('weekly-days from Saturday to Monday', () => {
    const rule: RecurrenceRule = { base: { kind: 'weekly-days', weekdays: [1] } };
    const from = new Date(2026, 6, 11); // Sat Jul 11
    const result = stepOnce(rule, from);
    // Next Mon = Jul 13
    expect(result).toEqual(new Date(2026, 6, 13));
  });

  test('weekly-days from Sunday picks nearest (Mon)', () => {
    const rule: RecurrenceRule = { base: { kind: 'weekly-days', weekdays: [1] } };
    const from = new Date(2026, 6, 12); // Sun Jul 12
    const result = stepOnce(rule, from);
    expect(result).toEqual(new Date(2026, 6, 13)); // Mon Jul 13
  });

  test('monthly-day last gives last day of next month', () => {
    const rule: RecurrenceRule = { base: { kind: 'monthly-day', day: 'last' } };
    const from = new Date(2026, 0, 15); // Jan 15
    const result = stepOnce(rule, from);
    // Feb 2026 last day = 28
    expect(result).toEqual(new Date(2026, 1, 28));
  });

  test('monthly-day 31 clamped to Feb 28 (non-leap)', () => {
    const rule: RecurrenceRule = { base: { kind: 'monthly-day', day: 31 } };
    const from = new Date(2026, 0, 31); // Jan 31
    const result = stepOnce(rule, from);
    expect(result).toEqual(new Date(2026, 1, 28)); // Feb 28
  });

  test('monthly-day 31 clamped to Feb 29 (leap year 2024)', () => {
    const rule: RecurrenceRule = { base: { kind: 'monthly-day', day: 31 } };
    const from = new Date(2024, 0, 31); // Jan 31 2024
    const result = stepOnce(rule, from);
    expect(result).toEqual(new Date(2024, 1, 29)); // Feb 29 2024
  });

  test('monthly-day 31 clamped to Apr 30', () => {
    const rule: RecurrenceRule = { base: { kind: 'monthly-day', day: 31 } };
    const from = new Date(2026, 2, 31); // Mar 31
    const result = stepOnce(rule, from);
    expect(result).toEqual(new Date(2026, 3, 30)); // Apr 30
  });

  test('monthly-day 15 no clamp needed', () => {
    const rule: RecurrenceRule = { base: { kind: 'monthly-day', day: 15 } };
    const from = new Date(2026, 5, 15); // Jun 15
    const result = stepOnce(rule, from);
    expect(result).toEqual(new Date(2026, 6, 15)); // Jul 15
  });
});

describe('nextDue', () => {
  test('basic interval step from prevDue', () => {
    const rule: RecurrenceRule = { base: { kind: 'interval', n: 1, unit: 'week' } };
    const prevDue = new Date(2026, 6, 5); // Jul 5
    const today = new Date(2026, 6, 6); // Jul 6
    const result = nextDue(rule, prevDue, today);
    expect(result).toEqual(new Date(2026, 6, 12)); // Jul 12
  });

  test('missed-skip: prevDue far in past skips to future', () => {
    const rule: RecurrenceRule = { base: { kind: 'interval', n: 1, unit: 'week' } };
    const prevDue = new Date(2026, 0, 1); // Jan 1
    const today = new Date(2026, 6, 10); // Jul 10
    const result = nextDue(rule, prevDue, today);
    // Should skip all past weeks and land on first week after Jul 10
    expect(result!.getTime()).toBeGreaterThan(today.getTime());
    // Specifically: Jan 1 + N weeks until > Jul 10 = Jul 16 (Thu, since Jan 1 is Thu)
    expect(result).toEqual(new Date(2026, 6, 16));
  });

  test('missed-skip with daily interval (heavy delay)', () => {
    const rule: RecurrenceRule = { base: { kind: 'interval', n: 1, unit: 'day' } };
    const prevDue = new Date(2026, 0, 1); // Jan 1
    const today = new Date(2026, 6, 10); // Jul 10
    const result = nextDue(rule, prevDue, today);
    // Should be Jul 11 (first day after today)
    expect(result).toEqual(new Date(2026, 6, 11));
  });

  test('until exceeded returns null', () => {
    const rule: RecurrenceRule = {
      base: { kind: 'interval', n: 1, unit: 'month' },
      end: { until: '2026-06-01' },
    };
    const prevDue = new Date(2026, 5, 1); // Jun 1
    const today = new Date(2026, 5, 15); // Jun 15
    const result = nextDue(rule, prevDue, today);
    // Next would be Jul 1, which is after until=Jun 1
    expect(result).toBeNull();
  });

  test('until not yet exceeded returns date', () => {
    const rule: RecurrenceRule = {
      base: { kind: 'interval', n: 1, unit: 'week' },
      end: { until: '2026-12-31' },
    };
    const prevDue = new Date(2026, 6, 5);
    const today = new Date(2026, 6, 6);
    const result = nextDue(rule, prevDue, today);
    expect(result).toEqual(new Date(2026, 6, 12));
  });

  test('weekday week-crossing: every mon from Wednesday', () => {
    const rule: RecurrenceRule = { base: { kind: 'weekly-days', weekdays: [1] } };
    const prevDue = new Date(2026, 6, 8); // Wed Jul 8
    const today = new Date(2026, 6, 8);
    const result = nextDue(rule, prevDue, today);
    // Next Mon after Wed Jul 8 = Mon Jul 13
    expect(result).toEqual(new Date(2026, 6, 13));
  });

  test('month-end clamp chain: every month on 31 from Jan -> Feb -> Mar', () => {
    const rule: RecurrenceRule = { base: { kind: 'monthly-day', day: 31 } };
    const prevDue = new Date(2026, 0, 31); // Jan 31
    const today = new Date(2026, 0, 31);
    const result = nextDue(rule, prevDue, today);
    // Feb 28 <= today(Jan 31)? No, Feb 28 > Jan 31, so result = Feb 28
    expect(result).toEqual(new Date(2026, 1, 28));
  });

  test('leap year: every month on 29 from Jan 2024', () => {
    const rule: RecurrenceRule = { base: { kind: 'monthly-day', day: 29 } };
    const prevDue = new Date(2024, 0, 29); // Jan 29 2024
    const today = new Date(2024, 0, 30);
    const result = nextDue(rule, prevDue, today);
    // Feb 2024 has 29 days (leap) -> Feb 29
    expect(result).toEqual(new Date(2024, 1, 29));
  });

  test('non-leap year: every month on 29 from Jan 2025', () => {
    const rule: RecurrenceRule = { base: { kind: 'monthly-day', day: 29 } };
    const prevDue = new Date(2025, 0, 29); // Jan 29 2025
    const today = new Date(2025, 0, 30);
    const result = nextDue(rule, prevDue, today);
    // Feb 2025 has 28 days -> clamped to Feb 28
    expect(result).toEqual(new Date(2025, 1, 28));
  });
});

// ===========================================================================
// stripCount / decrementCount helpers
// ===========================================================================

describe('stripCount', () => {
  test('removes xN from end', () => {
    expect(stripCount('every 1 week x3')).toBe('every 1 week');
  });

  test('handles x1', () => {
    expect(stripCount('daily x1')).toBe('daily');
  });

  test('no xN returns unchanged', () => {
    expect(stripCount('every 2 months')).toBe('every 2 months');
  });
});

describe('decrementCount', () => {
  test('x3 -> x2', () => {
    expect(decrementCount('every 1 week x3')).toBe('every 1 week x2');
  });

  test('x10 -> x9', () => {
    expect(decrementCount('monthly x10')).toBe('monthly x9');
  });

  test('x2 -> x1', () => {
    expect(decrementCount('daily x2')).toBe('daily x1');
  });
});

// ===========================================================================
// RecurrenceEngine.rollForward()
// ===========================================================================

describe('RecurrenceEngine.rollForward', () => {
  const engine = new RecurrenceEngine();

  test('normal recurrence: advances due, resets status, sets last_done', () => {
    const task = makeTask({
      due: '2026-07-01',
      repeat: 'every 1 week',
      status: 'todo',
    });
    const result = engine.rollForward(task);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('recurred');
      if (result.value.kind === 'recurred') {
        expect(result.value.task.status).toBe('todo');
        expect(result.value.task.last_done).toBeDefined();
        // Due should be in the future
        expect(result.value.nextDue > '2026-07-01').toBe(true);
        expect(result.value.task.due).toBe(result.value.nextDue);
      }
    }
  });

  test('xN decrement: x3 -> x2 in repeat string', () => {
    const task = makeTask({
      due: '2026-07-01',
      repeat: 'every 1 week x3',
      status: 'todo',
    });
    const result = engine.rollForward(task);
    expect(result.ok).toBe(true);
    if (result.ok && result.value.kind === 'recurred') {
      expect(result.value.task.repeat).toBe('every 1 week x2');
    }
  });

  test('xN terminal: x1 -> recurrence-ended, xN stripped', () => {
    const task = makeTask({
      due: '2026-07-01',
      repeat: 'every 1 week x1',
      status: 'todo',
    });
    const result = engine.rollForward(task);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('recurrence-ended');
      if (result.value.kind === 'recurrence-ended') {
        expect(result.value.task.status).toBe('done');
        expect(result.value.task.last_done).toBeDefined();
        expect(result.value.task.repeat).toBe('every 1 week');
      }
    }
  });

  test('until reached -> recurrence-ended', () => {
    // Task due was yesterday; until is also yesterday — next would exceed
    const task = makeTask({
      due: '2020-01-01',
      repeat: 'every 1 day until 2020-01-02',
      status: 'todo',
    });
    const result = engine.rollForward(task);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('recurrence-ended');
      if (result.value.kind === 'recurrence-ended') {
        expect(result.value.task.status).toBe('done');
      }
    }
  });

  test('due unset: uses today as fallback base date', () => {
    const task = makeTask({
      due: undefined,
      repeat: 'every 1 day',
      status: 'todo',
    });
    const result = engine.rollForward(task);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('recurred');
    }
  });

  test('invalid repeat string -> error', () => {
    const task = makeTask({
      due: '2026-07-01',
      repeat: 'gibberish nonsense',
      status: 'todo',
    });
    const result = engine.rollForward(task);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid-repeat');
    }
  });

  test('empty repeat string -> error', () => {
    const task = makeTask({
      due: '2026-07-01',
      repeat: '',
      status: 'todo',
    });
    const result = engine.rollForward(task);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid-repeat');
    }
  });

  test('undefined repeat -> error', () => {
    const task = makeTask({
      due: '2026-07-01',
      repeat: undefined,
      status: 'todo',
    });
    const result = engine.rollForward(task);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid-repeat');
    }
  });

  test('does NOT mutate the input task', () => {
    const task = makeTask({
      due: '2026-07-01',
      repeat: 'every 1 week x3',
      status: 'todo',
    });
    const originalRef = task.ref;
    const originalDue: string | undefined = task.due;
    const originalRepeat: string | undefined = task.repeat;
    const originalStatus = task.status;

    engine.rollForward(task);

    expect(task.ref).toBe(originalRef);
    expect(task.due).toBe(originalDue as string);
    expect(task.repeat).toBe(originalRepeat as string);
    expect(task.status).toBe(originalStatus);
    expect(task.last_done).toBeUndefined();
  });
});

// ===========================================================================
// describe()
// ===========================================================================

describe('describeRule', () => {
  test('interval singular', () => {
    const rule: RecurrenceRule = { base: { kind: 'interval', n: 1, unit: 'week' } };
    expect(describeRule(rule)).toBe('every week');
  });

  test('interval plural', () => {
    const rule: RecurrenceRule = { base: { kind: 'interval', n: 3, unit: 'month' } };
    expect(describeRule(rule)).toBe('every 3 months');
  });

  test('weekly-days', () => {
    const rule: RecurrenceRule = { base: { kind: 'weekly-days', weekdays: [1, 4] } };
    expect(describeRule(rule)).toBe('every Mon, Thu');
  });

  test('monthly-day numeric', () => {
    const rule: RecurrenceRule = { base: { kind: 'monthly-day', day: 15 } };
    expect(describeRule(rule)).toBe('every month on day 15');
  });

  test('monthly-day last', () => {
    const rule: RecurrenceRule = { base: { kind: 'monthly-day', day: 'last' } };
    expect(describeRule(rule)).toBe('every month on last day');
  });

  test('with count', () => {
    const rule: RecurrenceRule = {
      base: { kind: 'interval', n: 1, unit: 'day' },
      end: { count: 5 },
    };
    expect(describeRule(rule)).toContain('5 remaining');
  });

  test('with until', () => {
    const rule: RecurrenceRule = {
      base: { kind: 'interval', n: 1, unit: 'week' },
      end: { until: '2026-12-31' },
    };
    expect(describeRule(rule)).toContain('until 2026-12-31');
  });
});

// ===========================================================================
// Seam smoke test: complete() -> RecurrenceEngine integration
// ===========================================================================

describe('state-machine seam integration', () => {
  test('complete(recurrenceTask) -> recurred via RecurrenceEngine', () => {
    const task = makeTask({
      type: 'recurrence',
      due: '2026-07-01',
      repeat: 'every 1 week',
      status: 'todo',
    });
    const result = complete(task, { recurrence: new RecurrenceEngine() });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('recurred');
    }
  });

  test('complete(recurrenceTask with x1) -> recurrence-ended', () => {
    const task = makeTask({
      type: 'recurrence',
      due: '2026-07-01',
      repeat: 'every 1 week x1',
      status: 'todo',
    });
    const result = complete(task, { recurrence: new RecurrenceEngine() });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('recurrence-ended');
    }
  });

  test('complete(regular task) -> completed (no recurrence)', () => {
    const task = makeTask({
      type: 'task',
      repeat: undefined,
      status: 'todo',
    });
    const result = complete(task, { recurrence: new RecurrenceEngine() });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('completed');
    }
  });
});
