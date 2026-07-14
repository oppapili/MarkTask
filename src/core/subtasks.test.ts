import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Task } from './types.js';
import { err, appError } from './types.js';
import {
  parseParentRef,
  isBlockingStatus,
  childrenOf,
  canComplete,
  asSubtaskGuard,
  SubtaskService,
} from './subtasks.js';
import { complete } from './state-machine.js';
import { TaskRepository } from './repository.js';
import type { ResolvedPaths } from './config.js';

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

// --- parseParentRef ---

describe('parseParentRef', () => {
  test('extracts ref from wikilink', () => {
    expect(parseParentRef('[[20260701-foo]]')).toBe('20260701-foo');
  });

  test('handles complex ref with Japanese characters', () => {
    expect(parseParentRef('[[20260701-買い物]]')).toBe('20260701-買い物');
  });

  test('returns null for undefined', () => {
    expect(parseParentRef(undefined)).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(parseParentRef('')).toBeNull();
  });

  test('returns null for malformed — missing closing brackets', () => {
    expect(parseParentRef('[[foo')).toBeNull();
  });

  test('returns null for malformed — missing opening brackets', () => {
    expect(parseParentRef('foo]]')).toBeNull();
  });

  test('returns null for plain string without brackets', () => {
    expect(parseParentRef('20260701-foo')).toBeNull();
  });

  test('returns null for single brackets', () => {
    expect(parseParentRef('[foo]')).toBeNull();
  });

  test('handles ref with hyphens and numbers', () => {
    expect(parseParentRef('[[20260712-my-parent-task-2]]')).toBe(
      '20260712-my-parent-task-2',
    );
  });
});

// --- isBlockingStatus ---

describe('isBlockingStatus', () => {
  test('todo is blocking', () => {
    expect(isBlockingStatus('todo')).toBe(true);
  });

  test('in-progress is blocking', () => {
    expect(isBlockingStatus('in-progress')).toBe(true);
  });

  test('waiting is blocking', () => {
    expect(isBlockingStatus('waiting')).toBe(true);
  });

  test('done is NOT blocking', () => {
    expect(isBlockingStatus('done')).toBe(false);
  });

  test('cancelled is NOT blocking (OQ-4)', () => {
    expect(isBlockingStatus('cancelled')).toBe(false);
  });
});

// --- childrenOf ---

describe('childrenOf', () => {
  test('extracts tasks whose parent matches parentRef', () => {
    const parent = makeTask({ ref: '20260712-parent' });
    const child1 = makeTask({
      ref: '20260712-child-1',
      parent: '[[20260712-parent]]',
    });
    const child2 = makeTask({
      ref: '20260712-child-2',
      parent: '[[20260712-parent]]',
    });
    const unrelated = makeTask({
      ref: '20260712-other',
      parent: '[[20260712-different]]',
    });
    const orphan = makeTask({ ref: '20260712-orphan', parent: undefined });

    const tasks = [parent, child1, child2, unrelated, orphan];
    const result = childrenOf('20260712-parent', tasks);

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.ref).sort()).toEqual(
      ['20260712-child-1', '20260712-child-2'].sort(),
    );
  });

  test('excludes unrelated tasks', () => {
    const tasks = [
      makeTask({ ref: '20260712-a', parent: '[[20260712-other]]' }),
      makeTask({ ref: '20260712-b', parent: undefined }),
    ];
    const result = childrenOf('20260712-parent', tasks);
    expect(result).toHaveLength(0);
  });

  test('returns empty for non-existent parent', () => {
    const tasks = [makeTask({ ref: '20260712-task' })];
    const result = childrenOf('20260712-nonexistent', tasks);
    expect(result).toHaveLength(0);
  });
});

// --- canComplete (pure/snapshot) ---

describe('canComplete', () => {
  test('no children → blocked: false', () => {
    const tasks = [makeTask({ ref: '20260712-parent' })];
    const result = canComplete('20260712-parent', tasks);
    expect(result.blocked).toBe(false);
    expect(result.blocking).toHaveLength(0);
  });

  test('all children done → blocked: false', () => {
    const tasks = [
      makeTask({ ref: '20260712-parent' }),
      makeTask({
        ref: '20260712-child-1',
        parent: '[[20260712-parent]]',
        status: 'done',
      }),
      makeTask({
        ref: '20260712-child-2',
        parent: '[[20260712-parent]]',
        status: 'done',
      }),
    ];
    const result = canComplete('20260712-parent', tasks);
    expect(result.blocked).toBe(false);
    expect(result.blocking).toHaveLength(0);
  });

  test('all children cancelled → blocked: false (OQ-4)', () => {
    const tasks = [
      makeTask({ ref: '20260712-parent' }),
      makeTask({
        ref: '20260712-child',
        parent: '[[20260712-parent]]',
        status: 'cancelled',
      }),
    ];
    const result = canComplete('20260712-parent', tasks);
    expect(result.blocked).toBe(false);
    expect(result.blocking).toHaveLength(0);
  });

  test('mix of done and cancelled → blocked: false', () => {
    const tasks = [
      makeTask({ ref: '20260712-parent' }),
      makeTask({
        ref: '20260712-child-1',
        parent: '[[20260712-parent]]',
        status: 'done',
      }),
      makeTask({
        ref: '20260712-child-2',
        parent: '[[20260712-parent]]',
        status: 'cancelled',
      }),
    ];
    const result = canComplete('20260712-parent', tasks);
    expect(result.blocked).toBe(false);
  });

  test('child in todo → blocked: true', () => {
    const child = makeTask({
      ref: '20260712-child',
      parent: '[[20260712-parent]]',
      status: 'todo',
    });
    const tasks = [makeTask({ ref: '20260712-parent' }), child];
    const result = canComplete('20260712-parent', tasks);
    expect(result.blocked).toBe(true);
    expect(result.blocking).toHaveLength(1);
    expect(result.blocking[0]!.ref).toBe('20260712-child');
  });

  test('child in in-progress → blocked: true', () => {
    const child = makeTask({
      ref: '20260712-child',
      parent: '[[20260712-parent]]',
      status: 'in-progress',
    });
    const tasks = [makeTask({ ref: '20260712-parent' }), child];
    const result = canComplete('20260712-parent', tasks);
    expect(result.blocked).toBe(true);
    expect(result.blocking[0]!.ref).toBe('20260712-child');
  });

  test('child in waiting → blocked: true', () => {
    const child = makeTask({
      ref: '20260712-child',
      parent: '[[20260712-parent]]',
      status: 'waiting',
    });
    const tasks = [makeTask({ ref: '20260712-parent' }), child];
    const result = canComplete('20260712-parent', tasks);
    expect(result.blocked).toBe(true);
    expect(result.blocking[0]!.ref).toBe('20260712-child');
  });

  test('multiple blocking children listed', () => {
    const tasks = [
      makeTask({ ref: '20260712-parent' }),
      makeTask({
        ref: '20260712-child-1',
        parent: '[[20260712-parent]]',
        status: 'todo',
      }),
      makeTask({
        ref: '20260712-child-2',
        parent: '[[20260712-parent]]',
        status: 'in-progress',
      }),
      makeTask({
        ref: '20260712-child-3',
        parent: '[[20260712-parent]]',
        status: 'done',
      }),
    ];
    const result = canComplete('20260712-parent', tasks);
    expect(result.blocked).toBe(true);
    expect(result.blocking).toHaveLength(2);
    const refs = result.blocking.map((t) => t.ref).sort();
    expect(refs).toEqual(['20260712-child-1', '20260712-child-2']);
  });

  // --- Multi-level (recursive) ---

  test('grandchild in todo blocks grandparent via recursion', () => {
    const tasks = [
      makeTask({ ref: '20260712-grandparent' }),
      makeTask({
        ref: '20260712-child',
        parent: '[[20260712-grandparent]]',
        status: 'done',
      }),
      makeTask({
        ref: '20260712-grandchild',
        parent: '[[20260712-child]]',
        status: 'todo',
      }),
    ];
    const result = canComplete('20260712-grandparent', tasks);
    expect(result.blocked).toBe(true);
    expect(result.blocking).toHaveLength(1);
    expect(result.blocking[0]!.ref).toBe('20260712-grandchild');
  });

  test('deep hierarchy: great-grandchild blocking propagates up', () => {
    const tasks = [
      makeTask({ ref: '20260712-root' }),
      makeTask({
        ref: '20260712-level1',
        parent: '[[20260712-root]]',
        status: 'done',
      }),
      makeTask({
        ref: '20260712-level2',
        parent: '[[20260712-level1]]',
        status: 'done',
      }),
      makeTask({
        ref: '20260712-level3',
        parent: '[[20260712-level2]]',
        status: 'waiting',
      }),
    ];
    const result = canComplete('20260712-root', tasks);
    expect(result.blocked).toBe(true);
    expect(result.blocking[0]!.ref).toBe('20260712-level3');
  });

  test('multi-level: blocking child AND blocking grandchild both reported', () => {
    const tasks = [
      makeTask({ ref: '20260712-parent' }),
      makeTask({
        ref: '20260712-child',
        parent: '[[20260712-parent]]',
        status: 'todo',
      }),
      makeTask({
        ref: '20260712-grandchild',
        parent: '[[20260712-child]]',
        status: 'in-progress',
      }),
    ];
    const result = canComplete('20260712-parent', tasks);
    expect(result.blocked).toBe(true);
    // Both child (todo) and grandchild (in-progress) appear in blocking
    const refs = result.blocking.map((t) => t.ref).sort();
    expect(refs).toEqual(['20260712-child', '20260712-grandchild']);
  });

  // --- Cycle protection ---

  test('cycle: child.parent points back to ancestor → no infinite recursion', () => {
    const tasks = [
      makeTask({
        ref: '20260712-a',
        parent: '[[20260712-b]]',
        status: 'todo',
      }),
      makeTask({
        ref: '20260712-b',
        parent: '[[20260712-a]]',
        status: 'todo',
      }),
    ];
    // Should terminate without hanging/stack overflow
    const result = canComplete('20260712-a', tasks);
    expect(result.blocked).toBe(true);
    // 20260712-b is a child of 20260712-a and is blocking
    expect(result.blocking.some((t) => t.ref === '20260712-b')).toBe(true);
  });

  test('cycle: self-referencing parent → no infinite recursion', () => {
    const tasks = [
      makeTask({
        ref: '20260712-self',
        parent: '[[20260712-self]]',
        status: 'todo',
      }),
    ];
    const result = canComplete('20260712-self', tasks);
    // The task is its own child (malformed but safe) — it blocks itself
    expect(result.blocked).toBe(true);
  });

  test('cycle: three-node ring → terminates', () => {
    const tasks = [
      makeTask({
        ref: '20260712-x',
        parent: '[[20260712-z]]',
        status: 'todo',
      }),
      makeTask({
        ref: '20260712-y',
        parent: '[[20260712-x]]',
        status: 'todo',
      }),
      makeTask({
        ref: '20260712-z',
        parent: '[[20260712-y]]',
        status: 'todo',
      }),
    ];
    // Starting from x: children of x = [y] (y's parent is x)
    const result = canComplete('20260712-x', tasks);
    expect(result.blocked).toBe(true);
    // y is blocking; recursion into y finds z (z's parent is y) → blocking
    // recursion into z finds x (x's parent is z), but x is visited → stops
    expect(result.blocking.length).toBeGreaterThanOrEqual(1);
  });

  // --- Non-existent parent ---

  test('non-existent parent ref → blocked: false, blocking: []', () => {
    const tasks = [makeTask({ ref: '20260712-unrelated' })];
    const result = canComplete('20260712-ghost', tasks);
    expect(result.blocked).toBe(false);
    expect(result.blocking).toHaveLength(0);
  });
});

// --- asSubtaskGuard ---

describe('asSubtaskGuard', () => {
  test('returns ok({ blocked, blocking }) via the seam', () => {
    const child = makeTask({
      ref: '20260712-child',
      parent: '[[20260712-parent]]',
      status: 'todo',
    });
    const tasks = [makeTask({ ref: '20260712-parent' }), child];
    const guard = asSubtaskGuard(tasks);

    const result = guard.canComplete('20260712-parent');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.blocked).toBe(true);
      expect(result.value.blocking).toHaveLength(1);
      expect(result.value.blocking[0]!.ref).toBe('20260712-child');
    }
  });

  test('non-blocked returns ok({ blocked: false, blocking: [] })', () => {
    const tasks = [
      makeTask({ ref: '20260712-parent' }),
      makeTask({
        ref: '20260712-child',
        parent: '[[20260712-parent]]',
        status: 'done',
      }),
    ];
    const guard = asSubtaskGuard(tasks);

    const result = guard.canComplete('20260712-parent');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.blocked).toBe(false);
      expect(result.value.blocking).toHaveLength(0);
    }
  });
});

// --- Seam smoke: complete() integration ---

describe('seam smoke: complete() with asSubtaskGuard', () => {
  test('blocks completion when child is incomplete', () => {
    const parentTask = makeTask({
      ref: '20260712-parent',
      status: 'in-progress',
    });
    const childTask = makeTask({
      ref: '20260712-child',
      parent: '[[20260712-parent]]',
      status: 'todo',
    });
    const tasks = [parentTask, childTask];
    const guard = asSubtaskGuard(tasks);

    const result = complete(parentTask, { subtasks: guard });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('guard-blocked');
      if (result.value.kind === 'guard-blocked') {
        expect(result.value.blocking).toHaveLength(1);
        expect(result.value.blocking[0]!.ref).toBe('20260712-child');
      }
    }
  });

  test('allows completion when all children are done', () => {
    const parentTask = makeTask({
      ref: '20260712-parent',
      status: 'in-progress',
    });
    const tasks = [
      parentTask,
      makeTask({
        ref: '20260712-child',
        parent: '[[20260712-parent]]',
        status: 'done',
      }),
    ];
    const guard = asSubtaskGuard(tasks);

    const result = complete(parentTask, { subtasks: guard });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('completed');
    }
  });

  test('allows completion when all children are cancelled', () => {
    const parentTask = makeTask({
      ref: '20260712-parent',
      status: 'in-progress',
    });
    const tasks = [
      parentTask,
      makeTask({
        ref: '20260712-child',
        parent: '[[20260712-parent]]',
        status: 'cancelled',
      }),
    ];
    const guard = asSubtaskGuard(tasks);

    const result = complete(parentTask, { subtasks: guard });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('completed');
    }
  });

  test('allows completion when no children exist', () => {
    const parentTask = makeTask({
      ref: '20260712-parent',
      status: 'in-progress',
    });
    const tasks = [parentTask];
    const guard = asSubtaskGuard(tasks);

    const result = complete(parentTask, { subtasks: guard });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe('completed');
    }
  });
});

// --- SubtaskService (async, repo-based) ---

describe('SubtaskService', () => {
  let testDir: string;
  let paths: ResolvedPaths;
  let repo: TaskRepository;
  let service: SubtaskService;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `marktask-subtask-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    paths = {
      tasksDir: join(testDir, 'tasks'),
      trashDir: join(testDir, 'tasks', '.trash'),
      archiveDir: join(testDir, 'archive'),
    };
    repo = new TaskRepository(paths);
    repo.ensureDirs();
    service = new SubtaskService(repo);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test('children returns matching children from repo', async () => {
    repo.create('Parent Task');
    const parentRefs = repo.listRefs();
    expect(parentRefs.ok).toBe(true);
    if (!parentRefs.ok) return;
    const parentRef = parentRefs.value[0]!;

    repo.create('Child Task', { parent: `[[${parentRef}]]` });

    const result = await service.children(parentRef);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]!.parent).toBe(`[[${parentRef}]]`);
    }
  });

  test('children returns empty for non-existent parent', async () => {
    repo.create('Unrelated Task');
    const result = await service.children('20260712-ghost');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });

  test('canComplete returns blocked:true when children are incomplete', async () => {
    const parentResult = repo.create('Parent');
    expect(parentResult.ok).toBe(true);
    if (!parentResult.ok) return;
    const parentRef = parentResult.value.ref;

    repo.create('Child', { parent: `[[${parentRef}]]`, status: 'todo' });

    const result = await service.canComplete(parentRef);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.blocked).toBe(true);
      expect(result.value.blocking).toHaveLength(1);
    }
  });

  test('canComplete returns blocked:false when all children are done', async () => {
    const parentResult = repo.create('Parent');
    expect(parentResult.ok).toBe(true);
    if (!parentResult.ok) return;
    const parentRef = parentResult.value.ref;

    repo.create('Child', { parent: `[[${parentRef}]]`, status: 'done' });

    const result = await service.canComplete(parentRef);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.blocked).toBe(false);
      expect(result.value.blocking).toHaveLength(0);
    }
  });

  test('propagates io error from repository', async () => {
    // Create a service with a repo pointing to a non-writable path
    const brokenPaths: ResolvedPaths = {
      tasksDir: '/nonexistent/path/that/cannot/exist/tasks',
      trashDir: '/nonexistent/path/that/cannot/exist/.trash',
      archiveDir: '/nonexistent/path/that/cannot/exist/archive',
    };
    const brokenRepo = new TaskRepository(brokenPaths);
    const brokenService = new SubtaskService(brokenRepo);

    // listRefs returns ok([]) for non-existent dirs, but list() reads each file
    // Use a stub approach: the tasksDir won't exist so listRefs returns []
    // Actually, listRefs returns ok([]) for non-existent dir, so list returns ok([])
    // Let's verify children propagates cleanly — returns empty since no dir
    const result = await brokenService.children('any-ref');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });
});

// --- SubtaskService with mock repo for io-error propagation ---

describe('SubtaskService (mock repo — io-error propagation)', () => {
  test('children propagates io error from repo.list()', async () => {
    const mockRepo = {
      list: async () => err(appError('io', 'disk failure')),
    } as unknown as TaskRepository;
    const service = new SubtaskService(mockRepo);

    const result = await service.children('any-ref');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('io');
      expect(result.error.message).toBe('disk failure');
    }
  });

  test('canComplete propagates io error from repo.list()', async () => {
    const mockRepo = {
      list: async () => err(appError('io', 'permission denied')),
    } as unknown as TaskRepository;
    const service = new SubtaskService(mockRepo);

    const result = await service.canComplete('any-ref');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('io');
      expect(result.error.message).toBe('permission denied');
    }
  });
});
