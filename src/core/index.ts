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
