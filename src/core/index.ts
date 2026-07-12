/**
 * Core library barrel export.
 */
export * from './types.js';
export * from './config.js';
export * from './codec.js';
export * from './task-model.js';
export {
  TaskRepository,
  slugify,
  generateFilename,
  resolveRef,
  atomicWriteSync,
  validatePathSafe,
} from './repository.js';
export { DeleteArchiveService } from './delete-archive.js';
export type { DeleteOutcome, ArchiveOutcome } from './delete-archive.js';
export {
  QueryService,
  matches,
  filterTasks,
  sortTasks,
  searchTasks,
  DEFAULT_SORT,
} from './query.js';
export type { TaskFilter, Sort } from './query.js';
