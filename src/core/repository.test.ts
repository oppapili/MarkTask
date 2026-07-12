import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  slugify,
  generateFilename,
  resolveRef,
  atomicWriteSync,
  validatePathSafe,
  TaskRepository,
} from './repository.js';
import type { ResolvedPaths } from './config.js';

// --- slugify ---

describe('slugify', () => {
  test('converts spaces to hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  test('removes OS-forbidden characters', () => {
    expect(slugify('file:name*here')).toBe('filenamehere');
  });

  test('keeps Japanese/UTF-8 characters (R9)', () => {
    expect(slugify('買い物リスト')).toBe('買い物リスト');
  });

  test('strips path traversal sequences', () => {
    expect(slugify('../etc/passwd')).toBe('etcpasswd');
  });

  test('collapses consecutive hyphens', () => {
    expect(slugify('a   b---c')).toBe('a-b-c');
  });

  test('returns "untitled" for empty result', () => {
    expect(slugify('***')).toBe('untitled');
    expect(slugify('  ')).toBe('untitled');
  });

  test('trims leading/trailing hyphens', () => {
    expect(slugify(' -hello- ')).toBe('hello');
  });
});

// --- generateFilename ---

describe('generateFilename', () => {
  const date = new Date(2026, 6, 12); // 2026-07-12

  test('generates YYYYMMDD-slug format', () => {
    const ref = generateFilename('My Task', date, new Set());
    expect(ref).toBe('20260712-My-Task');
  });

  test('handles collision with -2 suffix (FR-A4)', () => {
    const existing = new Set(['20260712-My-Task']);
    const ref = generateFilename('My Task', date, existing);
    expect(ref).toBe('20260712-My-Task-2');
  });

  test('increments suffix on multiple collisions', () => {
    const existing = new Set(['20260712-task', '20260712-task-2', '20260712-task-3']);
    const ref = generateFilename('task', date, existing);
    expect(ref).toBe('20260712-task-4');
  });

  test('uses "untitled" for empty/symbol-only titles', () => {
    const ref = generateFilename('***', date, new Set());
    expect(ref).toBe('20260712-untitled');
  });

  test('keeps Japanese characters in slug', () => {
    const ref = generateFilename('買い物', date, new Set());
    expect(ref).toBe('20260712-買い物');
  });
});

// --- resolveRef ---

describe('resolveRef', () => {
  const allRefs = ['20260712-buy-milk', '20260712-write-report', '20260713-buy-groceries'];

  test('exact match returns immediately', () => {
    const result = resolveRef('20260712-buy-milk', allRefs);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('20260712-buy-milk');
  });

  test('partial match returns single result', () => {
    const result = resolveRef('write-report', allRefs);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('20260712-write-report');
  });

  test('ambiguous partial match returns candidates', () => {
    const result = resolveRef('buy', allRefs);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('ambiguous');
      expect(result.error.candidates).toContain('20260712-buy-milk');
      expect(result.error.candidates).toContain('20260713-buy-groceries');
    }
  });

  test('no match returns not-found', () => {
    const result = resolveRef('nonexistent', allRefs);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('not-found');
  });

  test('title-derived partial match works', () => {
    // titleFromRef('20260712-write-report') => 'write report'
    const result = resolveRef('report', allRefs);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('20260712-write-report');
  });
});

// --- validatePathSafe ---

describe('validatePathSafe (SEC-1)', () => {
  const allowedDir = '/tmp/test-tasks';

  test('rejects path traversal with ..', () => {
    const result = validatePathSafe('../etc/passwd', allowedDir);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('traversal');
  });

  test('rejects absolute paths', () => {
    const result = validatePathSafe('/etc/passwd', allowedDir);
    expect(result.ok).toBe(false);
  });

  test('accepts valid ref', () => {
    const result = validatePathSafe('20260712-valid-task', allowedDir);
    expect(result.ok).toBe(true);
  });

  test('rejects refs with OS-forbidden characters', () => {
    const result = validatePathSafe('task:name', allowedDir);
    expect(result.ok).toBe(false);
  });

  test('accepts Japanese characters in ref', () => {
    const result = validatePathSafe('20260712-買い物リスト', allowedDir);
    expect(result.ok).toBe(true);
  });
});

// --- atomicWriteSync ---

describe('atomicWriteSync (INV1)', () => {
  const testDir = join(tmpdir(), `marktask-test-${Date.now()}`);

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  test('writes file atomically', () => {
    const filePath = join(testDir, 'test.md');
    const result = atomicWriteSync(filePath, '# Hello');
    expect(result.ok).toBe(true);
    expect(readFileSync(filePath, 'utf-8')).toBe('# Hello');
  });

  test('creates parent directories if needed', () => {
    const filePath = join(testDir, 'sub', 'dir', 'test.md');
    const result = atomicWriteSync(filePath, 'content');
    expect(result.ok).toBe(true);
    expect(existsSync(filePath)).toBe(true);
  });

  test('no temp file remains on success', () => {
    const filePath = join(testDir, 'clean.md');
    atomicWriteSync(filePath, 'data');
    const files = readdirSync(testDir);
    const tempFiles = files.filter((f: string) => f.includes('.tmp-'));
    expect(tempFiles.length).toBe(0);
  });
});

// --- TaskRepository integration ---

describe('TaskRepository', () => {
  let testDir: string;
  let paths: ResolvedPaths;
  let repo: TaskRepository;

  beforeEach(() => {
    testDir = join(tmpdir(), `marktask-repo-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

  test('create writes a task file and returns task', () => {
    const result = repo.create('Test Task');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ref).toMatch(/^\d{8}-Test-Task$/);
      expect(result.value.status).toBe('todo');
      expect(existsSync(join(paths.tasksDir, `${result.value.ref}.md`))).toBe(true);
    }
  });

  test('listRefs returns created task refs', () => {
    repo.create('Task A');
    repo.create('Task B');
    const refs = repo.listRefs();
    expect(refs.ok).toBe(true);
    if (refs.ok) expect(refs.value.length).toBe(2);
  });

  test('moveToTrash moves file to trash dir', () => {
    const createResult = repo.create('Deletable');
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const ref = createResult.value.ref;
    const moveResult = repo.moveToTrash(ref);
    expect(moveResult.ok).toBe(true);
    expect(existsSync(join(paths.tasksDir, `${ref}.md`))).toBe(false);
    expect(existsSync(join(paths.trashDir, `${ref}.md`))).toBe(true);
  });

  test('moveToTrash with collision appends suffix', () => {
    const createResult = repo.create('Dup');
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const ref = createResult.value.ref;
    // Pre-place a file in trash with same name
    writeFileSync(join(paths.trashDir, `${ref}.md`), 'old');

    const moveResult = repo.moveToTrash(ref);
    expect(moveResult.ok).toBe(true);
    expect(existsSync(join(paths.trashDir, `${ref}-2.md`))).toBe(true);
  });
});
