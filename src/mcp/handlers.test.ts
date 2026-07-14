/**
 * MCP Handlers integration tests.
 * Uses real TaskService over a temp directory (same pattern as task-service.test.ts).
 * Verifies dispatchTool returns structured JSON for all 10 tools.
 * No exceptions thrown — all errors are structured objects.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { TaskRepository } from '../core/repository.js';
import { TaskService } from '../core/task-service.js';
import type { ResolvedPaths } from '../core/config.js';
import { dispatchTool, toTaskJson, toListJson, toCompleteJson, TOOL_DEFS } from './handlers.js';

describe('MCP handlers — dispatchTool', () => {
  let testDir: string;
  let paths: ResolvedPaths;
  let repo: TaskRepository;
  let svc: TaskService;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `marktask-mcp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    paths = {
      tasksDir: join(testDir, 'tasks'),
      trashDir: join(testDir, 'tasks', '.trash'),
      archiveDir: join(testDir, 'archive'),
    };
    repo = new TaskRepository(paths);
    repo.ensureDirs();
    svc = new TaskService(repo);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // --- marktask.create ---

  describe('marktask.create', () => {
    test('creates a task with title only', async () => {
      const result = await dispatchTool(svc, 'marktask.create', { title: 'Buy milk' });
      expect(result['error']).toBeUndefined();
      expect(result['ref']).toBeDefined();
      expect(result['title']).toContain('milk');
      expect(result['status']).toBe('todo');
      expect(result['type']).toBe('task');
      expect(result['priority']).toBe('medium');
    });

    test('creates a recurrence task with repeat', async () => {
      const result = await dispatchTool(svc, 'marktask.create', {
        title: 'Standup',
        repeat: 'daily',
      });
      expect(result['error']).toBeUndefined();
      expect(result['type']).toBe('recurrence');
      expect(result['repeat']).toBe('daily');
    });

    test('passes all optional fields', async () => {
      const result = await dispatchTool(svc, 'marktask.create', {
        title: 'Full task',
        due: '2026-12-31',
        priority: 'high',
        tags: ['work', 'urgent'],
        project: 'alpha',
        body: 'Details here.',
      });
      expect(result['error']).toBeUndefined();
      expect(result['due']).toBe('2026-12-31');
      expect(result['priority']).toBe('high');
      expect(result['tags']).toEqual(['work', 'urgent']);
      expect(result['project']).toBe('alpha');
      expect(result['body']).toBe('Details here.');
    });

    test('returns invalid-input when title is missing', async () => {
      const result = await dispatchTool(svc, 'marktask.create', {});
      expect(result['error']).toBe('invalid-input');
      expect(result['field']).toBe('title');
    });

    test('returns invalid-input when title is empty', async () => {
      const result = await dispatchTool(svc, 'marktask.create', { title: '   ' });
      expect(result['error']).toBe('invalid-input');
      expect(result['field']).toBe('title');
    });
  });

  // --- marktask.list ---

  describe('marktask.list', () => {
    test('lists all tasks (empty)', async () => {
      const result = await dispatchTool(svc, 'marktask.list', {});
      expect(result['error']).toBeUndefined();
      expect(result['tasks']).toEqual([]);
      expect(result['count']).toBe(0);
    });

    test('lists created tasks', async () => {
      await dispatchTool(svc, 'marktask.create', { title: 'Task A' });
      await dispatchTool(svc, 'marktask.create', { title: 'Task B' });
      const result = await dispatchTool(svc, 'marktask.list', {});
      expect(result['count']).toBe(2);
      expect(Array.isArray(result['tasks'])).toBe(true);
    });

    test('filters by status', async () => {
      await dispatchTool(svc, 'marktask.create', { title: 'Todo task' });
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Progress task' });
      await dispatchTool(svc, 'marktask.state', { ref: created['ref'] as string, status: 'in-progress' });

      const result = await dispatchTool(svc, 'marktask.list', { status: ['in-progress'] });
      expect(result['count']).toBe(1);
      const tasks = result['tasks'] as Record<string, unknown>[];
      expect(tasks[0]!['status']).toBe('in-progress');
    });

    test('filters by priority', async () => {
      await dispatchTool(svc, 'marktask.create', { title: 'Low task', priority: 'low' });
      await dispatchTool(svc, 'marktask.create', { title: 'High task', priority: 'high' });
      const result = await dispatchTool(svc, 'marktask.list', { priority: ['high'] });
      expect(result['count']).toBe(1);
    });

    test('accepts sort params', async () => {
      await dispatchTool(svc, 'marktask.create', { title: 'A task', priority: 'low' });
      await dispatchTool(svc, 'marktask.create', { title: 'B task', priority: 'high' });
      const result = await dispatchTool(svc, 'marktask.list', { sortKey: 'priority', sortDir: 'asc' });
      expect(result['count']).toBe(2);
      const tasks = result['tasks'] as Record<string, unknown>[];
      expect(tasks[0]!['priority']).toBe('high');
    });
  });

  // --- marktask.get ---

  describe('marktask.get', () => {
    test('gets a task by exact ref', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Unique task' });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.get', { ref });
      expect(result['error']).toBeUndefined();
      expect(result['ref']).toBe(ref);
    });

    test('gets a task by partial match', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Unique task' });
      const result = await dispatchTool(svc, 'marktask.get', { ref: 'unique' });
      expect(result['error']).toBeUndefined();
      expect(result['ref']).toBe(created['ref']);
    });

    test('returns not-found for non-existent ref', async () => {
      const result = await dispatchTool(svc, 'marktask.get', { ref: 'nonexistent-xyz' });
      expect(result['error']).toBe('not-found');
    });

    test('returns ambiguous when multiple match', async () => {
      await dispatchTool(svc, 'marktask.create', { title: 'Similar one' });
      await dispatchTool(svc, 'marktask.create', { title: 'Similar two' });
      const result = await dispatchTool(svc, 'marktask.get', { ref: 'similar' });
      expect(result['error']).toBe('ambiguous');
      expect(Array.isArray(result['candidates'])).toBe(true);
      expect((result['candidates'] as string[]).length).toBe(2);
    });

    test('returns invalid-input when ref is missing', async () => {
      const result = await dispatchTool(svc, 'marktask.get', {});
      expect(result['error']).toBe('invalid-input');
      expect(result['field']).toBe('ref');
    });
  });

  // --- marktask.update ---

  describe('marktask.update', () => {
    test('updates due date', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Update me' });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.update', { ref, due: '2026-12-25' });
      expect(result['error']).toBeUndefined();
      expect(result['due']).toBe('2026-12-25');
    });

    test('clears due with null', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Clear due', due: '2026-01-01' });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.update', { ref, due: null });
      expect(result['error']).toBeUndefined();
      expect(result['due']).toBeNull();
    });

    test('updates priority and tags', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Tag task' });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.update', {
        ref,
        priority: 'high',
        tags: ['new-tag'],
      });
      expect(result['error']).toBeUndefined();
      expect(result['priority']).toBe('high');
      expect(result['tags']).toEqual(['new-tag']);
    });

    test('returns not-found for non-existent ref', async () => {
      const result = await dispatchTool(svc, 'marktask.update', { ref: 'no-exist', due: '2026-01-01' });
      expect(result['error']).toBe('not-found');
    });
  });

  // --- marktask.complete ---

  describe('marktask.complete', () => {
    test('completes a simple task', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Complete me' });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.complete', { ref });
      expect(result['error']).toBeUndefined();
      expect(result['kind']).toBe('completed');
      expect(result['ref']).toBe(ref);
      expect(result['status']).toBe('done');
    });

    test('recurs a recurrence task', async () => {
      const created = await dispatchTool(svc, 'marktask.create', {
        title: 'Recurring',
        repeat: 'every 1 day',
        due: '2026-07-15',
      });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.complete', { ref });
      expect(result['error']).toBeUndefined();
      expect(result['kind']).toBe('recurred');
      expect(result['nextDue']).toBeDefined();
    });

    test('guard-blocked when child tasks are open', async () => {
      const parent = await dispatchTool(svc, 'marktask.create', { title: 'Parent task' });
      const parentRef = parent['ref'] as string;
      await dispatchTool(svc, 'marktask.create', {
        title: 'Child task',
        parent: `[[${parentRef}]]`,
      });
      const result = await dispatchTool(svc, 'marktask.complete', { ref: parentRef });
      expect(result['error']).toBeUndefined();
      expect(result['kind']).toBe('guard-blocked');
      expect(Array.isArray(result['blocking'])).toBe(true);
      expect((result['blocking'] as string[]).length).toBeGreaterThan(0);
    });

    test('force bypasses guard', async () => {
      const parent = await dispatchTool(svc, 'marktask.create', { title: 'Force parent' });
      const parentRef = parent['ref'] as string;
      await dispatchTool(svc, 'marktask.create', {
        title: 'Force child',
        parent: `[[${parentRef}]]`,
      });
      const result = await dispatchTool(svc, 'marktask.complete', { ref: parentRef, force: true });
      expect(result['error']).toBeUndefined();
      expect(result['kind']).toBe('completed');
    });

    test('invalid-repeat from a malformed recurrence on complete', async () => {
      // Create task with type=recurrence and invalid repeat string
      // addTask sets type=recurrence automatically when repeat is specified
      const created = await dispatchTool(svc, 'marktask.create', {
        title: 'Bad recur',
        repeat: 'every 0 parsecs',
      });
      const ref = created['ref'] as string;
      // Due must be set for recurrence to attempt rollForward
      await dispatchTool(svc, 'marktask.update', { ref, due: '2026-07-15' });
      const result = await dispatchTool(svc, 'marktask.complete', { ref });
      expect(result['error']).toBe('invalid-repeat');
      expect(result['reason']).toBeDefined();
    });
  });

  // --- marktask.state ---

  describe('marktask.state', () => {
    test('transitions to in-progress', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'State test' });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.state', { ref, status: 'in-progress' });
      expect(result['error']).toBeUndefined();
      expect(result['status']).toBe('in-progress');
    });

    test('transitions to waiting', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Wait test' });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.state', { ref, status: 'waiting' });
      expect(result['error']).toBeUndefined();
      expect(result['status']).toBe('waiting');
    });

    test('returns invalid-input for bad status', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Bad status' });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.state', { ref, status: 'invalid' });
      expect(result['error']).toBe('invalid-input');
      expect(result['field']).toBe('status');
    });

    test('returns invalid-input when status is missing', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'No status' });
      const result = await dispatchTool(svc, 'marktask.state', { ref: created['ref'] as string });
      expect(result['error']).toBe('invalid-input');
      expect(result['field']).toBe('status');
    });
  });

  // --- marktask.search ---

  describe('marktask.search', () => {
    test('finds tasks by title substring', async () => {
      await dispatchTool(svc, 'marktask.create', { title: 'Alpha beta gamma' });
      await dispatchTool(svc, 'marktask.create', { title: 'Delta epsilon' });
      const result = await dispatchTool(svc, 'marktask.search', { query: 'beta' });
      expect(result['error']).toBeUndefined();
      expect(result['count']).toBe(1);
    });

    test('returns empty list on no match', async () => {
      await dispatchTool(svc, 'marktask.create', { title: 'Something' });
      const result = await dispatchTool(svc, 'marktask.search', { query: 'zzzzz' });
      expect(result['count']).toBe(0);
    });

    test('returns invalid-input when query is missing', async () => {
      const result = await dispatchTool(svc, 'marktask.search', {});
      expect(result['error']).toBe('invalid-input');
      expect(result['field']).toBe('query');
    });
  });

  // --- marktask.delete ---

  describe('marktask.delete', () => {
    test('soft-deletes a task and returns trash path', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Delete me' });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.delete', { ref });
      expect(result['error']).toBeUndefined();
      expect(result['ref']).toBe(ref);
      expect(result['status']).toBe('deleted');
      expect(typeof result['trash']).toBe('string');
      expect((result['trash'] as string)).toContain('.trash');
    });

    test('task is gone after delete', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Gone task' });
      const ref = created['ref'] as string;
      await dispatchTool(svc, 'marktask.delete', { ref });
      const getResult = await dispatchTool(svc, 'marktask.get', { ref });
      expect(getResult['error']).toBe('not-found');
    });

    test('returns not-found for non-existent ref', async () => {
      const result = await dispatchTool(svc, 'marktask.delete', { ref: 'nonexistent' });
      expect(result['error']).toBe('not-found');
    });
  });

  // --- marktask.archive ---

  describe('marktask.archive', () => {
    test('archives a task and returns archive path', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Archive me' });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.archive', { ref });
      expect(result['error']).toBeUndefined();
      expect(result['ref']).toBe(ref);
      expect(result['status']).toBe('archived');
      expect(typeof result['archivePath']).toBe('string');
      expect((result['archivePath'] as string)).toContain('archive');
    });

    test('task is gone from active list after archive', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Archived task' });
      const ref = created['ref'] as string;
      await dispatchTool(svc, 'marktask.archive', { ref });
      const getResult = await dispatchTool(svc, 'marktask.get', { ref });
      expect(getResult['error']).toBe('not-found');
    });
  });

  // --- marktask.recurrence_set ---

  describe('marktask.recurrence_set', () => {
    test('sets recurrence rule on a task', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Set recur' });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.recurrence_set', { ref, repeat: 'weekly' });
      expect(result['error']).toBeUndefined();
      expect(result['type']).toBe('recurrence');
      expect(result['repeat']).toBe('weekly');
    });

    test('clears recurrence rule with null', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Clear recur', repeat: 'daily' });
      const ref = created['ref'] as string;
      expect(created['type']).toBe('recurrence');

      const result = await dispatchTool(svc, 'marktask.recurrence_set', { ref, repeat: null });
      expect(result['error']).toBeUndefined();
      expect(result['type']).toBe('task');
      expect(result['repeat']).toBeNull();
    });

    test('clears recurrence rule with undefined (absent)', async () => {
      const created = await dispatchTool(svc, 'marktask.create', { title: 'Clear recur2', repeat: 'daily' });
      const ref = created['ref'] as string;
      const result = await dispatchTool(svc, 'marktask.recurrence_set', { ref });
      expect(result['error']).toBeUndefined();
      expect(result['type']).toBe('task');
      expect(result['repeat']).toBeNull();
    });

    test('returns not-found for non-existent ref', async () => {
      const result = await dispatchTool(svc, 'marktask.recurrence_set', { ref: 'noexist', repeat: 'daily' });
      expect(result['error']).toBe('not-found');
    });
  });

  // --- Unknown tool ---

  describe('unknown tool', () => {
    test('returns error for unknown tool name', async () => {
      const result = await dispatchTool(svc, 'marktask.unknown', {});
      expect(result['error']).toBe('unknown-tool');
      expect(result['name']).toBe('marktask.unknown');
    });
  });

  // --- Null/undefined args safety ---

  describe('args edge cases', () => {
    test('handles null args gracefully', async () => {
      const result = await dispatchTool(svc, 'marktask.create', null);
      expect(result['error']).toBe('invalid-input');
    });

    test('handles undefined args gracefully', async () => {
      const result = await dispatchTool(svc, 'marktask.create', undefined);
      expect(result['error']).toBe('invalid-input');
    });
  });

  // --- TOOL_DEFS structure ---

  describe('TOOL_DEFS', () => {
    test('has exactly 10 tools', () => {
      expect(TOOL_DEFS.length).toBe(10);
    });

    test('every tool has name, description, inputSchema', () => {
      for (const tool of TOOL_DEFS) {
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema['type']).toBe('object');
      }
    });

    test('tool names follow marktask.* convention', () => {
      for (const tool of TOOL_DEFS) {
        expect(tool.name.startsWith('marktask.')).toBe(true);
      }
    });
  });

  // --- Conversion helpers ---

  describe('toTaskJson', () => {
    test('converts optional fields to null', async () => {
      const created = await svc.addTask({ title: 'Bare task' });
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const json = toTaskJson(created.value);
      expect(json['due']).toBeNull();
      expect(json['project']).toBeNull();
      expect(json['repeat']).toBeNull();
      expect(json['last_done']).toBeNull();
    });
  });

  describe('toListJson', () => {
    test('returns count and tasks array', async () => {
      const created = await svc.addTask({ title: 'List item' });
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      const json = toListJson([created.value]);
      expect(json['count']).toBe(1);
      expect(Array.isArray(json['tasks'])).toBe(true);
    });
  });

  describe('toCompleteJson', () => {
    test('converts completed outcome', () => {
      const fakeTask = { ref: 'test-ref', status: 'done' } as unknown as import('../core/types.js').Task;
      const json = toCompleteJson({ kind: 'completed', task: fakeTask });
      expect(json['kind']).toBe('completed');
      expect(json['ref']).toBe('test-ref');
      expect(json['status']).toBe('done');
    });

    test('converts guard-blocked outcome', () => {
      const blocking = [{ ref: 'child-ref' }] as unknown as import('../core/types.js').Task[];
      const json = toCompleteJson({ kind: 'guard-blocked', blocking });
      expect(json['kind']).toBe('guard-blocked');
      expect(json['blocking']).toEqual(['child-ref']);
    });
  });
});
