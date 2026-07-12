import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { TaskRepository } from './repository.js';
import { DeleteArchiveService } from './delete-archive.js';
import type { ResolvedPaths } from './config.js';

describe('DeleteArchiveService', () => {
  let testDir: string;
  let paths: ResolvedPaths;
  let repo: TaskRepository;
  let service: DeleteArchiveService;

  beforeEach(() => {
    testDir = join(tmpdir(), `marktask-delarch-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    paths = {
      tasksDir: join(testDir, 'tasks'),
      trashDir: join(testDir, 'tasks', '.trash'),
      archiveDir: join(testDir, 'archive'),
    };
    repo = new TaskRepository(paths);
    repo.ensureDirs();
    service = new DeleteArchiveService(repo);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // --- softDelete ---

  test('softDelete moves task to .trash/ and excludes from list', () => {
    const createResult = repo.create('Deletable Task');
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;
    const ref = createResult.value.ref;

    const result = service.softDelete(ref);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // File removed from tasksDir
    expect(existsSync(join(paths.tasksDir, `${ref}.md`))).toBe(false);
    // File exists in trashDir
    expect(existsSync(result.value.trashPath)).toBe(true);
    // Excluded from list
    const listResult = repo.listRefs();
    expect(listResult.ok).toBe(true);
    if (listResult.ok) {
      expect(listResult.value).not.toContain(ref);
    }
  });

  test('softDelete returns restoreHint containing trash path and tasks dir', () => {
    const createResult = repo.create('Hint Task');
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;
    const ref = createResult.value.ref;

    const result = service.softDelete(ref);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.restoreHint).toContain(result.value.trashPath);
    expect(result.value.restoreHint).toContain(paths.tasksDir);
  });

  test('softDelete with collision uses suffix in trash path', () => {
    const createResult = repo.create('Collision');
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;
    const ref = createResult.value.ref;

    // Pre-place file in trash with same name
    writeFileSync(join(paths.trashDir, `${ref}.md`), 'old trash');

    const result = service.softDelete(ref);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should have collision suffix
    expect(result.value.trashPath).toContain(`${ref}-2.md`);
    expect(existsSync(result.value.trashPath)).toBe(true);
  });

  // --- archive ---

  test('archive moves task to archiveDir and does not change status', () => {
    const createResult = repo.create('Archive Me', { status: 'done' });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;
    const ref = createResult.value.ref;

    // Read original content to compare status after move
    const originalContent = readFileSync(join(paths.tasksDir, `${ref}.md`), 'utf-8');

    const result = service.archive(ref);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // File removed from tasksDir
    expect(existsSync(join(paths.tasksDir, `${ref}.md`))).toBe(false);
    // File exists in archiveDir
    expect(existsSync(result.value.archivePath)).toBe(true);
    // Status unchanged — content is the same
    const archivedContent = readFileSync(result.value.archivePath, 'utf-8');
    expect(archivedContent).toBe(originalContent);
  });

  test('archive excludes task from list', () => {
    const createResult = repo.create('Archive List');
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;
    const ref = createResult.value.ref;

    service.archive(ref);

    const listResult = repo.listRefs();
    expect(listResult.ok).toBe(true);
    if (listResult.ok) {
      expect(listResult.value).not.toContain(ref);
    }
  });

  // --- Error cases ---

  test('softDelete returns not-found for nonexistent ref', () => {
    const result = service.softDelete('nonexistent-task');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('not-found');
    }
  });

  test('archive returns ambiguous error for multiple matches', () => {
    repo.create('Buy Milk');
    repo.create('Buy Bread');

    const result = service.archive('Buy');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('ambiguous');
      expect(result.error.candidates).toBeDefined();
      expect(result.error.candidates!.length).toBe(2);
    }
  });
});
