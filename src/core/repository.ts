/**
 * TaskRepository — single I/O boundary for task file operations (INV4).
 * Implements: atomic writes (INV1, NFR-1), filename generation (FR-A4),
 * slug sanitization (SEC-1), reference resolution (FR-D5),
 * list, moveToTrash, moveToArchive primitives.
 */

import { existsSync, mkdirSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { Task, Result, AppError } from './types.js';
import { ok, err, appError } from './types.js';
import { decode, encode, titleFromRef } from './codec.js';
import { validate } from './task-model.js';
import type { ResolvedPaths } from './config.js';

// --- Slug Sanitization (SEC-1) ---

/**
 * Characters forbidden on common OSes plus path-traversal sequences.
 * Keeps Japanese/UTF-8 characters intact (R9).
 */
const OS_FORBIDDEN_RE = /[/\\:*?"<>|\x00-\x1f]/g;

/**
 * Sanitize a title into a safe filename slug.
 * - Strips OS-forbidden characters and control chars
 * - Rejects path traversal (.. and absolute paths)
 * - Trims, collapses consecutive hyphens
 * - Keeps Japanese/Unicode characters (UTF-8, R9)
 * - Falls back to 'untitled' if result is empty
 */
export function slugify(title: string): string {
  let slug = title
    .trim()
    .replace(OS_FORBIDDEN_RE, '')
    .replace(/\.\./g, '') // strip path-traversal sequences
    .replace(/\s+/g, '-') // whitespace → hyphens
    .replace(/-{2,}/g, '-') // collapse consecutive hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens

  if (slug.length === 0) {
    slug = 'untitled';
  }
  return slug;
}

/**
 * Validate that a ref/path does not attempt path traversal (SEC-1).
 * Returns an AppError if the path is unsafe.
 */
export function validatePathSafe(
  ref: string,
  allowedDir: string,
): Result<string, AppError> {
  // Reject obvious traversal patterns
  if (ref.includes('..') || ref.startsWith('/') || ref.startsWith('\\')) {
    return err(appError('io', `Path traversal rejected: "${ref}"`));
  }

  // Check OS-forbidden chars
  if (OS_FORBIDDEN_RE.test(ref)) {
    return err(appError('io', `Invalid characters in reference: "${ref}"`));
  }

  // Resolve and confirm it stays within allowed directory
  const resolved = resolve(allowedDir, `${ref}.md`);
  const rel = relative(allowedDir, resolved);
  if (rel.startsWith('..') || resolve(rel) === resolved) {
    return err(appError('io', `Path escapes allowed directory: "${ref}"`));
  }

  return ok(resolved);
}

// --- Filename Generation ---

/**
 * Format a date as YYYYMMDD.
 */
function formatDatePrefix(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Generate a unique filename (ref) for a new task.
 * Pattern: <YYYYMMDD>-<slug>
 * On collision: <YYYYMMDD>-<slug>-2, -3, etc. (FR-A4, R10)
 */
export function generateFilename(
  title: string,
  createdDate: Date,
  existingRefs: Set<string>,
): string {
  const slug = slugify(title);
  const datePrefix = formatDatePrefix(createdDate);
  const base = `${datePrefix}-${slug}`;

  if (!existingRefs.has(base)) {
    return base;
  }

  let n = 2;
  while (existingRefs.has(`${base}-${n}`)) {
    n++;
  }
  return `${base}-${n}`;
}

// --- Atomic Write (INV1, NFR-1) ---

/**
 * Write content to a file atomically via temp→rename.
 * Creates parent directories if needed.
 */
export function atomicWriteSync(filePath: string, content: string): Result<void, AppError> {
  const dir = join(filePath, '..');
  const tmpPath = `${filePath}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;

  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(tmpPath, content, 'utf-8');
    renameSync(tmpPath, filePath);
    return ok(undefined);
  } catch (e: unknown) {
    // Cleanup temp file on failure
    try {
      if (existsSync(tmpPath)) unlinkSync(tmpPath);
    } catch {
      // ignore cleanup failure
    }
    return err(
      appError('io', `Atomic write failed for "${filePath}": ${e instanceof Error ? e.message : String(e)}`, { cause: e }),
    );
  }
}

// --- Reference Resolution (FR-D5) ---

/**
 * Resolve a user-provided reference input against all known refs.
 * Priority: exact match → partial match (contains) → not-found/ambiguous.
 */
export function resolveRef(
  input: string,
  allRefs: string[],
): Result<string, AppError> {
  // Exact match
  if (allRefs.includes(input)) {
    return ok(input);
  }

  // Partial match: ref contains input OR title derived from ref contains input
  const lowerInput = input.toLowerCase();
  const matches = allRefs.filter((r) => {
    if (r.toLowerCase().includes(lowerInput)) return true;
    const title = titleFromRef(r).toLowerCase();
    return title.includes(lowerInput);
  });

  if (matches.length === 1) {
    return ok(matches[0]!);
  }
  if (matches.length === 0) {
    return err(appError('not-found', `No task found matching "${input}"`));
  }
  return err(appError('ambiguous', `Multiple tasks match "${input}"`, { candidates: matches }));
}

// --- TaskRepository Class ---

export class TaskRepository {
  private readonly tasksDir: string;
  private readonly trashDir: string;
  private readonly archiveDir: string;

  constructor(paths: ResolvedPaths) {
    this.tasksDir = paths.tasksDir;
    this.trashDir = paths.trashDir;
    this.archiveDir = paths.archiveDir;
  }

  /** Active tasks directory path. */
  getTasksDir(): string {
    return this.tasksDir;
  }

  /** Trash directory path (soft-delete destination). */
  getTrashDir(): string {
    return this.trashDir;
  }

  /** Archive directory path. */
  getArchiveDir(): string {
    return this.archiveDir;
  }

  /**
   * Ensure required directories exist.
   */
  ensureDirs(): Result<void, AppError> {
    try {
      mkdirSync(this.tasksDir, { recursive: true });
      mkdirSync(this.trashDir, { recursive: true });
      mkdirSync(this.archiveDir, { recursive: true });
      return ok(undefined);
    } catch (e: unknown) {
      return err(
        appError('io', `Failed to create directories: ${e instanceof Error ? e.message : String(e)}`, { cause: e }),
      );
    }
  }

  /**
   * List all task refs (filename stems) in tasksDir.
   * Only .md files in the immediate directory (not recursive, .trash excluded by structure).
   */
  listRefs(): Result<string[], AppError> {
    try {
      if (!existsSync(this.tasksDir)) {
        return ok([]);
      }
      const files = readdirSync(this.tasksDir, { withFileTypes: true });
      const refs = files
        .filter((f) => f.isFile() && f.name.endsWith('.md'))
        .map((f) => f.name.replace(/\.md$/, ''));
      return refs.length >= 0 ? ok(refs) : ok([]);
    } catch (e: unknown) {
      return err(
        appError('io', `Failed to list tasks: ${e instanceof Error ? e.message : String(e)}`, { cause: e }),
      );
    }
  }

  /**
   * Read and decode a single task by ref.
   */
  async read(ref: string): Promise<Result<Task, AppError>> {
    const pathCheck = validatePathSafe(ref, this.tasksDir);
    if (!pathCheck.ok) return pathCheck;

    const filePath = join(this.tasksDir, `${ref}.md`);
    try {
      const content = await readFile(filePath, 'utf-8');
      const task = decode(content, ref);
      return ok(task);
    } catch (e: unknown) {
      if (e instanceof Error && 'code' in e && e.code === 'ENOENT') {
        return err(appError('not-found', `Task not found: "${ref}"`));
      }
      return err(
        appError('io', `Failed to read task "${ref}": ${e instanceof Error ? e.message : String(e)}`, { cause: e }),
      );
    }
  }

  /**
   * Write a task to disk atomically.
   * Validates schema before writing.
   */
  write(task: Task): Result<void, AppError> {
    const pathCheck = validatePathSafe(task.ref, this.tasksDir);
    if (!pathCheck.ok) return pathCheck;

    const errors = validate(task);
    if (errors.length > 0) {
      const msg = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
      return err(appError('io', `Validation failed: ${msg}`));
    }

    const filePath = join(this.tasksDir, `${task.ref}.md`);
    const content = encode(task);
    return atomicWriteSync(filePath, content);
  }

  /**
   * Create a new task with generated filename.
   * Returns the ref of the created task.
   */
  create(
    title: string,
    overrides?: Partial<Pick<Task, 'type' | 'status' | 'priority' | 'project' | 'due' | 'repeat' | 'parent' | 'tags' | 'body'>>,
  ): Result<Task, AppError> {
    const refsResult = this.listRefs();
    if (!refsResult.ok) return refsResult;

    const existingRefs = new Set(refsResult.value);
    const now = new Date();
    const ref = generateFilename(title, now, existingRefs);
    const isoNow = now.toISOString();

    const task: Task = {
      ref,
      title: titleFromRef(ref),
      body: overrides?.body ?? '',
      tags: overrides?.tags ?? [],
      created: isoNow,
      updated: isoNow,
      type: overrides?.type ?? 'task',
      status: overrides?.status ?? 'todo',
      priority: overrides?.priority ?? 'medium',
      project: overrides?.project,
      due: overrides?.due,
      repeat: overrides?.repeat,
      parent: overrides?.parent,
      last_done: undefined,
      raw: {},
    };

    const writeResult = this.write(task);
    if (!writeResult.ok) return writeResult;

    return ok(task);
  }

  /**
   * Move a task to the trash directory (soft delete — INV3).
   * Handles collision in trash with -N suffix.
   */
  moveToTrash(ref: string): Result<void, AppError> {
    return this.moveTask(ref, this.tasksDir, this.trashDir);
  }

  /**
   * List all active tasks (tasksDir) decoded into Task objects.
   * Fails fast on any decode/read error (construction guardrail: never silently skip).
   */
  async list(): Promise<Result<Task[], AppError>> {
    const refsResult = this.listRefs();
    if (!refsResult.ok) return refsResult;

    const tasks: Task[] = [];
    for (const ref of refsResult.value) {
      const readResult = await this.read(ref);
      if (!readResult.ok) return readResult;
      tasks.push(readResult.value);
    }
    return ok(tasks);
  }

  /**
   * List all archived tasks decoded into Task objects.
   * Returns ok([]) when archiveDir does not exist.
   * Fails fast on any decode error (construction guardrail).
   */
  async listArchived(): Promise<Result<Task[], AppError>> {
    try {
      if (!existsSync(this.archiveDir)) {
        return ok([]);
      }
      const files = readdirSync(this.archiveDir, { withFileTypes: true });
      const mdFiles = files.filter((f) => f.isFile() && f.name.endsWith('.md'));

      const tasks: Task[] = [];
      for (const file of mdFiles) {
        const filePath = join(this.archiveDir, file.name);
        const ref = file.name.replace(/\.md$/, '');
        try {
          const content = await readFile(filePath, 'utf-8');
          const task = decode(content, ref);
          tasks.push(task);
        } catch (e: unknown) {
          return err(
            appError('io', `Failed to read archived task "${ref}": ${e instanceof Error ? e.message : String(e)}`, { cause: e }),
          );
        }
      }
      return ok(tasks);
    } catch (e: unknown) {
      return err(
        appError('io', `Failed to list archived tasks: ${e instanceof Error ? e.message : String(e)}`, { cause: e }),
      );
    }
  }

  /**
   * Move a task to the archive directory.
   * Handles collision in archive with -N suffix.
   */
  moveToArchive(ref: string): Result<void, AppError> {
    return this.moveTask(ref, this.tasksDir, this.archiveDir);
  }

  /**
   * Internal move with collision-safe destination naming.
   */
  private moveTask(ref: string, srcDir: string, destDir: string): Result<void, AppError> {
    const srcCheck = validatePathSafe(ref, srcDir);
    if (!srcCheck.ok) return srcCheck;

    const srcPath = join(srcDir, `${ref}.md`);
    if (!existsSync(srcPath)) {
      return err(appError('not-found', `Task not found: "${ref}"`));
    }

    try {
      mkdirSync(destDir, { recursive: true });
    } catch (e: unknown) {
      return err(
        appError('io', `Failed to create destination directory: ${e instanceof Error ? e.message : String(e)}`, { cause: e }),
      );
    }

    // Determine destination filename with collision avoidance
    let destName = ref;
    let n = 2;
    while (existsSync(join(destDir, `${destName}.md`))) {
      destName = `${ref}-${n}`;
      n++;
    }
    const destPath = join(destDir, `${destName}.md`);

    try {
      renameSync(srcPath, destPath);
      return ok(undefined);
    } catch (e: unknown) {
      return err(
        appError('io', `Failed to move task "${ref}": ${e instanceof Error ? e.message : String(e)}`, { cause: e }),
      );
    }
  }
}
