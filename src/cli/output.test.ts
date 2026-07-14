/**
 * OutputFormatter unit tests.
 * Verifies rendering logic: symbols, truncation, color gating,
 * relative dates, and JSON serialization.
 */

import { describe, test, expect } from 'bun:test';
import type { Task } from '../core/types.js';
import type { RenderOpts } from './output.js';
import {
  renderList,
  renderCompact,
  renderTask,
  renderMessage,
  renderStateChange,
  toJson,
  toJsonRaw,
  formatDue,
} from './output.js';

// --- Test Fixtures ---

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    ref: '20260714-buy-milk',
    title: 'buy milk',
    body: '',
    tags: [],
    created: '2026-07-14T10:00:00Z',
    updated: '2026-07-14T10:00:00Z',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    raw: {},
    ...overrides,
  };
}

const defaultOpts: RenderOpts = {
  color: false,
  relative: false,
  format: 'table',
  width: 80,
};

// --- renderList ---

describe('renderList', () => {
  test('renders "No tasks found." for empty list', () => {
    expect(renderList([], defaultOpts)).toBe('No tasks found.');
  });

  test('renders tasks with status symbol', () => {
    const tasks = [makeTask({ status: 'todo' })];
    const output = renderList(tasks, defaultOpts);
    expect(output).toContain('●');
    expect(output).toContain('buy milk');
  });

  test('renders done symbol for completed tasks', () => {
    const tasks = [makeTask({ status: 'done' })];
    const output = renderList(tasks, defaultOpts);
    expect(output).toContain('✓');
  });

  test('renders in-progress symbol', () => {
    const tasks = [makeTask({ status: 'in-progress' })];
    const output = renderList(tasks, defaultOpts);
    expect(output).toContain('◐');
  });

  test('renders waiting symbol', () => {
    const tasks = [makeTask({ status: 'waiting' })];
    const output = renderList(tasks, defaultOpts);
    expect(output).toContain('◷');
  });

  test('renders cancelled symbol', () => {
    const tasks = [makeTask({ status: 'cancelled' })];
    const output = renderList(tasks, defaultOpts);
    expect(output).toContain('⊘');
  });

  test('respects limit option', () => {
    const tasks = [
      makeTask({ ref: '20260714-a', title: 'A' }),
      makeTask({ ref: '20260714-b', title: 'B' }),
      makeTask({ ref: '20260714-c', title: 'C' }),
    ];
    const output = renderList(tasks, { ...defaultOpts, limit: 2 });
    expect(output).toContain('A');
    expect(output).toContain('B');
    expect(output).not.toContain('C');
  });

  test('no ANSI codes when color=false', () => {
    const tasks = [makeTask()];
    const output = renderList(tasks, { ...defaultOpts, color: false });
    expect(output).not.toContain('\x1b[');
  });

  test('includes ANSI codes when color=true', () => {
    const tasks = [makeTask()];
    const output = renderList(tasks, { ...defaultOpts, color: true });
    expect(output).toContain('\x1b[');
  });
});

// --- renderCompact ---

describe('renderCompact', () => {
  test('renders symbol + title', () => {
    const tasks = [makeTask({ title: 'Walk dog' })];
    const output = renderCompact(tasks, defaultOpts);
    expect(output).toContain('●');
    expect(output).toContain('Walk dog');
  });

  test('includes due hint when present', () => {
    const tasks = [makeTask({ due: '2026-12-01' })];
    const output = renderCompact(tasks, defaultOpts);
    expect(output).toContain('[2026-12-01]');
  });

  test('no due hint when absent', () => {
    const tasks = [makeTask()];
    const output = renderCompact(tasks, defaultOpts);
    expect(output).not.toContain('[');
  });
});

// --- renderTask ---

describe('renderTask', () => {
  test('renders all metadata fields', () => {
    const task = makeTask({
      due: '2026-12-01',
      project: 'alpha',
      tags: ['work', 'urgent'],
      repeat: 'weekly',
      parent: '[[20260701-parent]]',
    });
    const output = renderTask(task, defaultOpts);
    expect(output).toContain('ref:');
    expect(output).toContain('status:');
    expect(output).toContain('priority:');
    expect(output).toContain('due:');
    expect(output).toContain('project:');
    expect(output).toContain('tags:');
    expect(output).toContain('repeat:');
    expect(output).toContain('parent:');
    expect(output).toContain('created:');
    expect(output).toContain('updated:');
  });

  test('renders body with separator', () => {
    const task = makeTask({ body: 'Some details here' });
    const output = renderTask(task, defaultOpts);
    expect(output).toContain('Some details here');
    expect(output).toContain('───');
  });

  test('omits body section when body is empty', () => {
    const task = makeTask({ body: '' });
    const output = renderTask(task, defaultOpts);
    expect(output).not.toContain('───');
  });
});

// --- renderMessage ---

describe('renderMessage', () => {
  test('success message has ✓ prefix', () => {
    expect(renderMessage('Done', 'success')).toBe('✓ Done');
  });

  test('error message has ✗ prefix', () => {
    expect(renderMessage('Failed', 'error')).toBe('✗ Failed');
  });
});

// --- renderStateChange ---

describe('renderStateChange', () => {
  test('formats state change correctly', () => {
    const output = renderStateChange('20260714-task', 'todo', 'in-progress');
    expect(output).toContain('20260714-task');
    expect(output).toContain('todo');
    expect(output).toContain('in-progress');
    expect(output).toContain('→');
    expect(output).toStartWith('✓ ');
  });
});

// --- formatDue ---

describe('formatDue', () => {
  test('returns empty for undefined', () => {
    expect(formatDue(undefined, false)).toBe('');
  });

  test('returns raw date for invalid format', () => {
    expect(formatDue('not-a-date', false)).toBe('not-a-date');
  });

  test('includes both absolute and relative by default', () => {
    const output = formatDue('2099-01-01', false);
    expect(output).toContain('2099-01-01');
    expect(output).toContain('in');
  });

  test('relative-only mode omits absolute date', () => {
    const output = formatDue('2099-01-01', true);
    expect(output).not.toContain('2099-01-01');
    expect(output).toContain('in');
  });
});

// --- toJson ---

describe('toJson', () => {
  test('produces stable-key JSON', () => {
    const obj = { z: 1, a: 2, m: 3 };
    const output = toJson(obj);
    const parsed = JSON.parse(output);
    const keys = Object.keys(parsed);
    expect(keys).toEqual(['a', 'm', 'z']);
  });

  test('does not include ANSI codes', () => {
    const output = toJson({ title: 'test' });
    expect(output).not.toContain('\x1b[');
  });
});

describe('toJsonRaw', () => {
  test('serializes arrays', () => {
    const output = toJsonRaw([1, 2, 3]);
    expect(JSON.parse(output)).toEqual([1, 2, 3]);
  });
});
