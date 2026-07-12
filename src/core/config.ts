/**
 * ConfigManager — loads and resolves MarkTask configuration.
 * XDG path: ~/.config/marktask/config.yaml
 * Falls back to DEFAULT_CONFIG when file is absent.
 * Ref: business-logic-model.md §7, business-rules.md R13-R14
 */

import { readFileSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { parse as parseYaml } from 'yaml';
import { type Config, DEFAULT_CONFIG, type Result, ok, err, type AppError, appError } from './types.js';

/** XDG config path */
function configPath(): string {
  const xdgConfig = process.env['XDG_CONFIG_HOME'] || resolve(homedir(), '.config');
  return resolve(xdgConfig, 'marktask', 'config.yaml');
}

/**
 * Resolve relative paths against the given base directory.
 * Absolute paths remain unchanged.
 */
function resolvePath(p: string, baseDir: string): string {
  return isAbsolute(p) ? p : resolve(baseDir, p);
}

export interface ResolvedPaths {
  tasksDir: string;
  trashDir: string;
  archiveDir: string;
}

/**
 * Load configuration from XDG config file.
 * Returns DEFAULT_CONFIG if the file does not exist.
 * Returns Err(config) on parse/read errors other than ENOENT.
 */
export function loadConfig(): Result<Config, AppError> {
  const path = configPath();
  let content: string;
  try {
    content = readFileSync(path, 'utf-8');
  } catch (e: unknown) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
      return ok({ ...DEFAULT_CONFIG });
    }
    return err(appError('config', `Failed to read config: ${path}`, { cause: e }));
  }

  try {
    const data = parseYaml(content) as Record<string, unknown> | null;
    if (!data || typeof data !== 'object') {
      return ok({ ...DEFAULT_CONFIG });
    }
    const config: Config = {
      tasksDir: typeof data['tasksDir'] === 'string' ? data['tasksDir'] : DEFAULT_CONFIG.tasksDir,
      trashDir: typeof data['trashDir'] === 'string' ? data['trashDir'] : DEFAULT_CONFIG.trashDir,
      archiveDir:
        typeof data['archiveDir'] === 'string' ? data['archiveDir'] : DEFAULT_CONFIG.archiveDir,
    };
    return ok(config);
  } catch (e: unknown) {
    return err(appError('config', `Failed to parse config YAML: ${path}`, { cause: e }));
  }
}

/**
 * Resolve config paths against a base directory (typically CWD / vault root).
 */
export function resolvePaths(config: Config, baseDir: string): ResolvedPaths {
  return {
    tasksDir: resolvePath(config.tasksDir, baseDir),
    trashDir: resolvePath(config.trashDir, baseDir),
    archiveDir: resolvePath(config.archiveDir, baseDir),
  };
}
