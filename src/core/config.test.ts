import { describe, test, expect } from 'bun:test';
import { resolvePaths } from './config.js';
import { DEFAULT_CONFIG } from './types.js';

describe('resolvePaths', () => {
  test('resolves relative paths against base directory', () => {
    const resolved = resolvePaths(DEFAULT_CONFIG, '/home/user/vault');
    expect(resolved.tasksDir).toBe('/home/user/vault/tasks');
    expect(resolved.trashDir).toBe('/home/user/vault/tasks/.trash');
    expect(resolved.archiveDir).toBe('/home/user/vault/archive');
  });

  test('preserves absolute paths unchanged', () => {
    const config = {
      tasksDir: '/absolute/tasks',
      trashDir: '/absolute/trash',
      archiveDir: '/absolute/archive',
    };
    const resolved = resolvePaths(config, '/home/user/vault');
    expect(resolved.tasksDir).toBe('/absolute/tasks');
    expect(resolved.trashDir).toBe('/absolute/trash');
    expect(resolved.archiveDir).toBe('/absolute/archive');
  });

  test('handles mixed relative and absolute paths', () => {
    const config = {
      tasksDir: './my-tasks',
      trashDir: '/global/trash',
      archiveDir: 'archive',
    };
    const resolved = resolvePaths(config, '/projects/vault');
    expect(resolved.tasksDir).toBe('/projects/vault/my-tasks');
    expect(resolved.trashDir).toBe('/global/trash');
    expect(resolved.archiveDir).toBe('/projects/vault/archive');
  });
});
