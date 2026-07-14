/**
 * TaskService integration tests.
 * Uses real TaskRepository over a temp directory (same pattern as
 * repository.test.ts and delete-archive.test.ts).
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { TaskRepository } from './repository.js';
import { TaskService } from './task-service.js';
import type { ResolvedPaths } from './config.js';

describe('TaskService', () => {
  let testDir: string;
  let paths: ResolvedPaths;
  let repo: TaskRepository;
  let svc: TaskService;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `marktask-svc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

  // --- addTask ---

  describe('addTask', () => {
    test('creates a task with correct defaults', async () => {
      const result = await svc.addTask({ title: 'Buy milk' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.title).toContain('milk');
      expect(result.value.status).toBe('todo');
      expect(result.value.type).toBe('task');
      expect(result.value.priority).toBe('medium');
    });

    test('sets type=recurrence when repeat is specified (R11)', async () => {
      const result = await svc.addTask({ title: 'Standup', repeat: 'daily' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.type).toBe('recurrence');
      expect(result.value.repeat).toBe('daily');
    });

    test('passes overrides through', async () => {
      const result = await svc.addTask({
        title: 'Important',
        due: '2026-12-31',
        priority: 'high',
        tags: ['work', 'urgent'],
        project: 'alpha',
        parent: '[[20260701-parent]]',
        body: 'Details here.',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.due).toBe('2026-12-31');
      expect(result.value.priority).toBe('high');
      expect(result.value.tags).toEqual(['work', 'urgent']);
      expect(result.value.project).toBe('alpha');
      expect(result.value.parent).toBe('[[20260701-parent]]');
      expect(result.value.body).toBe('Details here.');
    });
  });

  // --- list / search ---

  describe('list & search', () => {
    test('list returns all tasks', async () => {
      await svc.addTask({ title: 'Task A' });
      await svc.addTask({ title: 'Task B' });
      const result = await svc.list();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.length).toBe(2);
    });

    test('list filters by status', async () => {
      await svc.addTask({ title: 'Open' });
      const addResult = await svc.addTask({ title: 'Done' });
      if (addResult.ok) {
        await svc.changeState(addResult.value.ref, 'done');
      }
      const result = await svc.list({ status: ['done'] });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.length).toBe(1);
      expect(result.value[0]!.status).toBe('done');
    });

    test('search matches title', async () => {
      await svc.addTask({ title: 'Buy milk' });
      await svc.addTask({ title: 'Walk dog' });
      const result = await svc.search('milk');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.length).toBe(1);
    });
  });

  // --- getByRef ---

  describe('getByRef', () => {
    test('returns task by exact ref', async () => {
      const addResult = await svc.addTask({ title: 'Exact Ref' });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;

      const result = await svc.getByRef(addResult.value.ref);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.ref).toBe(addResult.value.ref);
    });

    test('returns not-found for missing ref', async () => {
      const result = await svc.getByRef('nonexistent');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe('not-found');
    });

    test('returns ambiguous for multiple matches', async () => {
      await svc.addTask({ title: 'Buy milk' });
      await svc.addTask({ title: 'Buy bread' });
      const result = await svc.getByRef('Buy');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe('ambiguous');
      expect(result.error.candidates!.length).toBe(2);
    });
  });

  // --- updateTask ---

  describe('updateTask', () => {
    test('updates due and priority', async () => {
      const addResult = await svc.addTask({ title: 'Updatable' });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;

      const result = await svc.updateTask(addResult.value.ref, {
        due: '2027-01-01',
        priority: 'high',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.due).toBe('2027-01-01');
      expect(result.value.priority).toBe('high');
    });

    test('R11: adding repeat changes type to recurrence', async () => {
      const addResult = await svc.addTask({ title: 'Plain' });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;
      expect(addResult.value.type).toBe('task');

      const result = await svc.updateTask(addResult.value.ref, { repeat: 'weekly' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.type).toBe('recurrence');
      expect(result.value.repeat).toBe('weekly');
    });

    test('R11: removing repeat changes type back to task', async () => {
      const addResult = await svc.addTask({ title: 'Recurring', repeat: 'daily' });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;
      expect(addResult.value.type).toBe('recurrence');

      const result = await svc.updateTask(addResult.value.ref, { repeat: null });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.type).toBe('task');
      expect(result.value.repeat).toBeUndefined();
    });

    test('clears due with null', async () => {
      const addResult = await svc.addTask({ title: 'Due Clear', due: '2026-12-01' });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;

      const result = await svc.updateTask(addResult.value.ref, { due: null });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.due).toBeUndefined();
    });
  });

  // --- changeState ---

  describe('changeState', () => {
    test('transitions task to new status', async () => {
      const addResult = await svc.addTask({ title: 'Stateful' });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;

      const result = await svc.changeState(addResult.value.ref, 'in-progress');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.status).toBe('in-progress');
    });

    test('persists the change', async () => {
      const addResult = await svc.addTask({ title: 'Persist State' });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;

      await svc.changeState(addResult.value.ref, 'waiting');
      const readResult = await svc.getByRef(addResult.value.ref);
      expect(readResult.ok).toBe(true);
      if (!readResult.ok) return;
      expect(readResult.value.status).toBe('waiting');
    });
  });

  // --- completeTask ---

  describe('completeTask', () => {
    test('completes a simple task', async () => {
      const addResult = await svc.addTask({ title: 'Simple' });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;

      const result = await svc.completeTask(addResult.value.ref);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.kind).toBe('completed');
      if (result.value.kind !== 'completed') return;
      expect(result.value.task.status).toBe('done');
    });

    test('persists completed task', async () => {
      const addResult = await svc.addTask({ title: 'Persist Complete' });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;

      await svc.completeTask(addResult.value.ref);
      const readResult = await svc.getByRef(addResult.value.ref);
      expect(readResult.ok).toBe(true);
      if (!readResult.ok) return;
      expect(readResult.value.status).toBe('done');
    });

    test('recurs a recurring task', async () => {
      const addResult = await svc.addTask({
        title: 'Recurring',
        repeat: 'every 1 week',
        due: '2026-07-14',
      });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;

      const result = await svc.completeTask(addResult.value.ref);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.kind).toBe('recurred');
      if (result.value.kind !== 'recurred') return;
      expect(result.value.task.status).toBe('todo');
      expect(result.value.nextDue).toBeDefined();
    });

    test('recurrence-ended when xN exhausted', async () => {
      const addResult = await svc.addTask({
        title: 'Last Time',
        repeat: 'every 1 week x1',
        due: '2026-07-14',
      });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;

      const result = await svc.completeTask(addResult.value.ref);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.kind).toBe('recurrence-ended');
    });

    test('guard-blocked when subtasks are open', async () => {
      const parentResult = await svc.addTask({ title: 'Parent' });
      expect(parentResult.ok).toBe(true);
      if (!parentResult.ok) return;

      await svc.addTask({
        title: 'Child',
        parent: `[[${parentResult.value.ref}]]`,
      });

      const result = await svc.completeTask(parentResult.value.ref);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.kind).toBe('guard-blocked');
    });

    test('guard-blocked does NOT persist', async () => {
      const parentResult = await svc.addTask({ title: 'Parent NoPersist' });
      expect(parentResult.ok).toBe(true);
      if (!parentResult.ok) return;

      await svc.addTask({
        title: 'Child NoPersist',
        parent: `[[${parentResult.value.ref}]]`,
      });

      await svc.completeTask(parentResult.value.ref);

      const readResult = await svc.getByRef(parentResult.value.ref);
      expect(readResult.ok).toBe(true);
      if (!readResult.ok) return;
      expect(readResult.value.status).toBe('todo'); // unchanged
    });

    test('force bypasses subtask guard', async () => {
      const parentResult = await svc.addTask({ title: 'Force Parent' });
      expect(parentResult.ok).toBe(true);
      if (!parentResult.ok) return;

      await svc.addTask({
        title: 'Force Child',
        parent: `[[${parentResult.value.ref}]]`,
      });

      const result = await svc.completeTask(parentResult.value.ref, { force: true });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.kind).toBe('completed');
    });
  });

  // --- softDelete / archive ---

  describe('softDelete', () => {
    test('moves task to trash', async () => {
      const addResult = await svc.addTask({ title: 'Deletable' });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;

      const result = svc.softDelete(addResult.value.ref);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.ref).toBe(addResult.value.ref);
      expect(result.value.restoreHint).toBeTruthy();
    });
  });

  describe('archive', () => {
    test('moves task to archive', async () => {
      const addResult = await svc.addTask({ title: 'Archivable' });
      expect(addResult.ok).toBe(true);
      if (!addResult.ok) return;

      const result = svc.archive(addResult.value.ref);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.ref).toBe(addResult.value.ref);
    });
  });

  // --- getConfig / setConfig ---

  describe('config', () => {
    test('getConfig returns default when no config file', () => {
      const result = svc.getConfig();
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.tasksDir).toBe('./tasks');
    });

    test('setConfig writes and returns updated config', () => {
      // Use a temp XDG dir to avoid writing to real config
      const origXdg = process.env['XDG_CONFIG_HOME'];
      const tmpXdg = join(testDir, 'xdg-config');
      mkdirSync(tmpXdg, { recursive: true });
      process.env['XDG_CONFIG_HOME'] = tmpXdg;

      try {
        const result = svc.setConfig('tasksDir', './my-tasks');
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.tasksDir).toBe('./my-tasks');

        // Verify persistence
        const getResult = svc.getConfig();
        expect(getResult.ok).toBe(true);
        if (!getResult.ok) return;
        expect(getResult.value.tasksDir).toBe('./my-tasks');
      } finally {
        if (origXdg !== undefined) {
          process.env['XDG_CONFIG_HOME'] = origXdg;
        } else {
          delete process.env['XDG_CONFIG_HOME'];
        }
      }
    });

    test('setConfig rejects invalid keys', () => {
      const result = svc.setConfig('bogusKey', 'value');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe('config');
    });
  });
});
