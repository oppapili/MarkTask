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
export { transition, start, wait, cancel, setState, complete } from './state-machine.js';
export type {
  CompleteOutcome,
  RecurrenceRoller,
  SubtaskGuard,
  CompleteDeps,
} from './state-machine.js';
export {
  RecurrenceEngine,
  parse as parseRepeat,
  nextDue,
  describe as describeRepeat,
  stepOnce,
  stripCount,
  decrementCount,
} from './recurrence.js';
export type { RecurrenceRule, RecurrenceBase, RecurrenceEnd } from './recurrence.js';
export {
  SubtaskService,
  childrenOf,
  canComplete as canCompleteParent,
  asSubtaskGuard,
  parseParentRef,
  isBlockingStatus,
} from './subtasks.js';
export { TaskService } from './task-service.js';
export type { AddTaskInput, UpdateTaskPatch, CompleteOpts } from './task-service.js';
