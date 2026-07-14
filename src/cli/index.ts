#!/usr/bin/env bun
/**
 * MarkTask CLI — thin adapter over TaskService.
 * All business logic lives in src/core/; this file only wires
 * commander commands to TaskService methods and renders output.
 *
 * Exit codes: 0=success, 1=business error, 2=config/usage error.
 */

import { Command } from 'commander';
import type { Status, Priority } from '../core/types.js';
import { STATUSES } from '../core/types.js';
import { loadConfig, resolvePaths } from '../core/config.js';
import { TaskRepository } from '../core/repository.js';
import { TaskService } from '../core/task-service.js';
import type { RenderOpts } from './output.js';
import {
  renderList,
  renderTask,
  renderMessage,
  renderStateChange,
  toJsonRaw,
} from './output.js';

// --- Helpers ---

/** Build TaskService from config + cwd. Returns service or exits with code 2. */
function buildService(): TaskService | null {
  const configResult = loadConfig();
  if (!configResult.ok) {
    process.stderr.write(renderMessage(configResult.error.message, 'error') + '\n');
    return null;
  }
  const paths = resolvePaths(configResult.value, process.cwd());
  const repo = new TaskRepository(paths);
  repo.ensureDirs();
  return new TaskService(repo);
}

/** Determine whether stdout is a TTY and color is not disabled. */
function shouldColor(noColor?: boolean): boolean {
  if (noColor) return false;
  if (process.env['NO_COLOR'] !== undefined) return false;
  return process.stdout.isTTY === true;
}

/** Build RenderOpts from common CLI flags. */
function buildRenderOpts(flags: {
  relative?: boolean;
  format?: string;
  limit?: string;
  noColor?: boolean;
}): RenderOpts {
  return {
    color: shouldColor(flags.noColor),
    relative: flags.relative ?? false,
    format: (flags.format as 'table' | 'compact') ?? 'table',
    width: process.stdout.columns ?? 80,
    limit: flags.limit != null ? parseInt(flags.limit, 10) : undefined,
  };
}

/** Parse comma-separated tags string into array. */
function parseTags(tagsStr: string | undefined): string[] | undefined {
  if (!tagsStr) return undefined;
  return tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
}

// --- Main entry (testable) ---

/**
 * Run the CLI with the given argv. Returns the exit code.
 * Structured for unit-testability (no direct process.exit).
 */
export async function run(argv: string[]): Promise<number> {
  const program = new Command();
  let exitCode = 0;

  program
    .name('marktask')
    .description('Markdown-based task manager for Obsidian')
    .version('0.1.0');

  // --- add ---
  program
    .command('add')
    .description('Create a new task')
    .argument('<title>', 'Task title')
    .option('--due <date>', 'Due date (YYYY-MM-DD)')
    .option('--priority <level>', 'Priority (low/medium/high)')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--project <name>', 'Project name')
    .option('--repeat <rule>', 'Recurrence rule')
    .option('--parent <ref>', 'Parent task ref (wikilink)')
    .option('--no-color', 'Disable color output')
    .action(async (title: string, opts) => {
      const svc = buildService();
      if (!svc) { exitCode = 2; return; }

      const result = await svc.addTask({
        title,
        due: opts.due,
        priority: opts.priority as Priority | undefined,
        tags: parseTags(opts.tags),
        project: opts.project,
        repeat: opts.repeat,
        parent: opts.parent ? `[[${opts.parent}]]` : undefined,
      });

      if (!result.ok) {
        process.stderr.write(renderMessage(result.error.message, 'error') + '\n');
        exitCode = result.error.kind === 'config' ? 2 : 1;
        return;
      }
      process.stdout.write(renderMessage(`Created: ${result.value.ref}`, 'success') + '\n');
    });

  // --- list ---
  program
    .command('list')
    .description('List tasks')
    .option('--status <statuses>', 'Filter by status (comma-separated)')
    .option('--due <date>', 'Filter due on or before date')
    .option('--priority <levels>', 'Filter by priority (comma-separated)')
    .option('--tag <tags>', 'Filter by tags (comma-separated, AND)')
    .option('--project <name>', 'Filter by project')
    .option('--format <fmt>', 'Output format: table or compact', 'table')
    .option('--relative', 'Show dates as relative only')
    .option('--archived', 'Include archived tasks')
    .option('--sort <key>', 'Sort key: due/priority/created/status')
    .option('--limit <n>', 'Limit number of results')
    .option('--json', 'Output as JSON')
    .option('--no-color', 'Disable color output')
    .action(async (opts) => {
      const svc = buildService();
      if (!svc) { exitCode = 2; return; }

      const filter: Record<string, unknown> = {};
      if (opts.status) {
        filter.status = opts.status.split(',').map((s: string) => s.trim());
      }
      if (opts.due) filter.dueBefore = opts.due;
      if (opts.priority) {
        filter.priority = opts.priority.split(',').map((p: string) => p.trim());
      }
      if (opts.tag) filter.tags = parseTags(opts.tag);
      if (opts.project) filter.project = opts.project;
      if (opts.archived) filter.includeArchived = true;

      const sort = opts.sort
        ? { key: opts.sort as 'due' | 'priority' | 'created' | 'status', dir: 'asc' as const }
        : undefined;

      const result = await svc.list(
        Object.keys(filter).length > 0 ? filter as never : undefined,
        sort,
      );

      if (!result.ok) {
        process.stderr.write(renderMessage(result.error.message, 'error') + '\n');
        exitCode = 1;
        return;
      }

      if (opts.json) {
        process.stdout.write(toJsonRaw(result.value) + '\n');
        return;
      }

      const renderOpts = buildRenderOpts(opts);
      process.stdout.write(renderList(result.value, renderOpts) + '\n');
    });

  // --- show ---
  program
    .command('show')
    .description('Show task details')
    .argument('<ref>', 'Task reference')
    .option('--json', 'Output as JSON')
    .option('--relative', 'Show dates as relative only')
    .option('--no-color', 'Disable color output')
    .action(async (ref: string, opts) => {
      const svc = buildService();
      if (!svc) { exitCode = 2; return; }

      const result = await svc.getByRef(ref);
      if (!result.ok) {
        handleTaskError(result.error);
        return;
      }

      if (opts.json) {
        process.stdout.write(toJsonRaw(result.value) + '\n');
        return;
      }

      const renderOpts = buildRenderOpts(opts);
      process.stdout.write(renderTask(result.value, renderOpts) + '\n');
    });

  // --- update ---
  program
    .command('update')
    .description('Update task metadata')
    .argument('<ref>', 'Task reference')
    .option('--due <date>', 'Due date (YYYY-MM-DD, empty to clear)')
    .option('--priority <level>', 'Priority (low/medium/high)')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--project <name>', 'Project name (empty to clear)')
    .option('--repeat <rule>', 'Recurrence rule (empty to clear)')
    .option('--no-color', 'Disable color output')
    .action(async (ref: string, opts) => {
      const svc = buildService();
      if (!svc) { exitCode = 2; return; }

      const patch: Record<string, unknown> = {};
      if (opts.due !== undefined) patch.due = opts.due || null;
      if (opts.priority !== undefined) patch.priority = opts.priority;
      if (opts.tags !== undefined) patch.tags = parseTags(opts.tags) ?? [];
      if (opts.project !== undefined) patch.project = opts.project || null;
      if (opts.repeat !== undefined) patch.repeat = opts.repeat || null;

      const result = await svc.updateTask(ref, patch as never);
      if (!result.ok) {
        handleTaskError(result.error);
        return;
      }

      process.stdout.write(renderMessage(`Updated: ${result.value.ref}`, 'success') + '\n');
    });

  // --- state transition shortcuts ---
  for (const cmd of ['start', 'wait', 'cancel'] as const) {
    const targetStatus: Record<string, Status> = {
      start: 'in-progress',
      wait: 'waiting',
      cancel: 'cancelled',
    };

    program
      .command(cmd)
      .description(`Set task status to ${targetStatus[cmd]}`)
      .argument('<ref>', 'Task reference')
      .option('--no-color', 'Disable color output')
      .action(async (ref: string) => {
        const svc = buildService();
        if (!svc) { exitCode = 2; return; }

        const getResult = await svc.getByRef(ref);
        if (!getResult.ok) {
          handleTaskError(getResult.error);
          return;
        }
        const oldStatus = getResult.value.status;

        const result = await svc.changeState(ref, targetStatus[cmd]!);
        if (!result.ok) {
          handleTaskError(result.error);
          return;
        }

        process.stdout.write(
          renderStateChange(result.value.ref, oldStatus, result.value.status) + '\n',
        );
      });
  }

  // --- done (special: complete with branching) ---
  program
    .command('done')
    .description('Complete a task')
    .argument('<ref>', 'Task reference')
    .option('--force', 'Skip subtask guard')
    .option('--no-color', 'Disable color output')
    .action(async (ref: string, opts) => {
      const svc = buildService();
      if (!svc) { exitCode = 2; return; }

      const result = await svc.completeTask(ref, { force: opts.force });
      if (!result.ok) {
        handleTaskError(result.error);
        return;
      }

      const outcome = result.value;
      switch (outcome.kind) {
        case 'completed':
          process.stdout.write(
            renderMessage(`Completed: ${outcome.task.ref}`, 'success') + '\n',
          );
          break;
        case 'recurred':
          process.stdout.write(
            renderMessage(
              `Completed: ${outcome.task.ref} — next due: ${outcome.nextDue}`,
              'success',
            ) + '\n',
          );
          break;
        case 'recurrence-ended':
          process.stdout.write(
            renderMessage(
              `Completed: ${outcome.task.ref} — recurrence ended`,
              'success',
            ) + '\n',
          );
          break;
        case 'guard-blocked':
          process.stderr.write(
            renderMessage('Cannot complete: blocking subtasks exist', 'error') + '\n',
          );
          for (const blocker of outcome.blocking) {
            process.stderr.write(`  ${blocker.ref} (${blocker.status})\n`);
          }
          process.stderr.write('  Use --force to override.\n');
          exitCode = 1;
          break;
      }
    });

  // --- state (generic) ---
  program
    .command('state')
    .description('Set task to an arbitrary status')
    .argument('<ref>', 'Task reference')
    .argument('<status>', `Status value: ${STATUSES.join(', ')}`)
    .option('--no-color', 'Disable color output')
    .action(async (ref: string, status: string) => {
      if (!STATUSES.includes(status as Status)) {
        process.stderr.write(
          renderMessage(`Invalid status "${status}". Must be: ${STATUSES.join(', ')}`, 'error') + '\n',
        );
        exitCode = 2;
        return;
      }

      const svc = buildService();
      if (!svc) { exitCode = 2; return; }

      const getResult = await svc.getByRef(ref);
      if (!getResult.ok) {
        handleTaskError(getResult.error);
        return;
      }
      const oldStatus = getResult.value.status;

      const result = await svc.changeState(ref, status as Status);
      if (!result.ok) {
        handleTaskError(result.error);
        return;
      }

      process.stdout.write(
        renderStateChange(result.value.ref, oldStatus, result.value.status) + '\n',
      );
    });

  // --- search ---
  program
    .command('search')
    .description('Search tasks by text')
    .argument('<query>', 'Search query')
    .option('--json', 'Output as JSON')
    .option('--relative', 'Show dates as relative only')
    .option('--format <fmt>', 'Output format: table or compact', 'table')
    .option('--no-color', 'Disable color output')
    .action(async (query: string, opts) => {
      const svc = buildService();
      if (!svc) { exitCode = 2; return; }

      const result = await svc.search(query);
      if (!result.ok) {
        process.stderr.write(renderMessage(result.error.message, 'error') + '\n');
        exitCode = 1;
        return;
      }

      if (opts.json) {
        process.stdout.write(toJsonRaw(result.value) + '\n');
        return;
      }

      const renderOpts = buildRenderOpts(opts);
      process.stdout.write(renderList(result.value, renderOpts) + '\n');
    });

  // --- delete ---
  program
    .command('delete')
    .description('Soft-delete a task (move to .trash/)')
    .argument('<ref>', 'Task reference')
    .option('--no-color', 'Disable color output')
    .action(async (ref: string) => {
      const svc = buildService();
      if (!svc) { exitCode = 2; return; }

      const result = svc.softDelete(ref);
      if (!result.ok) {
        handleTaskError(result.error);
        return;
      }

      process.stdout.write(
        renderMessage(`Deleted: ${result.value.ref}`, 'success') + '\n',
      );
      process.stdout.write(`  Restore: ${result.value.restoreHint}\n`);
    });

  // --- archive ---
  program
    .command('archive')
    .description('Archive a task')
    .argument('<ref>', 'Task reference')
    .option('--no-color', 'Disable color output')
    .action(async (ref: string) => {
      const svc = buildService();
      if (!svc) { exitCode = 2; return; }

      const result = svc.archive(ref);
      if (!result.ok) {
        handleTaskError(result.error);
        return;
      }

      process.stdout.write(
        renderMessage(`Archived: ${result.value.ref}`, 'success') + '\n',
      );
    });

  // --- config ---
  program
    .command('config')
    .description('Manage configuration')
    .option('--set <kv>', 'Set key=value')
    .option('--get <key>', 'Get a config value')
    .option('--list', 'List all config values')
    .option('--no-color', 'Disable color output')
    .action((opts) => {
      const svc = buildService();
      if (!svc) { exitCode = 2; return; }

      if (opts.set) {
        const eqIdx = opts.set.indexOf('=');
        if (eqIdx < 1) {
          process.stderr.write(
            renderMessage('Format: --set key=value', 'error') + '\n',
          );
          exitCode = 2;
          return;
        }
        const key = opts.set.slice(0, eqIdx);
        const value = opts.set.slice(eqIdx + 1);
        const result = svc.setConfig(key, value);
        if (!result.ok) {
          process.stderr.write(renderMessage(result.error.message, 'error') + '\n');
          exitCode = 2;
          return;
        }
        process.stdout.write(renderMessage(`Set ${key} = ${value}`, 'success') + '\n');
        return;
      }

      if (opts.get) {
        const result = svc.getConfig();
        if (!result.ok) {
          process.stderr.write(renderMessage(result.error.message, 'error') + '\n');
          exitCode = 2;
          return;
        }
        const config = result.value;
        const val = opts.get === 'tasksDir'
          ? config.tasksDir
          : opts.get === 'trashDir'
            ? config.trashDir
            : opts.get === 'archiveDir'
              ? config.archiveDir
              : undefined;
        if (val === undefined) {
          process.stderr.write(renderMessage(`Unknown key: ${opts.get}`, 'error') + '\n');
          exitCode = 2;
          return;
        }
        process.stdout.write(`${val}\n`);
        return;
      }

      // Default: --list
      const result = svc.getConfig();
      if (!result.ok) {
        process.stderr.write(renderMessage(result.error.message, 'error') + '\n');
        exitCode = 2;
        return;
      }
      for (const [k, v] of Object.entries(result.value)) {
        process.stdout.write(`${k} = ${v}\n`);
      }
    });

  // --- Error handler helper ---
  function handleTaskError(error: { kind: string; message: string; candidates?: string[] }): void {
    process.stderr.write(renderMessage(error.message, 'error') + '\n');
    if (error.kind === 'ambiguous' && error.candidates) {
      process.stderr.write('  Did you mean:\n');
      for (const c of error.candidates) {
        process.stderr.write(`    ${c}\n`);
      }
    }
    exitCode = error.kind === 'config' ? 2 : 1;
  }

  // Parse with error handling
  program.exitOverride();
  try {
    await program.parseAsync(argv);
  } catch (e: unknown) {
    // Commander throws on --help, --version, or unknown command
    if (e && typeof e === 'object' && 'exitCode' in e) {
      const code = (e as { exitCode: number }).exitCode;
      if (code === 0) return 0; // --help / --version
      exitCode = 2;
    }
  }

  return exitCode;
}

// --- Entry point ---
const code = await run(process.argv);
process.exit(code);
