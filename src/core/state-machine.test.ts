import { describe, test, expect } from 'bun:test';
import type { Task, Status } from './types.js';
import type { RecurrenceRoller, SubtaskGuard } from './state-machine.js';
import { transition, start, wait, cancel, setState, complete } from './state-machine.js';

// --- Test Fixture Factory ---

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    ref: '20260712-test-task',
    title: 'test task',
    body: '',
    tags: [],
    created: '2026-07-12T00:00:00.000Z',
    updated: '2026-07-12T00:00:00.000Z',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    project: undefined,
    due: undefined,
    repeat: undefined,
    parent: undefined,
    last_done: undefined,
    raw: {},
    ...overrides,
  };
}

// --- transition() ---

describe('transition', () => {
  test('transitions to in-progress and updates "updated" timestamp', () => {
    const task = makeTask({ status: 'todo' });
    const result = transition(task, 'in-progress');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('in-progress');
      expect(result.value.updated).not.toBe(task.updated);
    }
  });

  test('transitions to done', () => {
    const task = makeTask({ status: 'in-progress' });
    const result = transition(task, 'done');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('done');
    }
  });

  test('transitions to waiting', () => {
    const task = makeTask({ status: 'todo' });
    const result = transition(task, 'waiting');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('waiting');
    }
  });

  test('transitions to cancelled', () => {
    const task = makeTask({ status: 'in-progress' });
    const result = transition(task, 'cancelled');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('cancelled');
    }
  });

  test('transitions to todo', () => {
    const task = makeTask({ status: 'done' });
    const result = transition(task, 'todo');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('todo');
    }
  });

  test('preserves created timestamp (immutable, R3)', () => {
    const task = makeTask({ created: '2026-01-01T00:00:00.000Z' });
    const result = transition(task, 'in-progress');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.created).toBe('2026-01-01T00:00:00.000Z');
    }
  });

  test('returns a new object — does NOT mutate input task', () => {
    const task = makeTask({ status: 'todo' });
    const result = transition(task, 'in-progress');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toBe(task);
      expect(task.status).toBe('todo'); // original unchanged
    }
  });

  test('returns error for invalid status value', () => {
    const task = makeTask();
    const result = transition(task, 'invalid' as unknown as Status);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('io');
      expect(result.error.message).toContain('Invalid status');
    }
  });

  test('updated field is a valid ISO timestamp', () => {
    const task = makeTask();
    const result = transition(task, 'done');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = Date.parse(result.value.updated);
      expect(Number.isNaN(parsed)).toBe(false);
    }
  });

  test('preserves all other task fields', () => {
    const task = makeTask({
      ref: '20260714-preserve-test',
      title: 'preserve test',
      body: 'some body',
      tags: ['work', 'urgent'],
      priority: 'high',
      project: 'my-project',
      due: '2026-08-01',
      parent: '[[20260712-parent]]',
    });
    const result = transition(task, 'in-progress');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ref).toBe('20260714-preserve-test');
      expect(result.value.title).toBe('preserve test');
      expect(result.value.body).toBe('some body');
      expect(result.value.tags).toEqual(['work', 'urgent']);
      expect(result.value.priority).toBe('high');
      expect(result.value.project).toBe('my-project');
      expect(result.value.due).toBe('2026-08-01');
      expect(result.value.parent).toBe('[[20260712-parent]]');
    }
  });
});

// --- Sugar use-cases ---

describe('start', () => {
  test('transitions to in-progress', () => {
    const task = makeTask({ status: 'todo' });
    const result = start(task);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('in-progress');
    }
  });
});

describe('wait', () => {
  test('transitions to waiting', () => {
    const task = makeTask({ status: 'in-progress' });
    const result = wait(task);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('waiting');
    }
  });
});

describe('cancel', () => {
  test('transitions to cancelled', () => {
    const task = makeTask({ status: 'in-progress' });
    const result = cancel(task);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('cancelled');
    }
  });
});

describe('setState', () => {
  test('transitions to an arbitrary valid status', () => {
    const task = makeTask({ status: 'todo' });
    const result = setState(task, 'waiting');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe('waiting');
    }
  });

  test('returns error for invalid status', () => {
    const task = makeTask();
    const result = setState(task, 'bogus' as unknown as Status);
    expect(result.ok).toBe(false);
  });
});

// --- complete() branching ---

describe('complete', () => {
  test('(a) no deps — transitions to done and returns completed', () => {
    const task = makeTask({ status: 'in-progress' });
    const result = complete(task);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('completed');
      if (result.value.kind === 'completed') {
        expect(result.value.task.status).toBe('done');
      }
    }
  });

  test('(b) subtasks mock returns blocked → guard-blocked with blocking tasks', () => {
    const blockingTask = makeTask({ ref: '20260712-child', status: 'todo' });
    const subtasks: SubtaskGuard = {
      canComplete: (_ref: string) => ({
        ok: true,
        value: { blocked: true, blocking: [blockingTask] },
      }),
    };
    const task = makeTask({ status: 'in-progress' });
    const result = complete(task, { subtasks });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('guard-blocked');
      if (result.value.kind === 'guard-blocked') {
        expect(result.value.blocking).toHaveLength(1);
        expect(result.value.blocking[0]!.ref).toBe('20260712-child');
      }
    }
  });

  test('(c) subtasks mock not blocked → proceeds to completed', () => {
    const subtasks: SubtaskGuard = {
      canComplete: (_ref: string) => ({
        ok: true,
        value: { blocked: false, blocking: [] },
      }),
    };
    const task = makeTask({ status: 'in-progress' });
    const result = complete(task, { subtasks });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('completed');
    }
  });

  test('(d) recurrence task with recurrence mock → recurred', () => {
    const task = makeTask({
      type: 'recurrence',
      repeat: 'every 1 week',
      status: 'in-progress',
    });
    const recurrence: RecurrenceRoller = {
      rollForward: (t: Task) => ({
        ok: true,
        value: { kind: 'recurred', task: { ...t, status: 'todo' as const, updated: new Date().toISOString() }, nextDue: '2026-07-21' },
      }),
    };
    const result = complete(task, { recurrence });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('recurred');
      if (result.value.kind === 'recurred') {
        expect(result.value.nextDue).toBe('2026-07-21');
      }
    }
  });

  test('(d) recurrence task with recurrence mock → recurrence-ended', () => {
    const task = makeTask({
      type: 'recurrence',
      repeat: 'every 1 week x1',
      status: 'in-progress',
    });
    const recurrence: RecurrenceRoller = {
      rollForward: (t: Task) => ({
        ok: true,
        value: { kind: 'recurrence-ended', task: { ...t, status: 'done' as const, updated: new Date().toISOString() } },
      }),
    };
    const result = complete(task, { recurrence });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('recurrence-ended');
    }
  });

  test('(e) recurrence task but NO recurrence dep → falls through to completed', () => {
    const task = makeTask({
      type: 'recurrence',
      repeat: 'every 1 week',
      status: 'in-progress',
    });
    const result = complete(task);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('completed');
      if (result.value.kind === 'completed') {
        expect(result.value.task.status).toBe('done');
      }
    }
  });

  test('subtasks guard error propagates', () => {
    const subtasks: SubtaskGuard = {
      canComplete: (_ref: string) => ({
        ok: false,
        error: { kind: 'io', message: 'disk read failed' },
      }),
    };
    const task = makeTask();
    const result = complete(task, { subtasks });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('io');
      expect(result.error.message).toContain('disk read failed');
    }
  });

  test('recurrence roller error propagates', () => {
    const task = makeTask({
      type: 'recurrence',
      repeat: 'every 1 day',
      status: 'todo',
    });
    const recurrence: RecurrenceRoller = {
      rollForward: (_t: Task) => ({
        ok: false,
        error: { kind: 'invalid-repeat', message: 'malformed repeat rule' },
      }),
    };
    const result = complete(task, { recurrence });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid-repeat');
    }
  });

  test('subtask guard takes priority over recurrence branch', () => {
    const blockingTask = makeTask({ ref: '20260712-child', status: 'in-progress' });
    const subtasks: SubtaskGuard = {
      canComplete: (_ref: string) => ({
        ok: true,
        value: { blocked: true, blocking: [blockingTask] },
      }),
    };
    const recurrence: RecurrenceRoller = {
      rollForward: (t: Task) => ({
        ok: true,
        value: { kind: 'recurred', task: t, nextDue: '2026-07-21' },
      }),
    };
    const task = makeTask({
      type: 'recurrence',
      repeat: 'every 1 week',
      status: 'in-progress',
    });
    const result = complete(task, { subtasks, recurrence });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Subtask guard blocks before recurrence branch is reached
      expect(result.value.kind).toBe('guard-blocked');
    }
  });
});
