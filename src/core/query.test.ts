import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Task } from './types.js';
import type { ResolvedPaths } from './config.js';
import { TaskRepository } from './repository.js';
import {
  matches,
  filterTasks,
  sortTasks,
  searchTasks,
  QueryService,
  DEFAULT_SORT,
} from './query.js';

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

// --- matches() ---

describe('matches', () => {
  test('empty filter matches any task', () => {
    const task = makeTask();
    expect(matches(task, {})).toBe(true);
  });

  test('status filter includes matching status', () => {
    const task = makeTask({ status: 'todo' });
    expect(matches(task, { status: ['todo', 'in-progress'] })).toBe(true);
  });

  test('status filter excludes non-matching status', () => {
    const task = makeTask({ status: 'done' });
    expect(matches(task, { status: ['todo', 'in-progress'] })).toBe(false);
  });

  test('priority filter includes matching priority', () => {
    const task = makeTask({ priority: 'high' });
    expect(matches(task, { priority: ['high', 'medium'] })).toBe(true);
  });

  test('priority filter excludes non-matching priority', () => {
    const task = makeTask({ priority: 'low' });
    expect(matches(task, { priority: ['high'] })).toBe(false);
  });

  test('dueBefore includes task due on the boundary (<=, inclusive R4)', () => {
    const task = makeTask({ due: '2026-07-15' });
    expect(matches(task, { dueBefore: '2026-07-15' })).toBe(true);
  });

  test('dueBefore includes task due before boundary', () => {
    const task = makeTask({ due: '2026-07-14' });
    expect(matches(task, { dueBefore: '2026-07-15' })).toBe(true);
  });

  test('dueBefore excludes task due after boundary', () => {
    const task = makeTask({ due: '2026-07-16' });
    expect(matches(task, { dueBefore: '2026-07-15' })).toBe(false);
  });

  test('dueBefore excludes task with no due date (R4)', () => {
    const task = makeTask({ due: undefined });
    expect(matches(task, { dueBefore: '2026-07-15' })).toBe(false);
  });

  test('tags filter matches when task has all specified tags (subset R3)', () => {
    const task = makeTask({ tags: ['work', 'urgent', 'review'] });
    expect(matches(task, { tags: ['work', 'urgent'] })).toBe(true);
  });

  test('tags filter fails when task is missing one specified tag', () => {
    const task = makeTask({ tags: ['work'] });
    expect(matches(task, { tags: ['work', 'urgent'] })).toBe(false);
  });

  test('tags filter with empty array matches all', () => {
    const task = makeTask({ tags: ['work'] });
    expect(matches(task, { tags: [] })).toBe(true);
  });

  test('project filter matches exact project', () => {
    const task = makeTask({ project: 'alpha' });
    expect(matches(task, { project: 'alpha' })).toBe(true);
  });

  test('project filter excludes different project', () => {
    const task = makeTask({ project: 'beta' });
    expect(matches(task, { project: 'alpha' })).toBe(false);
  });

  test('project filter excludes task with no project', () => {
    const task = makeTask({ project: undefined });
    expect(matches(task, { project: 'alpha' })).toBe(false);
  });

  test('multiple conditions compose with AND', () => {
    const task = makeTask({ status: 'todo', priority: 'high', due: '2026-07-10' });
    // All conditions match
    expect(
      matches(task, { status: ['todo'], priority: ['high'], dueBefore: '2026-07-15' }),
    ).toBe(true);
    // One condition fails
    expect(
      matches(task, { status: ['done'], priority: ['high'], dueBefore: '2026-07-15' }),
    ).toBe(false);
  });
});

// --- filterTasks() ---

describe('filterTasks', () => {
  const tasks = [
    makeTask({ ref: 'a', status: 'todo', priority: 'high', due: '2026-07-10' }),
    makeTask({ ref: 'b', status: 'done', priority: 'low', due: '2026-07-20' }),
    makeTask({ ref: 'c', status: 'todo', priority: 'medium', due: undefined }),
  ];

  test('empty filter returns all tasks', () => {
    expect(filterTasks(tasks, {})).toHaveLength(3);
  });

  test('status filter narrows results', () => {
    const result = filterTasks(tasks, { status: ['todo'] });
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.status === 'todo')).toBe(true);
  });

  test('dueBefore + status combined', () => {
    const result = filterTasks(tasks, { status: ['todo'], dueBefore: '2026-07-15' });
    expect(result).toHaveLength(1);
    expect(result[0]!.ref).toBe('a');
  });
});

// --- sortTasks() ---

describe('sortTasks', () => {
  test('DEFAULT_SORT is due ascending, nullsLast true', () => {
    expect(DEFAULT_SORT).toEqual({ key: 'due', dir: 'asc', nullsLast: true });
  });

  test('sorts by due ascending with nulls last (R5)', () => {
    const tasks = [
      makeTask({ ref: 'no-due', due: undefined, created: '2026-07-01T00:00:00Z' }),
      makeTask({ ref: 'later', due: '2026-07-20', created: '2026-07-02T00:00:00Z' }),
      makeTask({ ref: 'earlier', due: '2026-07-10', created: '2026-07-03T00:00:00Z' }),
    ];
    const sorted = sortTasks(tasks);
    expect(sorted.map((t) => t.ref)).toEqual(['earlier', 'later', 'no-due']);
  });

  test('nullsLast=false puts nulls first', () => {
    const tasks = [
      makeTask({ ref: 'has-due', due: '2026-07-10', created: '2026-07-01T00:00:00Z' }),
      makeTask({ ref: 'no-due', due: undefined, created: '2026-07-02T00:00:00Z' }),
    ];
    const sorted = sortTasks(tasks, { key: 'due', dir: 'asc', nullsLast: false });
    expect(sorted[0]!.ref).toBe('no-due');
  });

  test('priority sort uses semantic order high > medium > low (asc = high first)', () => {
    const tasks = [
      makeTask({ ref: 'low', priority: 'low', created: '2026-07-01T00:00:00Z' }),
      makeTask({ ref: 'high', priority: 'high', created: '2026-07-02T00:00:00Z' }),
      makeTask({ ref: 'med', priority: 'medium', created: '2026-07-03T00:00:00Z' }),
    ];
    const sorted = sortTasks(tasks, { key: 'priority', dir: 'asc' });
    expect(sorted.map((t) => t.ref)).toEqual(['high', 'med', 'low']);
  });

  test('priority sort descending = low first', () => {
    const tasks = [
      makeTask({ ref: 'high', priority: 'high', created: '2026-07-01T00:00:00Z' }),
      makeTask({ ref: 'low', priority: 'low', created: '2026-07-02T00:00:00Z' }),
    ];
    const sorted = sortTasks(tasks, { key: 'priority', dir: 'desc' });
    expect(sorted[0]!.ref).toBe('low');
  });

  test('stable sort: same due breaks by created ascending', () => {
    const tasks = [
      makeTask({ ref: 'second', due: '2026-07-10', created: '2026-07-05T00:00:00Z' }),
      makeTask({ ref: 'first', due: '2026-07-10', created: '2026-07-01T00:00:00Z' }),
    ];
    const sorted = sortTasks(tasks, { key: 'due', dir: 'asc' });
    expect(sorted.map((t) => t.ref)).toEqual(['first', 'second']);
  });

  test('dir=desc reverses due order', () => {
    const tasks = [
      makeTask({ ref: 'earlier', due: '2026-07-10', created: '2026-07-01T00:00:00Z' }),
      makeTask({ ref: 'later', due: '2026-07-20', created: '2026-07-02T00:00:00Z' }),
    ];
    const sorted = sortTasks(tasks, { key: 'due', dir: 'desc' });
    expect(sorted[0]!.ref).toBe('later');
  });

  test('sort by created ascending', () => {
    const tasks = [
      makeTask({ ref: 'newer', created: '2026-07-12T00:00:00Z' }),
      makeTask({ ref: 'older', created: '2026-07-01T00:00:00Z' }),
    ];
    const sorted = sortTasks(tasks, { key: 'created', dir: 'asc' });
    expect(sorted.map((t) => t.ref)).toEqual(['older', 'newer']);
  });

  test('sort by status semantic order', () => {
    const tasks = [
      makeTask({ ref: 'done', status: 'done', created: '2026-07-01T00:00:00Z' }),
      makeTask({ ref: 'ip', status: 'in-progress', created: '2026-07-02T00:00:00Z' }),
      makeTask({ ref: 'todo', status: 'todo', created: '2026-07-03T00:00:00Z' }),
    ];
    const sorted = sortTasks(tasks, { key: 'status', dir: 'asc' });
    expect(sorted.map((t) => t.ref)).toEqual(['ip', 'todo', 'done']);
  });
});

// --- searchTasks() ---

describe('searchTasks', () => {
  const tasks = [
    makeTask({ ref: '20260712-buy-milk', title: 'buy milk', body: 'From the grocery store' }),
    makeTask({ ref: '20260712-write-report', title: 'write report', body: 'Q3 quarterly review' }),
    makeTask({
      ref: '20260712-read-book',
      title: 'read book',
      body: 'Finish chapter 5',
      due: '2026-07-15',
    }),
  ];

  test('matches on title substring', () => {
    const results = searchTasks(tasks, 'milk');
    expect(results).toHaveLength(1);
    expect(results[0]!.ref).toBe('20260712-buy-milk');
  });

  test('matches on body substring', () => {
    const results = searchTasks(tasks, 'quarterly');
    expect(results).toHaveLength(1);
    expect(results[0]!.ref).toBe('20260712-write-report');
  });

  test('case-insensitive matching', () => {
    const results = searchTasks(tasks, 'BUY MILK');
    expect(results).toHaveLength(1);
    expect(results[0]!.ref).toBe('20260712-buy-milk');
  });

  test('partial substring match', () => {
    const results = searchTasks(tasks, 'rite');
    expect(results).toHaveLength(1);
    expect(results[0]!.ref).toBe('20260712-write-report');
  });

  test('zero results returns empty array (not an error)', () => {
    const results = searchTasks(tasks, 'nonexistent-term-xyz');
    expect(results).toEqual([]);
  });

  test('empty query returns all tasks sorted by DEFAULT_SORT', () => {
    const results = searchTasks(tasks, '  ');
    expect(results).toHaveLength(3);
  });

  test('results are sorted by DEFAULT_SORT (due asc, nullsLast)', () => {
    // 'read-book' has due=2026-07-15, others have no due → sorted last
    const results = searchTasks(tasks, 'r'); // matches 'write-report' and 'read-book'
    const withDue = results.filter((t) => t.due != null);
    const withoutDue = results.filter((t) => t.due == null);
    // Tasks with due come before tasks without due
    if (withDue.length > 0 && withoutDue.length > 0) {
      const lastDueIdx = results.lastIndexOf(withDue[withDue.length - 1]!);
      const firstNullIdx = results.indexOf(withoutDue[0]!);
      expect(lastDueIdx).toBeLessThan(firstNullIdx);
    }
  });
});

// --- QueryService (integration with TaskRepository) ---

describe('QueryService', () => {
  let testDir: string;
  let paths: ResolvedPaths;
  let repo: TaskRepository;
  let service: QueryService;

  beforeEach(() => {
    testDir = join(tmpdir(), `marktask-query-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    paths = {
      tasksDir: join(testDir, 'tasks'),
      trashDir: join(testDir, 'tasks', '.trash'),
      archiveDir: join(testDir, 'archive'),
    };
    repo = new TaskRepository(paths);
    repo.ensureDirs();
    service = new QueryService(repo);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function writeTaskFile(dir: string, ref: string, frontmatter: Record<string, unknown>, body = '') {
    const lines: string[] = ['---'];
    for (const [key, val] of Object.entries(frontmatter)) {
      if (Array.isArray(val)) {
        lines.push(`${key}:`);
        for (const item of val) {
          lines.push(`  - ${item}`);
        }
      } else {
        lines.push(`${key}: ${val}`);
      }
    }
    lines.push('---');
    if (body) lines.push('', body);
    writeFileSync(join(dir, `${ref}.md`), lines.join('\n'), 'utf-8');
  }

  test('list() returns all active tasks', async () => {
    writeTaskFile(paths.tasksDir, '20260710-task-a', {
      status: 'todo',
      priority: 'high',
      type: 'task',
      created: '2026-07-10T00:00:00Z',
      updated: '2026-07-10T00:00:00Z',
    });
    writeTaskFile(paths.tasksDir, '20260711-task-b', {
      status: 'done',
      priority: 'low',
      type: 'task',
      created: '2026-07-11T00:00:00Z',
      updated: '2026-07-11T00:00:00Z',
    });

    const result = await service.list();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
    }
  });

  test('list() with filter narrows results', async () => {
    writeTaskFile(paths.tasksDir, '20260710-task-a', {
      status: 'todo',
      priority: 'high',
      type: 'task',
      created: '2026-07-10T00:00:00Z',
      updated: '2026-07-10T00:00:00Z',
    });
    writeTaskFile(paths.tasksDir, '20260711-task-b', {
      status: 'done',
      priority: 'low',
      type: 'task',
      created: '2026-07-11T00:00:00Z',
      updated: '2026-07-11T00:00:00Z',
    });

    const result = await service.list({ status: ['todo'] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.status).toBe('todo');
    }
  });

  test('list() excludes archived tasks by default (R1)', async () => {
    writeTaskFile(paths.tasksDir, '20260710-active', {
      status: 'todo',
      priority: 'medium',
      type: 'task',
      created: '2026-07-10T00:00:00Z',
      updated: '2026-07-10T00:00:00Z',
    });
    writeTaskFile(paths.archiveDir, '20260701-archived', {
      status: 'done',
      priority: 'low',
      type: 'task',
      created: '2026-07-01T00:00:00Z',
      updated: '2026-07-01T00:00:00Z',
    });

    const result = await service.list();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.ref).toBe('20260710-active');
    }
  });

  test('list() with includeArchived adds archived tasks', async () => {
    writeTaskFile(paths.tasksDir, '20260710-active', {
      status: 'todo',
      priority: 'medium',
      type: 'task',
      created: '2026-07-10T00:00:00Z',
      updated: '2026-07-10T00:00:00Z',
    });
    writeTaskFile(paths.archiveDir, '20260701-archived', {
      status: 'done',
      priority: 'low',
      type: 'task',
      created: '2026-07-01T00:00:00Z',
      updated: '2026-07-01T00:00:00Z',
    });

    const result = await service.list({ includeArchived: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
    }
  });

  test('list() returns empty array for empty directory', async () => {
    const result = await service.list();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });

  test('search() finds by title', async () => {
    writeTaskFile(paths.tasksDir, '20260710-buy-groceries', {
      status: 'todo',
      priority: 'medium',
      type: 'task',
      created: '2026-07-10T00:00:00Z',
      updated: '2026-07-10T00:00:00Z',
    });
    writeTaskFile(paths.tasksDir, '20260711-write-report', {
      status: 'todo',
      priority: 'high',
      type: 'task',
      created: '2026-07-11T00:00:00Z',
      updated: '2026-07-11T00:00:00Z',
    });

    const result = await service.search('groceries');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.ref).toBe('20260710-buy-groceries');
    }
  });

  test('search() finds by body content', async () => {
    writeTaskFile(
      paths.tasksDir,
      '20260710-meeting',
      {
        status: 'todo',
        priority: 'medium',
        type: 'task',
        created: '2026-07-10T00:00:00Z',
        updated: '2026-07-10T00:00:00Z',
      },
      'Discuss the quarterly budget with finance team',
    );

    const result = await service.search('quarterly');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.ref).toBe('20260710-meeting');
    }
  });

  test('search() returns empty for no matches', async () => {
    writeTaskFile(paths.tasksDir, '20260710-task', {
      status: 'todo',
      priority: 'medium',
      type: 'task',
      created: '2026-07-10T00:00:00Z',
      updated: '2026-07-10T00:00:00Z',
    });

    const result = await service.search('nonexistent-xyz');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });
});

// --- TaskRepository.list() and listArchived() ---

describe('TaskRepository.list() / listArchived()', () => {
  let testDir: string;
  let paths: ResolvedPaths;
  let repo: TaskRepository;

  beforeEach(() => {
    testDir = join(tmpdir(), `marktask-list-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    paths = {
      tasksDir: join(testDir, 'tasks'),
      trashDir: join(testDir, 'tasks', '.trash'),
      archiveDir: join(testDir, 'archive'),
    };
    repo = new TaskRepository(paths);
    repo.ensureDirs();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test('list() returns decoded tasks from tasksDir', async () => {
    const content = [
      '---',
      'status: todo',
      'priority: high',
      'type: task',
      'created: 2026-07-10T00:00:00Z',
      'updated: 2026-07-10T00:00:00Z',
      '---',
      '',
      'Task body here',
    ].join('\n');
    writeFileSync(join(paths.tasksDir, '20260710-sample.md'), content, 'utf-8');

    const result = await repo.list();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.ref).toBe('20260710-sample');
      expect(result.value[0]!.status).toBe('todo');
      expect(result.value[0]!.priority).toBe('high');
      expect(result.value[0]!.body).toBe('Task body here');
    }
  });

  test('list() returns empty array for empty tasksDir', async () => {
    const result = await repo.list();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });

  test('listArchived() returns decoded tasks from archiveDir', async () => {
    const content = [
      '---',
      'status: done',
      'priority: low',
      'type: task',
      'created: 2026-07-01T00:00:00Z',
      'updated: 2026-07-05T00:00:00Z',
      '---',
      '',
      'Archived task body',
    ].join('\n');
    writeFileSync(join(paths.archiveDir, '20260701-old-task.md'), content, 'utf-8');

    const result = await repo.listArchived();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.ref).toBe('20260701-old-task');
      expect(result.value[0]!.status).toBe('done');
    }
  });

  test('listArchived() returns empty array when archiveDir does not exist', async () => {
    // Remove archiveDir to simulate non-existence
    rmSync(paths.archiveDir, { recursive: true, force: true });

    const result = await repo.listArchived();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });

  test('listArchived() returns empty for empty archiveDir', async () => {
    // archiveDir exists (from ensureDirs) but has no files
    const result = await repo.listArchived();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });

  test('list() multiple tasks ordered by filesystem enumeration', async () => {
    for (const name of ['20260710-a', '20260711-b', '20260712-c']) {
      const content = [
        '---',
        'status: todo',
        'priority: medium',
        'type: task',
        `created: ${name.slice(0, 4)}-${name.slice(4, 6)}-${name.slice(6, 8)}T00:00:00Z`,
        'updated: 2026-07-12T00:00:00Z',
        '---',
      ].join('\n');
      writeFileSync(join(paths.tasksDir, `${name}.md`), content, 'utf-8');
    }

    const result = await repo.list();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(3);
    }
  });
});
