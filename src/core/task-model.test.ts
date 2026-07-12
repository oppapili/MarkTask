import { describe, test, expect } from 'bun:test';
import { validate, assertValidStatus } from './task-model.js';
import type { Task } from './types.js';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    ref: '20260712-test',
    title: 'test',
    body: '',
    tags: [],
    created: '2026-07-12T10:00:00Z',
    updated: '2026-07-12T10:00:00Z',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    raw: {},
    ...overrides,
  };
}

describe('validate', () => {
  test('valid task has no errors (happy path)', () => {
    const errors = validate(makeTask());
    expect(errors).toEqual([]);
  });

  test('R1: invalid type produces error', () => {
    const errors = validate(makeTask({ type: 'invalid' as never }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.field).toBe('type');
  });

  test('R2: invalid status produces error', () => {
    const errors = validate(makeTask({ status: 'unknown' as never }));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]!.field).toBe('status');
  });

  test('R3: invalid priority produces error', () => {
    const errors = validate(makeTask({ priority: 'critical' as never }));
    const prioErr = errors.find((e) => e.field === 'priority');
    expect(prioErr).toBeDefined();
  });

  test('R4: invalid due date format produces error', () => {
    const errors = validate(makeTask({ due: '2026/07/12' }));
    const dueErr = errors.find((e) => e.field === 'due');
    expect(dueErr).toBeDefined();
  });

  test('R4: valid due date passes', () => {
    const errors = validate(makeTask({ due: '2026-07-12' }));
    expect(errors).toEqual([]);
  });

  test('R5: invalid created datetime produces error', () => {
    const errors = validate(makeTask({ created: 'not-a-date' }));
    const createdErr = errors.find((e) => e.field === 'created');
    expect(createdErr).toBeDefined();
  });

  test('R6: invalid parent (not wikilink) produces error', () => {
    const errors = validate(makeTask({ parent: 'not-a-wikilink' }));
    const parentErr = errors.find((e) => e.field === 'parent');
    expect(parentErr).toBeDefined();
  });

  test('R6: valid wikilink parent passes', () => {
    const errors = validate(makeTask({ parent: '[[20260712-parent-task]]' }));
    expect(errors).toEqual([]);
  });

  test('R7: repeat field is passed through (no validation here)', () => {
    const errors = validate(makeTask({ repeat: 'every day at midnight' }));
    expect(errors).toEqual([]);
  });

  test('multiple errors accumulate', () => {
    const errors = validate(
      makeTask({
        type: 'bad' as never,
        status: 'bad' as never,
        due: 'nope',
      }),
    );
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('assertValidStatus', () => {
  test('returns ok for valid status', () => {
    const result = assertValidStatus('in-progress');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('in-progress');
  });

  test('returns err for invalid status', () => {
    const result = assertValidStatus('archived');
    expect(result.ok).toBe(false);
  });
});
